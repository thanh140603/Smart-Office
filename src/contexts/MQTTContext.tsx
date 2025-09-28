import React, { createContext, useContext, useEffect, useState } from 'react';
import mqtt, { MqttClient } from 'mqtt';

interface MQTTContextType {
  client: MqttClient | null;
  isConnected: boolean;
  publish: (topic: string, message: string) => void;
  publishRoom: (roomId: string, payload: Record<string, any>) => void;
  publishToCurrentRoom: (payload: Record<string, any>) => void;
  currentRoomId: string | null;
  setCurrentRoomId: (roomId: string | null) => void;
  deviceStates: {
    [key: string]: {
      state: string;
      lastUpdate: Date;
    };
  };
  // Recent raw messages received (newest first)
  messageLog: Array<{ topic: string; payload: string; receivedAt: Date }>;
  // Sensor data storage for charts
  sensorData: {
    temperature: Array<{ timestamp: Date; value: number }>;
    humidity: Array<{ timestamp: Date; value: number }>;
    co2: Array<{ timestamp: Date; value: number }>;
    tvoc: Array<{ timestamp: Date; value: number }>;
  };
  // Current sensor values
  currentSensorValues: {
    temperature: number;
    humidity: number;
    co2: number;
    tvoc: number;
  };
}

const MQTTContext = createContext<MQTTContextType>({
  client: null,
  isConnected: false,
  publish: () => {},
  publishRoom: () => {},
  publishToCurrentRoom: () => {},
  currentRoomId: null,
  setCurrentRoomId: () => {},
  deviceStates: {},
  messageLog: [],
  sensorData: {
    temperature: [],
    humidity: [],
    co2: [],
    tvoc: [],
  },
  currentSensorValues: {
    temperature: 25,
    humidity: 50,
    co2: 400,
    tvoc: 0.5,
  },
});

