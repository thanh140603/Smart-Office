import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useMQTT } from '../contexts/MQTTContext';

const GaugeContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  width: '200px',
  height: '200px',
  margin: '0 auto',
}));

const GaugeCircle = styled(Box)<{ color: string; progress: number }>(({ color, progress }) => ({
  position: 'relative',
  width: '100%',
  height: '100%',
  borderRadius: '50%',
  background: `conic-gradient(
    ${color} ${progress}%,
    #f0f0f0 ${progress}%
  )`,
  '&::before': {
    content: '""',
    position: 'absolute',
    top: '20px',
    left: '20px',
    right: '20px',
    bottom: '20px',
    borderRadius: '50%',
    backgroundColor: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
}));

const ValueContainer = styled(Box)({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  textAlign: 'center',
  zIndex: 2,
});

const CO2Gauge: React.FC = () => {
  const { currentSensorValues } = useMQTT();
  
  const value = currentSensorValues.co2 || 0;
  const min = 0;
  const max = 2000;
  const progress = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const color = value < 400 ? '#4caf50' : value > 1000 ? '#f44336' : '#ff9800';

  return (
    <Paper sx={{ p: 2, textAlign: 'center' }}>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        🌫️ CO2
      </Typography>
      
      <GaugeContainer>
        <GaugeCircle color={color} progress={progress}>
          <ValueContainer>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: color, lineHeight: 1 }}>
              {value.toFixed(0)}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              ppm
            </Typography>
          </ValueContainer>
        </GaugeCircle>
      </GaugeContainer>
      
      <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
        Range: {min} - {max} ppm
      </Typography>
      
      <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
        Debug: {value} ppm
      </Typography>
    </Paper>
  );
};

export default CO2Gauge;
