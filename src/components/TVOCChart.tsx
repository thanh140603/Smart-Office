import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import SensorChart from './SensorChart';
import { useMQTT } from '../contexts/MQTTContext';

const generateDummyData = (baseValue: number, range: number, count: number) => {
  const data = [] as Array<{ timestamp: Date; value: number }>;
  let currentDate = new Date();
  for (let i = count - 1; i >= 0; i--) {
    data.push({
      timestamp: new Date(currentDate.getTime() - i * 60000),
      value: baseValue + (Math.random() - 0.5) * range,
    });
  }
  return data;
};

const TVOCChart: React.FC = () => {
  const { sensorData, currentSensorValues } = useMQTT();
  
  // Use real-time data if available, otherwise show dummy data
  const chartData = sensorData.tvoc.length > 0 
    ? sensorData.tvoc 
    : generateDummyData(currentSensorValues.tvoc || 0.5, 0.1, 20);

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        🧪 TVOC Chart
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
        Realtime - last 5 minutes
      </Typography>
      
      <Box sx={{ height: 300 }}>
        <SensorChart
          title="TVOC"
          data={chartData}
          color="#26a69a"
          unit="ppm"
        />
      </Box>
      
      <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
        Debug: Data points: {chartData.length}, Current: {currentSensorValues.tvoc || 0} ppm
      </Typography>
    </Paper>
  );
};

export default TVOCChart;
