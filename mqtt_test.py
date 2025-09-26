"""
Simple MQTT test tool using paho-mqtt.

Usage examples (PowerShell):

# Install dependency
python -m pip install paho-mqtt

# Start a subscriber in one terminal (listens indefinitely)
python mqtt_test.py sub --host localhost --port 1883 --username smartoffice --password smartoffice123 --topic "office/room1/#"

# Publish a single message from another terminal
python mqtt_test.py pub --host localhost --port 1883 --username smartoffice --password smartoffice123 --topic "office/room1/light/state" --message "on"

# Publish repeatedly every 2 seconds, 10 times
python mqtt_test.py pub --host localhost --port 1883 --username smartoffice --password smartoffice123 --topic "office/room1/sensor/temperature" --message "27.5" --count 10 --interval 2

The script supports QoS and clean session options.
"""

import argparse
import sys
import time
import threading
import signal
from typing import Optional

import paho.mqtt.client as mqtt


def make_client(client_id: Optional[str], host: str, port: int, username: Optional[str], password: Optional[str], keepalive: int = 60):
    client = mqtt.Client(client_id=client_id)
    if username:
        client.username_pw_set(username, password)

    # Attach basic callbacks
    def on_connect(client, userdata, flags, rc):
        if rc == 0:
            print(f"[connected] {host}:{port} (client_id={client._client_id.decode() if client._client_id else ''})")
        else:
            print(f"[connect failed] rc={rc}")

    def on_disconnect(client, userdata, rc):
        print(f"[disconnected] rc={rc}")

    client.on_connect = on_connect
    client.on_disconnect = on_disconnect
    return client


def run_subscriber(args):
    stop_event = threading.Event()

    def on_message(client, userdata, msg):
        payload = msg.payload.decode(errors='replace')
        print(f"[{msg.topic}] qos={msg.qos} payload={payload}")

    client = make_client(client_id=args.client_id, host=args.host, port=args.port, username=args.username, password=args.password)
    client.on_message = on_message

    try:
        client.connect(args.host, args.port, keepalive=60)
    except Exception as e:
        print(f"Failed to connect: {e}")
        sys.exit(1)

    # Start loop in background
    client.loop_start()

    # Subscribe
    try:
        client.subscribe(args.topic, qos=args.qos)
        print(f"Subscribed to {args.topic} (qos={args.qos}). Press Ctrl+C to exit.")

        # Wait until interrupted
        def handler(signum, frame):
            stop_event.set()

        signal.signal(signal.SIGINT, handler)
        signal.signal(signal.SIGTERM, handler)

        while not stop_event.is_set():
            time.sleep(0.1)

    finally:
        client.loop_stop()
        client.disconnect()


def run_publisher(args):
    client = make_client(client_id=args.client_id, host=args.host, port=args.port, username=args.username, password=args.password)
    try:
        client.connect(args.host, args.port, keepalive=60)
    except Exception as e:
        print(f"Failed to connect: {e}")
        sys.exit(1)

    client.loop_start()

    try:
        count = args.count if args.count is not None else 1
        interval = args.interval
        for i in range(count):
            payload = args.message
            topic = args.topic
            result = client.publish(topic, payload, qos=args.qos, retain=args.retain)
            status = result[0]
            if status == mqtt.MQTT_ERR_SUCCESS:
                print(f"Published -> topic: {topic}, payload: {payload}")
            else:
                print(f"Failed to publish (rc={status})")
            if i < count - 1:
                time.sleep(interval)
    finally:
        client.loop_stop()
        client.disconnect()