export const MQTTProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [client, setClient] = useState<MqttClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [deviceStates, setDeviceStates] = useState<MQTTContextType['deviceStates']>({});
  const [messageLog, setMessageLog] = useState<MQTTContextType['messageLog']>([]);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [sensorData, setSensorData] = useState<MQTTContextType['sensorData']>({
    temperature: [],
    humidity: [],
    co2: [],
    tvoc: [],
  });
  const [currentSensorValues, setCurrentSensorValues] = useState<MQTTContextType['currentSensorValues']>({
    temperature: 25,
    humidity: 50,
    co2: 400,
    tvoc: 0.5,
  });

  useEffect(() => {
    // Build MQTT websocket URL from the browser location so it works with http/https and on different hosts
    const pageProtocol = (typeof window !== 'undefined' && window.location && window.location.protocol) || 'http:';
    const mqttProtocol = pageProtocol === 'https:' ? 'wss' : 'ws';
    
    // For Docker environment, use the hostname from browser (which maps to host machine)
    // For local development, use localhost
    const host = (typeof window !== 'undefined' && window.location && window.location.hostname) || 'localhost';
    const port = process.env.REACT_APP_MQTT_PORT || '8083';
    
    // Check if we're running in Docker (hostname will be different from localhost)
    const isDocker = host !== 'localhost' && host !== '127.0.0.1';
    const mqttHost = isDocker ? host : 'localhost';
    
    const mqttUrl = `${mqttProtocol}://${mqttHost}:${port}/mqtt`;
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

      // Subscribe to current room topic if room is selected
      if (currentRoomId) {
        const topic = `office/${currentRoomId}`;
        mqttClient.subscribe(topic, (err) => {
          if (err) {
            console.error('Subscription error:', err);
          } else {
            console.log(`Subscribed to topic: ${topic}`);
          }
        });
      }
    });

    mqttClient.on('message', (topic, message) => {
      const payload = message.toString();
      // Always record raw message in the log (newest first)
      setMessageLog(prev => {
        const next = [{ topic, payload, receivedAt: new Date() }, ...prev];
        return next.slice(0, 200);
      });

      // Process messages for office/{roomId} topic format
      setDeviceStates(prev => {
        const next = { ...prev };
        try {
          const parts = topic.split('/');
          if (parts[0] === 'office' && parts.length === 2) {
            // New room JSON format: office/{roomId}
            const roomId = parts[1];
            try {
              const obj = JSON.parse(payload);
              // Parse each device state from JSON
              Object.entries(obj).forEach(([deviceType, value]) => {
                // Map device types to consistent state keys
                const stateKey = `office/${roomId}/${deviceType}/state`;
                const stringValue = String(value);
                next[stateKey] = { 
                  state: stringValue, 
                  lastUpdate: new Date() 
                };
              });
              
              // Also store the raw topic for debugging
              next[topic] = { state: payload, lastUpdate: new Date() };
              
              // Update sensor data for charts
              setSensorData(prev => {
                const next = { ...prev };
                const timestamp = new Date();
                
                // Update sensor data arrays
                Object.entries(obj).forEach(([sensorType, value]) => {
                  if (['temperature', 'humidity', 'co2', 'tvoc'].includes(sensorType)) {
                    const numValue = Number(value);
                    if (!isNaN(numValue)) {
                      // Add new data point with type assertion
                      const typedSensorType = sensorType as keyof typeof next;
                      next[typedSensorType] = [
                        ...next[typedSensorType].slice(-29), // Keep last 30 points
                        { timestamp, value: numValue }
                      ];
                      
                      console.log(`📊 [SENSOR_DATA] Updated ${sensorType}: ${numValue}`);
                    }
                  }
                });
                
                return next;
              });
              
              // Update current sensor values
              setCurrentSensorValues(prev => {
                const next = { ...prev };
                
                Object.entries(obj).forEach(([sensorType, value]) => {
                  if (['temperature', 'humidity', 'co2', 'tvoc'].includes(sensorType)) {
                    const numValue = Number(value);
                    if (!isNaN(numValue)) {
                      const typedSensorType = sensorType as keyof typeof next;
                      next[typedSensorType] = numValue;
                      console.log(`🌡️ [CURRENT_SENSOR] Updated ${sensorType}: ${numValue}`);
                    }
                  }
                });
                
                return next;
              });
              
            } catch (parseError) {
              // Store raw payload if JSON parsing fails
              next[topic] = { state: payload, lastUpdate: new Date() };
            }
          } else if (parts.length >= 4 && parts[0] === 'office') {
            // Legacy format: office/{room}/{device}/{subtopic}
            const base = parts.slice(0, 3).join('/'); // e.g. office/room1/light
            const sub = parts.slice(3).join('/'); // remainder
            if (sub === 'set' || sub === 'control' || sub === 'state' || sub === 'status') {
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
          console.error('Error processing MQTT message:', e);
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

  // Handle room subscription changes
  useEffect(() => {
    if (!client || !isConnected || !currentRoomId) return;

    const topic = `office/${currentRoomId}`;
    
    // Subscribe to new room topic
    client.subscribe(topic, (err) => {
      if (err) {
        console.error('Subscription error:', err);
      } else {
        console.log(`Subscribed to topic: ${topic}`);
      }
    });

    // Cleanup function to unsubscribe when room changes
    return () => {
      if (client && isConnected) {
        client.unsubscribe(topic, (err) => {
          if (err) {
            console.error('Unsubscribe error:', err);
          } else {
            console.log(`Unsubscribed from topic: ${topic}`);
          }
        });
      }
    };
  }, [client, isConnected, currentRoomId]);

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

  const publishToCurrentRoom = (payload: Record<string, any>) => {
    if (!currentRoomId) return;
    publishRoom(currentRoomId, payload);
  };

  return (
    <MQTTContext.Provider value={{ client, isConnected, publish, publishRoom, publishToCurrentRoom, currentRoomId, setCurrentRoomId, deviceStates, messageLog, sensorData, currentSensorValues }}>
      {children}
    </MQTTContext.Provider>
  );
};

export const useMQTT = () => useContext(MQTTContext);