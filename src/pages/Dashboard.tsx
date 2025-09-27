import React, { useState, useEffect } from 'react';
import {
  Grid,
  Container,
  Typography,
  Paper,
  Box,
  AppBar,
  Toolbar,
  IconButton,
  Breadcrumbs,
  Link,
  Stack,
  Tabs,
  Tab
} from '@mui/material';
import { styled } from '@mui/material/styles';
import DeviceControl from '../components/DeviceControl';
import SensorGauge from '../components/SensorGauge';
import CombinedChart from '../components/CombinedChart';
import SensorChart from '../components/SensorChart';
import MQTTInspector from '../components/MQTTInspector';
import Palette from '../components/Palette';
import Canvas from '../components/Canvas';
import SettingsPanel from '../components/SettingsPanel';
import { BaseWidget, RoomLayout, WorkspaceState, WidgetType } from '../types/widgets';
import { loadWorkspace, saveWorkspace, upsertRoom, setCurrentRoom } from '../utils/storage';
import DownloadIcon from '@mui/icons-material/Download';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

const generateDummyData = (baseValue: number, range: number, count: number) => {
  const data = [];
  let currentDate = new Date();
  for (let i = count - 1; i >= 0; i--) {
    data.push({
      timestamp: new Date(currentDate.getTime() - i * 60000),
      value: baseValue + (Math.random() - 0.5) * range,
    });
  }
  return data;
};

const rooms = [
  { id: 'room1', label: 'Room 1' },
  { id: 'room2', label: 'Room 2' },
  { id: 'meetingRoom', label: 'Meeting Room' },
  { id: 'lab', label: 'Laboratory' }
];

const StyledPaper = styled(Paper)(({ theme }) => ({
  borderRadius: theme.spacing(1),
  boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
  height: '100%',
  backgroundColor: '#ffffff',
  transition: 'box-shadow 0.2s ease-in-out',
  '&:hover': {
    boxShadow: '0 3px 6px rgba(0,0,0,0.15)',
  },
}));

