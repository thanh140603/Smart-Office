import React from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { useMQTT } from '../contexts/MQTTContext';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import OpacityIcon from '@mui/icons-material/Opacity';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import DoorFrontIcon from '@mui/icons-material/DoorFront';
import { styled } from '@mui/material/styles';

interface SensorDataProps {
  room: string;
  type: 'temperature' | 'humidity' | 'motion' | 'door';
}

const SensorIcon = styled(Box)(({ theme }) => ({
  width: 50,
  height: 50,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: theme.spacing(2),
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
}));

const SensorData: React.FC<SensorDataProps> = ({ room, type }) => {
  const { deviceStates } = useMQTT();
  const topic = `office/${room}/sensor/${type}`;
  const value = deviceStates[topic]?.state || 'N/A';

  const getIcon = () => {
    switch (type) {
      case 'temperature':
        return <ThermostatIcon sx={{ fontSize: 30 }} />;
      case 'humidity':
        return <OpacityIcon sx={{ fontSize: 30 }} />;
      case 'motion':
        return <DirectionsRunIcon sx={{ fontSize: 30 }} />;
      case 'door':
        return <DoorFrontIcon sx={{ fontSize: 30 }} />;
    }
  };

  const getSensorLabel = () => {
    switch (type) {
      case 'temperature':
        return 'Temperature';
      case 'humidity':
        return 'Humidity';
      case 'motion':
        return 'Motion';
      case 'door':
        return 'Door Status';
    }
  };

  const getDisplayValue = () => {
    switch (type) {
      case 'temperature':
        return `${value}°C`;
      case 'humidity':
        return `${value}%`;
      case 'motion':
        return value === 'detected' ? 'Motion Detected' : 'No Motion';
      case 'door':
        return value.charAt(0).toUpperCase() + value.slice(1);
      default:
        return value;
    }
  };

  const getValueColor = () => {
    switch (type) {
      case 'temperature':
        return parseFloat(value) > 28 ? '#f44336' : '#4caf50';
      case 'humidity':
        return parseFloat(value) > 70 ? '#f44336' : '#4caf50';
      case 'motion':
        return value === 'detected' ? '#f44336' : '#4caf50';
      case 'door':
        return value === 'open' ? '#f44336' : '#4caf50';
      default:
        return 'text.primary';
    }
  };

  return (
    <Box sx={{ textAlign: 'center', p: 2 }}>
      <SensorIcon>
        {getIcon()}
      </SensorIcon>

      <Typography variant="subtitle1" gutterBottom sx={{ color: 'text.secondary', fontWeight: 500 }}>
        {getSensorLabel()}
      </Typography>

      <Typography variant="h4" sx={{ 
        fontWeight: 600, 
        color: getValueColor(),
        transition: 'color 0.3s ease'
      }}>
        {getDisplayValue()}
      </Typography>

      <Box sx={{ mt: 2, height: 4, bgcolor: 'grey.100', borderRadius: 2 }}>
        <Box
          sx={{
            height: '100%',
            borderRadius: 2,
            bgcolor: getValueColor(),
            width: type === 'temperature' ? `${(parseFloat(value) / 50) * 100}%` :
                   type === 'humidity' ? `${value}%` :
                   value === 'detected' || value === 'open' ? '100%' : '0%',
            transition: 'width 0.3s ease, background-color 0.3s ease',
          }}
        />
      </Box>
    </Box>
  );
};

export default SensorData;