def run_device(args):
    """Simulated device: subscribes to control topic and publishes telemetry/state periodically."""
    base = args.base_topic.rstrip('/')
    # listen to both /control and /set so it responds to either convention
    control_topics = [f"{base}/+/control", f"{base}/+/set"]
    telemetry_topic = f"{base}/sensor/temperature"
    state_topic = f"{base}/light/state"

    client = make_client(client_id=args.client_id, host=args.host, port=args.port, username=args.username, password=args.password)

    current_temp = 24.0
    light_state = 'off'

    def on_connect(client, userdata, flags, rc):
        if rc == 0:
            print(f"[device connected] subscribing to control topics: {control_topics}")
            for t in control_topics:
                client.subscribe(t)
        else:
            print(f"[device connect failed] rc={rc}")

    def on_message(client, userdata, msg):
        nonlocal light_state, current_temp
        payload = msg.payload.decode(errors='replace')
        print(f"[control received] {msg.topic} -> {payload}")
        # simple parsing: if control payload 'on'/'off' change state, if numeric set temp
        if payload.lower() in ('on', 'off'):
            light_state = payload.lower()
            # respond publish to state topic
            client.publish(state_topic, light_state)
            print(f"[state published] {state_topic} = {light_state}")
        else:
            try:
                val = float(payload)
                current_temp = val
                client.publish(telemetry_topic, str(current_temp))
                print(f"[telemetry published] {telemetry_topic} = {current_temp}")
            except Exception:
                print("Unknown control payload")

    client.on_connect = on_connect
    client.on_message = on_message

    try:
        client.connect(args.host, args.port, keepalive=60)
    except Exception as e:
        print(f"Failed to connect: {e}")
        sys.exit(1)

    stop_event = threading.Event()

    def handler(signum, frame):
        stop_event.set()

    signal.signal(signal.SIGINT, handler)
    signal.signal(signal.SIGTERM, handler)

    client.loop_start()

    try:
        # publish periodic telemetry until stopped
        while not stop_event.is_set():
            # simulate temp drift
            current_temp += (0.5 - (time.time() % 1)) * 0.2
            client.publish(telemetry_topic, f"{current_temp:.2f}")
            # also publish current light state to state topic periodically
            client.publish(state_topic, light_state)
            print(f"[device telemetry] {telemetry_topic}={current_temp:.2f}, {state_topic}={light_state}")
            time.sleep(args.telemetry_interval)
    finally:
        client.loop_stop()
        client.disconnect()


def main():
    parser = argparse.ArgumentParser(description="Simple MQTT publisher/subscriber for testing")
    subparsers = parser.add_subparsers(dest='mode', required=True)

    # Subscriber
    p_sub = subparsers.add_parser('sub', help='Subscribe to a topic')
    p_sub.add_argument('--host', default='localhost', help='MQTT broker host')
    p_sub.add_argument('--port', type=int, default=1883, help='MQTT broker port')
    p_sub.add_argument('--topic', required=True, help='Topic to subscribe to (supports wildcards)')
    p_sub.add_argument('--qos', type=int, default=0, choices=[0, 1, 2], help='QoS')
    p_sub.add_argument('--username', help='Username for broker')
    p_sub.add_argument('--password', help='Password for broker')
    p_sub.add_argument('--client-id', default='mqtt-test-subscriber', help='Client id')

    # Publisher
    p_pub = subparsers.add_parser('pub', help='Publish a message')
    p_pub.add_argument('--host', default='localhost', help='MQTT broker host')
    p_pub.add_argument('--port', type=int, default=1883, help='MQTT broker port')
    p_pub.add_argument('--topic', required=True, help='Topic to publish to')
    p_pub.add_argument('--message', required=True, help='Message payload')
    p_pub.add_argument('--qos', type=int, default=0, choices=[0, 1, 2], help='QoS')
    p_pub.add_argument('--retain', action='store_true', help='Set retain flag')
    p_pub.add_argument('--count', type=int, help='Number of messages to send (default 1)')
    p_pub.add_argument('--interval', type=float, default=1.0, help='Interval between messages (seconds)')
    p_pub.add_argument('--username', help='Username for broker')
    p_pub.add_argument('--password', help='Password for broker')
    p_pub.add_argument('--client-id', default='mqtt-test-publisher', help='Client id')

    # Device simulator
    p_dev = subparsers.add_parser('device', help='Run simulated device (subscribe to control, publish telemetry)')
    p_dev.add_argument('--host', default='localhost', help='MQTT broker host')
    p_dev.add_argument('--port', type=int, default=1883, help='MQTT broker port')
    p_dev.add_argument('--base-topic', default='office/room1', help='Base topic for device (e.g. office/room1)')
    p_dev.add_argument('--telemetry-interval', type=float, default=5.0, help='Seconds between telemetry publishes')
    p_dev.add_argument('--username', help='Username for broker')
    p_dev.add_argument('--password', help='Password for broker')
    p_dev.add_argument('--client-id', default='mqtt-test-device', help='Client id')

    args = parser.parse_args()

    if args.mode == 'sub':
        run_subscriber(args)
    elif args.mode == 'pub':
        run_publisher(args)
    elif args.mode == 'device':
        run_device(args)


if __name__ == '__main__':
    main()
