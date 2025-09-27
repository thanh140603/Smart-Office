import React, { createContext, useContext, useEffect, useState } from 'react';
import mqtt, { MqttClient } from 'mqtt';

interface MQTTContextType {
  client: MqttClient | null;
  isConnected: boolean;
  publish: (topic: string, message: string) => void;
  publishRoom: (roomId: string, payload: Record<string, any>) => void;
  deviceStates: {
    [key: string]: {
      state: string;
      lastUpdate: Date;
    };
  };
  // Recent raw messages received (newest first)
  messageLog: Array<{ topic: string; payload: string; receivedAt: Date }>;
}

const MQTTContext = createContext<MQTTContextType>({
  client: null,
  isConnected: false,
  publish: () => {},
  publishRoom: () => {},
  deviceStates: {},
  messageLog: [],
});

export const MQTTProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [client, setClient] = useState<MqttClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [deviceStates, setDeviceStates] = useState<MQTTContextType['deviceStates']>({});
  const [messageLog, setMessageLog] = useState<MQTTContextType['messageLog']>([]);

  useEffect(() => {
    // Build MQTT websocket URL from the browser location so it works with http/https and on different hosts
    const pageProtocol = (typeof window !== 'undefined' && window.location && window.location.protocol) || 'http:';
    const mqttProtocol = pageProtocol === 'https:' ? 'wss' : 'ws';
    const host = (typeof window !== 'undefined' && window.location && window.location.hostname) || 'localhost';
    const port = process.env.REACT_APP_MQTT_PORT || '8083';
    const mqttUrl = `${mqttProtocol}://${host}:${port}/mqtt`;
    console.debug('MQTT connecting to', mqttUrl);

    // Local EMQX broker connection (connect over websocket)
    const mqttClient = mqtt.connect(mqttUrl, {
      username: 'admin',
      password: 'public',
      protocolVersion: 5,
    });

    // track mounted state to avoid reacting to events after cleanup (React Strict Mode can mount/unmount twice)
    let isMounted = true;

    mqttClient.on('connect', () => {
      console.log('Connected to MQTT broker');
      if (!isMounted) {
        // Component was unmounted already — ignore this event
        return;
      }
      setIsConnected(true);

      // Guard subscribe if the client is in the process of disconnecting
      // (some timing races can cause subscribe() to be called while .end() is running)
      // The mqtt library exposes a `disconnecting` flag used in the error stacktrace.
      // Only subscribe when the client is not disconnecting.
      // Also check connected flag as an extra guard.
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if ((mqttClient as any).disconnecting || !mqttClient.connected) {
        console.warn('Skipping subscribe: client is disconnecting or not connected');
        return;
      }

      // Subscribe to all office topics
      mqttClient.subscribe('office/#', (err) => {
        if (err) console.error('Subscription error:', err);
      });
    });

    mqttClient.on('message', (topic, message) => {
      const payload = message.toString();

      // Always record raw message in the log (newest first)
      setMessageLog(prev => {
        const next = [{ topic, payload, receivedAt: new Date() }, ...prev];
        return next.slice(0, 200);
      });

      // Normalize messages:
      // 1) Legacy: office/{room}/{device}/{subtopic}
      // 2) New room JSON: topic 'office/{room}' with JSON payload e.g. { light: 'on', ac: 24 }
      setDeviceStates(prev => {
        const next = { ...prev };
        try {
          const parts = topic.split('/');
          if (parts[0] === 'office' && parts.length === 2) {
            // New room JSON format
            const roomId = parts[1];
            try {
              const obj = JSON.parse(payload);
              Object.entries(obj).forEach(([key, val]) => {
                const base = `office/${roomId}/${key}`;
                next[`${base}/state`] = { state: String(val), lastUpdate: new Date() };
              });
            } catch (e) {
              // ignore parse error, store raw
              next[topic] = { state: payload, lastUpdate: new Date() };
            }
          } else if (parts.length >= 4 && parts[0] === 'office') {
            const base = parts.slice(0, 3).join('/'); // e.g. office/room1/light
            const sub = parts.slice(3).join('/'); // remainder
            if (sub === 'set' || sub === 'control') {
              next[`${base}/state`] = { state: payload, lastUpdate: new Date() };
            } else if (sub === 'state' || sub === 'status') {
              next[`${base}/state`] = { state: payload, lastUpdate: new Date() };
            } else {
              // sensor or other topic under device: keep raw topic key
              next[topic] = { state: payload, lastUpdate: new Date() };
            }
          } else {
            // Non-office topics: store raw
            next[topic] = { state: payload, lastUpdate: new Date() };
          }
        } catch (e) {
          // Fallback: store raw
          next[topic] = { state: payload, lastUpdate: new Date() };
        }
        return next;
      });
    });

    mqttClient.on('error', (err) => {
      console.error('MQTT error:', err);
      setIsConnected(false);
    });

    // Update state when connection closes so UI knows we are disconnected
    mqttClient.on('close', () => {
      console.log('MQTT connection closed');
      setIsConnected(false);
    });

    setClient(mqttClient);

    return () => {
      // mark unmounted so any late 'connect' events are ignored
      isMounted = false;
      try {
        mqttClient.end(true);
      } catch (e) {
        // ignore
      }
    };
  }, []);

  const publish = (topic: string, message: string) => {
    if (client && isConnected) {
      client.publish(topic, message);
    }
  };

  const publishRoom = (roomId: string, payload: Record<string, any>) => {
    if (!client || !isConnected) return;
    const topic = `office/${roomId}`;
    try {
      const msg = JSON.stringify(payload);
      client.publish(topic, msg);
    } catch (e) {
      console.error('Failed to stringify room payload', e);
    }
  };

  return (
    <MQTTContext.Provider value={{ client, isConnected, publish, publishRoom, deviceStates, messageLog }}>
      {children}
    </MQTTContext.Provider>
  );
};

export const useMQTT = () => useContext(MQTTContext);