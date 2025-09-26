import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

interface GaugeProps {
  value: number;
  label: string;
  unit: string;
  color: string;
  min?: number;
  max?: number;
}

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
    top: '10%',
    left: '10%',
    right: '10%',
    bottom: '10%',
    background: 'white',
    borderRadius: '50%',
  },
}));

const GaugeValue = styled(Box)({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  textAlign: 'center',
});

const SensorGauge: React.FC<GaugeProps> = ({
  value,
  label,
  unit,
  color,
  min = 0,
  max = 100,
}) => {
  const progress = ((value - min) / (max - min)) * 100;

  return (
    <Box sx={{ textAlign: 'center', p: 2 }}>
      <Typography variant="h6" gutterBottom>
        {label}
      </Typography>
      <GaugeContainer>
        <GaugeCircle color={color} progress={progress} />
        <GaugeValue>
          <Typography variant="h4" sx={{ fontWeight: 'bold', color: color }}>
            {value}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {unit}
          </Typography>
        </GaugeValue>
      </GaugeContainer>
    </Box>
  );
};

export default SensorGauge;