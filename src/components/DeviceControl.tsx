import React from 'react';
import { Box, Typography, Switch, TextField, Button, Stack, IconButton } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useMQTT } from '../contexts/MQTTContext';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import BlindsClosedIcon from '@mui/icons-material/BlindsClosed';
import DoorFrontIcon from '@mui/icons-material/DoorFront';

interface DeviceControlProps {
  room: string;
  type: 'light' | 'ac' | 'curtain' | 'door';
}

const DeviceIcon = styled(IconButton)(({ theme }) => ({
  width: 60,
  height: 60,
  marginBottom: theme.spacing(2),
}));

const StyledSwitch = styled(Switch)(({ theme }) => ({
  '& .MuiSwitch-switchBase.Mui-checked': {
    color: theme.palette.primary.main,
    '&:hover': {
      backgroundColor: 'rgba(25, 118, 210, 0.08)',
    },
  },
  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
    backgroundColor: theme.palette.primary.main,
  },
}));

const StyledButton = styled(Button)(({ theme }) => ({
  minWidth: 100,
  margin: theme.spacing(1),
}));

const DeviceControl: React.FC<DeviceControlProps> = ({ room, type }) => {
  const { publishRoom, deviceStates } = useMQTT();

  const getStateTopic = () => `office/${room}/${type}/state`;
  const getSetTopic = () => `office/${room}/${type}/set`; // kept for backward compatibility (not used when room-level JSON is enabled)

  const currentState = deviceStates[getStateTopic()]?.state || 'off';

  const handleLightSwitch = (checked: boolean) => {
    publishRoom(room, { light: checked ? 'on' : 'off' });
  };

  const handleACTemperature = (temp: string) => {
    if (temp && !isNaN(Number(temp))) {
      publishRoom(room, { ac: Number(temp) });
    }
  };

  const handleCurtain = (action: 'open' | 'close') => {
    const key = type === 'door' ? 'door' : 'curtain';
    publishRoom(room, { [key]: action });
  };

  const getDeviceIcon = () => {
    switch (type) {
      case 'light':
        return <LightbulbIcon sx={{ fontSize: 40, color: currentState === 'on' ? '#fdd835' : 'text.secondary' }} />;
      case 'ac':
        return <AcUnitIcon sx={{ fontSize: 40, color: 'primary.main' }} />;
      case 'curtain':
        return <BlindsClosedIcon sx={{ fontSize: 40, color: 'primary.main' }} />;
      case 'door':
        return <DoorFrontIcon sx={{ fontSize: 40, color: currentState === 'open' ? 'primary.main' : 'text.secondary' }} />;
    }
  };

  const getDeviceLabel = () => {
    switch (type) {
      case 'light':
        return 'Lighting';
      case 'ac':
        return 'Air Conditioning';
      case 'curtain':
        return 'Window Curtains';
      case 'door':
        return 'Door Control';
    }
  };

  return (
    <Box sx={{ textAlign: 'center', p: 2 }}>
      <DeviceIcon color="primary">
        {getDeviceIcon()}
      </DeviceIcon>
      
      <Typography variant="h6" gutterBottom sx={{ color: 'text.primary', fontWeight: 500 }}>
        {getDeviceLabel()}
      </Typography>

      {type === 'light' && (
        <Box sx={{ mt: 2 }}>
          <StyledSwitch
            checked={currentState === 'on'}
            onChange={(e) => handleLightSwitch(e.target.checked)}
          />
          <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
            {currentState === 'on' ? 'ON' : 'OFF'}
          </Typography>
        </Box>
      )}

      {type === 'ac' && (
        <Stack spacing={2} sx={{ mt: 2 }}>
          <TextField
            type="number"
            label="Temperature"
            defaultValue="24"
            onChange={(e) => handleACTemperature(e.target.value)}
            variant="outlined"
            size="small"
            InputProps={{
              endAdornment: <Typography>°C</Typography>,
            }}
            sx={{ width: 150, mx: 'auto' }}
          />
        </Stack>
      )}

      {type === 'curtain' && (
        <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 2 }}>
          <StyledButton
            variant="contained"
            onClick={() => handleCurtain('open')}
            color="primary"
          >
            Open
          </StyledButton>
          <StyledButton
            variant="outlined"
            onClick={() => handleCurtain('close')}
            color="primary"
          >
            Close
          </StyledButton>
        </Stack>
      )}

      {type === 'door' && (
        <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 2 }}>
          <StyledButton
            variant="contained"
            onClick={() => handleCurtain('open')}
            color="primary"
          >
            Open
          </StyledButton>
          <StyledButton
            variant="outlined"
            onClick={() => handleCurtain('close')}
            color="primary"
          >
            Close
          </StyledButton>
        </Stack>
      )}
    </Box>
  );
};

export default DeviceControl;