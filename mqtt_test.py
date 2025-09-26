#!/usr/bin/env python3
"""
MQTT test tool for publishing and subscribing to office topics.

Defaults:
- WebSocket to EMQX at ws://localhost:8083/mqtt (same as FE)
- Username: admin, Password: public

Examples:
- Listen only (WS):
    python mqtt_test.py --duration 60 --no-publish

- Publish a quick test sequence (WS, default):
    python mqtt_test.py --duration 20

- Use TCP 1883 instead of WS:
    python mqtt_test.py --tcp --port 1883
"""

import argparse
import signal
import sys
import time
from datetime import datetime
from typing import List, Tuple

import paho.mqtt.client as mqtt


def current_ts() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


class MqttTester:
    def __init__(
        self,
        host: str,
        port: int,
        username: str,
        password: str,
        use_websocket: bool = True,
        websocket_path: str = "/mqtt",
        qos: int = 0,
    ) -> None:
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.use_websocket = use_websocket
        self.websocket_path = websocket_path
        self.qos = qos

        self.client = mqtt.Client(
            client_id=f"mqtt-test-{int(time.time())}",
            clean_session=True,
            protocol=mqtt.MQTTv5,
            transport="websockets" if use_websocket else "tcp",
        )
        self.client.username_pw_set(self.username, self.password)
        if self.use_websocket:
            # Match FE path `ws://host:8083/mqtt`
            self.client.ws_set_options(path=self.websocket_path)

        # Optional, route logs to stdout for easier debugging
        # self.client.enable_logger()

        # Attach callbacks
        self.client.on_connect = self._on_connect
        self.client.on_message = self._on_message
        self.client.on_disconnect = self._on_disconnect
        self.client.on_subscribe = self._on_subscribe
        self.client.on_publish = self._on_publish

        self._is_connected = False

    # ---- MQTT callbacks ----
    def _on_connect(self, client, userdata, flags, reason_code, properties=None):
        ok = int(reason_code) == 0
        self._is_connected = ok
        status = "connected" if ok else f"failed rc={reason_code}"
        print(f"[{current_ts()}] MQTT {status} to {self.host}:{self.port} ({'WS' if self.use_websocket else 'TCP'})")
        if ok:
            # Subscribe to everything the FE cares about
            client.subscribe("office/#", qos=self.qos)

    def _on_disconnect(self, client, userdata, reason_code, properties=None):
        self._is_connected = False
        print(f"[{current_ts()}] MQTT disconnected rc={reason_code}")

    def _on_subscribe(self, client, userdata, mid, granted_qos, properties=None):
        print(f"[{current_ts()}] Subscribed (mid={mid}) granted_qos={granted_qos}")

    def _on_publish(self, client, userdata, mid):
        print(f"[{current_ts()}] Published (mid={mid})")

    def _on_message(self, client, userdata, message: mqtt.MQTTMessage):
        try:
            payload = message.payload.decode("utf-8", errors="replace")
        except Exception:
            payload = str(message.payload)
        print(f"[{current_ts()}] <- {message.topic} | {payload}")

    # ---- Operations ----
    def connect(self, keepalive: int = 60) -> None:
        self.client.connect(self.host, self.port, keepalive)
        self.client.loop_start()

    def disconnect(self) -> None:
        try:
            self.client.loop_stop()
        finally:
            try:
                self.client.disconnect()
            except Exception:
                pass

    def publish_sequence(self, delay_seconds: float = 0.5) -> None:
        """Publish a short test sequence to mirror FE actions."""
        sequence: List[Tuple[str, str]] = [
            ("office/room1/light/set", "on"),
            ("office/room1/light/set", "off"),
            ("office/room1/light/set", "on"),
            ("office/room1/light/set", "off"),
            ("office/room1/ac/set", "23"),
            ("office/room1/ac/set", "24"),
            ("office/room1/curtain/set", "open"),
            ("office/room1/curtain/set", "close"),
            ("office/room1/curtain/set", "open"),
            ("office/room1/curtain/set", "close"),
        ]
        for topic, payload in sequence:
            print(f"[{current_ts()}] -> {topic} | {payload}")
            result = self.client.publish(topic, payload=payload, qos=self.qos, retain=False)
            # Optionally wait for mid complete
            result.wait_for_publish(timeout=5)
            time.sleep(delay_seconds)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="MQTT pub/sub tester for office topics")
    transport = parser.add_mutually_exclusive_group()
    transport.add_argument("--ws", dest="ws", action="store_true", help="Use WebSocket transport (default)")
    transport.add_argument("--tcp", dest="ws", action="store_false", help="Use TCP transport")
    parser.set_defaults(ws=True)

    parser.add_argument("--host", default="localhost", help="MQTT broker host")
    parser.add_argument("--port", type=int, help="MQTT broker port (default depends on transport)")
    parser.add_argument("--username", default="admin", help="MQTT username")
    parser.add_argument("--password", default="public", help="MQTT password")
    parser.add_argument("--ws-path", default="/mqtt", help="WebSocket path (EMQX default: /mqtt)")
    parser.add_argument("--qos", type=int, default=0, choices=[0, 1, 2], help="QoS for pub/sub")
    parser.add_argument("--duration", type=int, default=20, help="Seconds to keep running before exit")
    parser.add_argument("--no-publish", action="store_true", help="Subscribe only; don't publish test sequence")

    return parser.parse_args()


def main() -> int:
    args = parse_args()
    # Default ports based on transport if not provided
    port = args.port
    if port is None:
        port = 8083 if args.ws else 1883

    tester = MqttTester(
        host=args.host,
        port=port,
        username=args.username,
        password=args.password,
        use_websocket=args.ws,
        websocket_path=args.ws_path,
        qos=args.qos,
    )

    stop = False

    def handle_sigint(signum, frame):
        nonlocal stop
        stop = True
        print(f"[{current_ts()}] Caught signal, stopping...")

    signal.signal(signal.SIGINT, handle_sigint)
    signal.signal(signal.SIGTERM, handle_sigint)

    try:
        tester.connect()
        # Give some time to connect+subscribe
        time.sleep(1.0)

        if not args.no_publish:
            tester.publish_sequence()

        # Keep process alive to receive messages
        started_at = time.time()
        while not stop and (time.time() - started_at) < args.duration:
            time.sleep(0.25)
    finally:
        tester.disconnect()
        print(f"[{current_ts()}] Done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

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
