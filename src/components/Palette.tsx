import React from 'react';
import { 
  Box, 
  Typography, 
  List, 
  ListItemButton, 
  ListItemText, 
  Divider, 
  Button, 
  TextField, 
  Stack, 
  Select, 
  MenuItem,
  Collapse,
  ListItemIcon
} from '@mui/material';
import { WidgetType, RoomLayout } from '../types/widgets';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface PaletteProps {
  rooms: RoomLayout[];
  currentRoomId: string | null;
  onCreateRoom: (name: string) => void;
  onSelectRoom: (roomId: string) => void;
  onAddWidget: (type: WidgetType, presetProps?: Record<string, any>) => void;
}

// Widget categories with collapsible sections
const widgetCategories = {
  sensorGauges: {
    label: '🌡️ Sensor Gauges',
    widgets: [
      { type: 'temperatureGauge', label: '🌡️ Temperature Gauge' },
      { type: 'humidityGauge', label: '💧 Humidity Gauge' },
      { type: 'co2Gauge', label: '🌫️ CO2 Gauge' },
      { type: 'tvocGauge', label: '🧪 TVOC Gauge' },
    ]
  },
  sensorCharts: {
    label: '📊 Sensor Charts',
    widgets: [
      { type: 'temperatureChart', label: '🌡️ Temperature Chart' },
      { type: 'humidityChart', label: '💧 Humidity Chart' },
      { type: 'co2Chart', label: '🌫️ CO2 Chart' },
      { type: 'tvocChart', label: '🧪 TVOC Chart' },
    ]
  },
  deviceControls: {
    label: '🔧 Device Controls',
    widgets: [
      { type: 'deviceControl', label: '💡 Light Switch', presetProps: { deviceType: 'light', room: 'room1' } },
      { type: 'deviceControl', label: '❄️ AC Control', presetProps: { deviceType: 'ac', room: 'room1' } },
      { type: 'deviceControl', label: '🚪 Door Control', presetProps: { deviceType: 'door', room: 'room1' } },
      { type: 'deviceControl', label: '🪟 Curtain Control', presetProps: { deviceType: 'curtain', room: 'room1' } },
    ]
  },
  otherWidgets: {
    label: '📋 Other Widgets',
    widgets: [
      { type: 'combinedChart', label: '📈 Combined Chart' },
      { type: 'airQualityBar', label: '🌬️ Air Quality Bar', presetProps: { label: 'Air Quality' } },
      { type: 'mqttInspector', label: '🔍 MQTT Inspector' },
    ]
  }
};

const Palette: React.FC<PaletteProps> = ({ rooms, currentRoomId, onCreateRoom, onSelectRoom, onAddWidget }) => {
  const [newRoomName, setNewRoomName] = React.useState('');
  const [openCategories, setOpenCategories] = React.useState<Record<string, boolean>>({
    sensorGauges: true,
    sensorCharts: true,
    deviceControls: true,
    otherWidgets: true,
  });

  const handleCategoryToggle = (category: string) => {
    setOpenCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  return (
    <Box sx={{ width: 300, p: 2, bgcolor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)', borderRight: 1, borderColor: 'divider', height: 'calc(100vh - 112px)', position: 'sticky', top: 112, overflowY: 'auto' }}>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>Components</Typography>
      
      <List dense>
        {Object.entries(widgetCategories).map(([categoryKey, category]) => (
          <React.Fragment key={categoryKey}>
            <ListItemButton 
              onClick={() => handleCategoryToggle(categoryKey)}
              sx={{ 
                borderRadius: 1, 
                mb: 0.5, 
                bgcolor: openCategories[categoryKey] ? 'primary.light' : 'transparent',
                color: openCategories[categoryKey] ? 'primary.contrastText' : 'text.primary',
                '&:hover': { 
                  bgcolor: openCategories[categoryKey] ? 'primary.main' : 'action.hover' 
                }
              }}
            >
              <ListItemText 
                primary={category.label} 
                primaryTypographyProps={{ fontWeight: 600, fontSize: '0.9rem' }} 
              />
              <ListItemIcon sx={{ minWidth: 'auto', color: 'inherit' }}>
                {openCategories[categoryKey] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </ListItemIcon>
            </ListItemButton>
            
            <Collapse in={openCategories[categoryKey]} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {category.widgets.map((widget, idx) => (
                  <ListItemButton 
                    key={`${widget.type}-${idx}`}
                    onClick={() => onAddWidget(widget.type as WidgetType, (widget as any).presetProps)} 
                    sx={{ 
                      pl: 4, 
                      borderRadius: 1, 
                      mb: 0.5, 
                      '&:hover': { bgcolor: 'action.hover' } 
                    }}
                  >
                    <ListItemText 
                      primary={widget.label} 
                      primaryTypographyProps={{ 
                        fontWeight: 500, 
                        fontSize: '0.85rem',
                        color: 'text.secondary'
                      }} 
                    />
                  </ListItemButton>
                ))}
              </List>
            </Collapse>
          </React.Fragment>
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


