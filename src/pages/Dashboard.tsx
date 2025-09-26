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
  Stack
} from '@mui/material';
import { styled } from '@mui/material/styles';
import DeviceControl from '../components/DeviceControl';
import SensorGauge from '../components/SensorGauge';
import CombinedChart from '../components/CombinedChart';
import SensorChart from '../components/SensorChart';
import MQTTInspector from '../components/MQTTInspector';
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
  const [currentRoom, setCurrentRoom] = React.useState(0);

  const handleRoomChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentRoom(newValue);
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
    <Box sx={{ flexGrow: 1, bgcolor: '#f5f5f5', minHeight: '100vh' }}>
      <AppBar position="static" color="transparent" elevation={1}>
        <Toolbar sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Breadcrumbs 
            separator={<NavigateNextIcon fontSize="small" />}
            sx={{ flexGrow: 1 }}
          >
            <Link color="inherit" href="/" onClick={(e) => e.preventDefault()}>
              Smart Office
            </Link>
            <Typography color="text.primary">Room Sensors</Typography>
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
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 500 }}>
          Environmental Monitoring Dashboard
        </Typography>
          
          <Grid container spacing={3}>
            {/* Top area: big time-series on left, dual-gauge column center, right-side air-quality + small gauges */}
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

            {/* Device Controls */}
            <Grid item xs={12} md={4}>
              <StyledPaper>
                <DeviceControl room={rooms[0].id} type="light" />
              </StyledPaper>
            </Grid>
            <Grid item xs={12} md={4}>
              <StyledPaper>
                <DeviceControl room={rooms[0].id} type="ac" />
              </StyledPaper>
            </Grid>
            <Grid item xs={12} md={4}>
              <StyledPaper>
                <DeviceControl room={rooms[0].id} type="curtain" />
              </StyledPaper>
            </Grid>

            {/* Additional Charts */}
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
    </Box>
  );
};

export default Dashboard;

// Add to the top of the file:
// import { Tabs, Tab } from '@mui/material';