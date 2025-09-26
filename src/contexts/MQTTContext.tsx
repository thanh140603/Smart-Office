import React, { createContext, useContext, useEffect, useState } from 'react';
import mqtt, { MqttClient } from 'mqtt';

interface MQTTContextType {
  client: MqttClient | null;
  isConnected: boolean;
  publish: (topic: string, message: string) => void;
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
  deviceStates: {},
  messageLog: [],
});

export const MQTTProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [client, setClient] = useState<MqttClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [deviceStates, setDeviceStates] = useState<MQTTContextType['deviceStates']>({});
  const [messageLog, setMessageLog] = useState<MQTTContextType['messageLog']>([]);

  useEffect(() => {
    // Local EMQX broker connection
    const mqttClient = mqtt.connect('ws://localhost:8083/mqtt', {
      username: 'smartoffice',
      password: 'smartoffice123',
      protocolVersion: 5,
    });

    mqttClient.on('connect', () => {
      console.log('Connected to MQTT broker');
      setIsConnected(true);
      
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

      // Normalize a few common conventions so UI components can read a consistent key.
      // Convention: office/{room}/{device}/{subtopic}
      // If subtopic is 'set' or 'control' treat it as intent and mirror to '{base}/state'.
      // If subtopic is 'state' or 'status' store as '{base}/state'. Otherwise keep raw topic (sensors etc.).
      setDeviceStates(prev => {
        const next = { ...prev };
        try {
          const parts = topic.split('/');
          if (parts.length >= 4 && parts[0] === 'office') {
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

    setClient(mqttClient);

    return () => {
      mqttClient.end();
    };
  }, []);

  const publish = (topic: string, message: string) => {
    if (client && isConnected) {
      client.publish(topic, message);
    }
  };

  return (
    <MQTTContext.Provider value={{ client, isConnected, publish, deviceStates, messageLog }}>
      {children}
    </MQTTContext.Provider>
  );
};

export const useMQTT = () => useContext(MQTTContext);