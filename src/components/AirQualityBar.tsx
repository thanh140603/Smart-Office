import React from 'react';
import { Box, Typography, LinearProgress } from '@mui/material';

interface AirQualityBarProps {
  label?: string;
  value: number; // 0-500 AQI-like scale
  max?: number;
}

const colorForValue = (v: number) => {
  if (v <= 50) return '#4caf50';
  if (v <= 100) return '#cddc39';
  if (v <= 150) return '#ffeb3b';
  if (v <= 200) return '#ff9800';
  if (v <= 300) return '#f44336';
  return '#6a1b9a';
};

const AirQualityBar: React.FC<AirQualityBarProps> = ({ label = 'Air Quality', value, max = 500 }) => {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const color = colorForValue(value);
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        {label}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ flex: 1 }}>
          <LinearProgress variant="determinate" value={pct} sx={{ height: 16, borderRadius: 8, [`& .MuiLinearProgress-bar`]: { backgroundColor: color } }} />
        </Box>
        <Typography variant="h6" sx={{ minWidth: 64, fontWeight: 700, color }}>{value}</Typography>
      </Box>
    </Box>
  );
};

export default AirQualityBar;


