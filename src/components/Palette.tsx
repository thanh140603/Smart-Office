import React from 'react';
import { Box, Typography, List, ListItemButton, ListItemText, Divider, Button, TextField, Stack, Select, MenuItem } from '@mui/material';
import { WidgetType, RoomLayout } from '../types/widgets';

interface PaletteProps {
  rooms: RoomLayout[];
  currentRoomId: string | null;
  onCreateRoom: (name: string) => void;
  onSelectRoom: (roomId: string) => void;
  onAddWidget: (type: WidgetType, presetProps?: Record<string, any>) => void;
}

const widgetOptions: Array<{ type: WidgetType; label: string; presetProps?: Record<string, any> }> = [
  { type: 'sensorGauge', label: 'Temperature Gauge', presetProps: { label: 'Temperature', unit: '°C', color: '#ff6b6b' } },
  { type: 'sensorChart', label: 'Temperature Chart', presetProps: { title: 'Temperature', color: '#ff6b6b', unit: '°C' } },
  { type: 'sensorChart', label: 'Light Level Chart', presetProps: { title: 'Light Level', color: '#ffc107', unit: 'lx' } },
  { type: 'sensorChart', label: 'Humidity Chart', presetProps: { title: 'Humidity', color: '#4dabf7', unit: '%' } },
  { type: 'combinedChart', label: 'Temperature & Humidity' },
  { type: 'deviceControl', label: 'Light Switch', presetProps: { deviceType: 'light', room: 'room1' } },
  { type: 'deviceControl', label: 'AC Control', presetProps: { deviceType: 'ac', room: 'room1' } },
  { type: 'deviceControl', label: 'Door Control', presetProps: { deviceType: 'door', room: 'room1' } },
  { type: 'airQualityBar', label: 'Air Quality', presetProps: { label: 'Air Quality' } },
  { type: 'mqttInspector', label: 'MQTT Inspector' },
];

const Palette: React.FC<PaletteProps> = ({ rooms, currentRoomId, onCreateRoom, onSelectRoom, onAddWidget }) => {
  const [newRoomName, setNewRoomName] = React.useState('');

  return (
    <Box sx={{ width: 300, p: 2, bgcolor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)', borderRight: 1, borderColor: 'divider', height: 'calc(100vh - 112px)', position: 'sticky', top: 112 }}>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>Components</Typography>
      <List dense>
        {widgetOptions.map((w, idx) => (
          <ListItemButton key={`${w.type}-${idx}`} onClick={() => onAddWidget(w.type, w.presetProps)} sx={{ borderRadius: 1, mb: 0.5, '&:hover': { bgcolor: 'action.hover' } }}>
            <ListItemText primary={w.label} primaryTypographyProps={{ fontWeight: 600 }} />
          </ListItemButton>
        ))}
      </List>

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 700 }}>Rooms</Typography>
      <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
        <TextField size="small" placeholder="New room name" value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} fullWidth />
        <Button variant="contained" onClick={() => { if (newRoomName.trim()) { onCreateRoom(newRoomName.trim()); setNewRoomName(''); } }}>Add</Button>
      </Stack>

      <Select size="small" value={currentRoomId || ''} onChange={(e) => onSelectRoom(String(e.target.value))} fullWidth displayEmpty>
        <MenuItem value=""><em>Select a room</em></MenuItem>
        {rooms.map(r => (
          <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
        ))}
      </Select>
    </Box>
  );
};

export default Palette;


