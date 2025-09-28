# Smart Office IoT Dashboard

A React-based web dashboard for controlling and monitoring IoT devices in a smart office environment.

## Features

- Real-time device control (lights, AC, curtains)
- Sensor data monitoring (temperature, humidity, motion, door status)
- MQTT communication over WebSocket
- Responsive Material-UI design

## Prerequisites

- Node.js 14+ and npm
- MQTT broker with WebSocket support (e.g., EMQX, Mosquitto, HiveMQ)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure MQTT connection:
   - Open `src/contexts/MQTTContext.tsx`
   - Update the MQTT broker URL and credentials:
```typescript
const mqttClient = mqtt.connect('wss://your-broker-url', {
  username: 'your_username',
  password: 'your_password',
});
```

3. Start the development server:
```bash
npm start
```

## MQTT Topic Structure

### Control Topics (Publish)
- Lights: `office/{room}/light/set` → "on" / "off"
- AC: `office/{room}/ac/temp` → temperature value
- Curtains: `office/{room}/curtain/set` → "open" / "close"

### Status Topics (Subscribe)
- Light status: `office/{room}/light/state` → "on" / "off"
- Temperature: `office/{room}/sensor/temperature` → temperature value
- Motion: `office/{room}/sensor/motion` → "detected" / "none"
- Door status: `office/{room}/door/state` → "open" / "closed"

## Project Structure

```
src/
  ├── components/          # Reusable UI components
  │   ├── DeviceControl.tsx   # Device control cards
  │   └── SensorData.tsx      # Sensor data display cards
  ├── contexts/
  │   └── MQTTContext.tsx     # MQTT connection and state management
  ├── pages/
  │   └── Dashboard.tsx       # Main dashboard layout
  ├── App.tsx
  └── index.tsx
```

## Security Considerations

- Use WSS (WebSocket Secure) for MQTT connections
- Implement proper authentication
- Use ACLs to restrict topic access
- Keep credentials secure and use environment variables

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## Documentation

- Project report: [docs/Project_Report.md](docs/Project_Report.md)