const Dashboard: React.FC = () => {
  const [workspace, setWorkspace] = useState<WorkspaceState>(() => loadWorkspace());
  const [activeTab, setActiveTab] = useState<'dashboard' | 'designer'>('dashboard');
  const currentRoom: RoomLayout | undefined = workspace.rooms.find(r => r.id === workspace.currentRoomId);
  const [selectedWidget, setSelectedWidget] = useState<BaseWidget | null>(null);

  const createRoom = (name: string) => {
    const id = name.toLowerCase().replace(/\s+/g, '-');
    const room: RoomLayout = { id, name, widgets: [] };
    const next = upsertRoom(workspace, room);
    setWorkspace(setCurrentRoom(next, id));
  };

  const selectRoom = (roomId: string) => {
    setWorkspace(prev => setCurrentRoom(prev, roomId));
  };

  const updateWidgets = (widgets: BaseWidget[]) => {
    if (!currentRoom) return;
    const nextRoom: RoomLayout = { ...currentRoom, widgets };
    setWorkspace(prev => upsertRoom(prev, nextRoom));
    if (selectedWidget) {
      const updated = widgets.find(w => w.id === selectedWidget.id) || null;
      setSelectedWidget(updated);
    }
  };

  const addWidget = (type: WidgetType, presetProps?: Record<string, any>) => {
    if (!workspace.currentRoomId) return;
    const id = `${type}-${Date.now()}`;
    const base: BaseWidget = {
      id,
      type,
      x: 16,
      y: 16,
      w: type === 'combinedChart' ? 700 : type === 'sensorChart' ? 520 : type === 'airQualityBar' ? 420 : 320,
      h: type === 'mqttInspector' ? 260 : type === 'combinedChart' ? 480 : type === 'sensorChart' ? 340 : type === 'airQualityBar' ? 120 : 220,
      props: (() => {
        if (type === 'deviceControl') return { room: 'room1', deviceType: 'light' };
        if (type === 'sensorGauge') return { label: 'Temperature', unit: '°C', color: '#ff6b6b', value: 25, min: 0, max: 50 };
        if (type === 'sensorChart') return { title: 'Temperature', color: '#00bcd4', unit: '°C' };
        if (type === 'airQualityBar') return { label: 'Air Quality', value: 75, max: 500 };
        if (type === 'combinedChart') return { title: 'Temperature & Humidity' };
        return {};
      })(),
    };
    if (presetProps) {
      base.props = { ...base.props, ...presetProps };
    }
    const room = workspace.rooms.find(r => r.id === workspace.currentRoomId);
    if (!room) return;
    const nextRoom: RoomLayout = { ...room, widgets: [...room.widgets, base] };
    setWorkspace(prev => upsertRoom(prev, nextRoom));
  };

  // Simulated real-time data
  const [tempData, setTempData] = useState(generateDummyData(28, 2, 30));
  const [humidityData, setHumidityData] = useState(generateDummyData(30, 8, 30));
  const [co2Data] = useState(1899);
  const [tvocData] = useState(0.553);

  // Update data every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setTempData(prev => [...prev.slice(1), {
        timestamp: new Date(),
        value: prev[prev.length - 1].value + (Math.random() - 0.5) * 0.5,
      }]);
      setHumidityData(prev => [...prev.slice(1), {
        timestamp: new Date(),
        value: prev[prev.length - 1].value + (Math.random() - 0.5) * 2,
      }]);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box sx={{ flexGrow: 1, bgcolor: '#f5f5f5', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="fixed" elevation={0} sx={{
        background: 'linear-gradient(90deg, #1976d2 0%, #42a5f5 50%, #26c6da 100%)',
      }}>
        <Toolbar sx={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
          <Breadcrumbs 
            separator={<NavigateNextIcon fontSize="small" sx={{ color: 'rgba(255,255,255,0.85)' }} />}
            sx={{ flexGrow: 1, '& .MuiBreadcrumbs-ol li, & a, & p': { color: 'rgba(255,255,255,0.9)' } }}
          >
            <Link color="inherit" href="/" onClick={(e) => e.preventDefault()}>
              Smart Office
            </Link>
            <Typography sx={{ color: 'rgba(255,255,255,0.95)' }}>Workspace</Typography>
          </Breadcrumbs>
          <Stack direction="row" spacing={1}>
            <IconButton size="small">
              <DownloadIcon />
            </IconButton>
            <IconButton size="small">
              <FullscreenIcon />
            </IconButton>
          </Stack>
        </Toolbar>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} textColor="inherit" indicatorColor="secondary" sx={{ px: 2 }}>
          <Tab value="dashboard" label="Dashboard" />
          <Tab value="designer" label="Designer" />
        </Tabs>
      </AppBar>
      {activeTab === 'dashboard' && (
        <Container maxWidth="xl" sx={{ mt: '120px', mb: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
            Environmental Monitoring Dashboard
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} lg={7}>
              <StyledPaper>
                <CombinedChart
                  title="Temperature & Humidity"
                  datasets={[
                    { label: 'Temperature (°C)', data: tempData, color: '#ff6b6b', unit: '°C' },
                    { label: 'Humidity (%)', data: humidityData, color: '#4dabf7', unit: '%' }
                  ]}
                />
              </StyledPaper>
            </Grid>

            <Grid item xs={12} lg={2}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <StyledPaper>
                    <SensorGauge
                      value={parseFloat(tempData[tempData.length - 1].value.toFixed(1))}
                      label="Temperature"
                      unit="°C"
                      color="#ff6b6b"
                      min={15}
                      max={35}
                    />
                  </StyledPaper>
                </Grid>
                <Grid item xs={12}>
                  <StyledPaper>
                    <SensorGauge
                      value={co2Data}
                      label="CO2"
                      unit="ppm"
                      color="#7c4dff"
                      min={0}
                      max={2000}
                    />
                  </StyledPaper>
                </Grid>
              </Grid>
            </Grid>

            <Grid item xs={12} lg={3}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <StyledPaper>
                    <Box sx={{ p: 2 }}>
                      <Typography variant="h6">Air Quality</Typography>
                      <Typography variant="caption" color="text.secondary">Realtime - last 5 minutes</Typography>
                      <Box sx={{ mt: 2, height: 150 }}>
                        <SensorChart title="TVOC" data={generateDummyData(0.55, 0.1, 20)} color="#00bcd4" unit="ppm" />
                      </Box>
                    </Box>
                  </StyledPaper>
                </Grid>
                <Grid item xs={12}>
                  <StyledPaper>
                    <SensorGauge value={parseFloat(tvocData.toFixed(3))} label="TVOC" unit="ppm" color="#26a69a" min={0} max={1} />
                  </StyledPaper>
                </Grid>
                <Grid item xs={12}>
                  <StyledPaper>
                    <MQTTInspector />
                  </StyledPaper>
                </Grid>
              </Grid>
            </Grid>

            <Grid item xs={12} md={4}>
              <StyledPaper>
                <DeviceControl room={'room1'} type="light" />
              </StyledPaper>
            </Grid>
            <Grid item xs={12} md={4}>
              <StyledPaper>
                <DeviceControl room={'room1'} type="ac" />
              </StyledPaper>
            </Grid>
            <Grid item xs={12} md={4}>
              <StyledPaper>
                <DeviceControl room={'room1'} type="curtain" />
              </StyledPaper>
            </Grid>

            <Grid item xs={12} md={6}>
              <StyledPaper>
                <Box sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Air Quality
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Realtime - last 5 minutes
                  </Typography>
                  <Box sx={{ mt: 2, height: 300 }}>
                    <SensorChart
                      title="TVOC"
                      data={generateDummyData(0.55, 0.1, 10)}
                      color="#00bcd4"
                      unit="ppm"
                    />
                  </Box>
                </Box>
              </StyledPaper>
            </Grid>

            <Grid item xs={12} md={6}>
              <StyledPaper>
                <Box sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Occupancy History
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Last 30 days
                  </Typography>
                  <Box sx={{ mt: 2, height: 300 }}>
                    <SensorChart
                      title="Occupancy"
                      data={generateDummyData(70, 20, 30)}
                      color="#4caf50"
                      unit="%"
                    />
                  </Box>
                </Box>
              </StyledPaper>
            </Grid>
          </Grid>
        </Container>
      )}
      {activeTab === 'designer' && (
        <Box sx={{ display: 'flex', width: '100%', mt: '112px', flex: 1 }}>
          <Palette
            rooms={workspace.rooms}
            currentRoomId={workspace.currentRoomId}
            onCreateRoom={createRoom}
            onSelectRoom={selectRoom}
            onAddWidget={addWidget}
          />
          <Box sx={{ flex: 1, display: 'flex', minWidth: 0 }}>
            <Box sx={{ flex: 1, p: 2, minWidth: 0 }}>
              {currentRoom ? (
                <Canvas widgets={currentRoom.widgets} onChange={updateWidgets} onSelect={setSelectedWidget} />
              ) : (
                <Container maxWidth="md" sx={{ mt: 4 }}>
                  <Typography variant="h6" color="text.secondary">Create or select a room to start designing</Typography>
                </Container>
              )}
            </Box>
            <Box sx={{ width: 320, borderLeft: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
              <SettingsPanel widget={selectedWidget} onChange={(w) => {
                if (!currentRoom) return;
                const next = currentRoom.widgets.map(x => x.id === w.id ? w : x);
                updateWidgets(next);
              }} />
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default Dashboard;

// Add to the top of the file:
// import { Tabs, Tab } from '@mui/material';