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

const CO2Chart: React.FC = () => {
  const { sensorData, currentSensorValues } = useMQTT();
  
  // Use real-time data if available, otherwise show dummy data
  const chartData = sensorData.co2.length > 0 
    ? sensorData.co2 
    : generateDummyData(currentSensorValues.co2 || 400, 100, 20);

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        🌫️ CO2 Chart
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
        Realtime - last 5 minutes
      </Typography>
      
      <Box sx={{ height: 300 }}>
        <SensorChart
          title="CO2"
          data={chartData}
          color="#7c4dff"
          unit="ppm"
        />
      </Box>
      
      <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
        Debug: Data points: {chartData.length}, Current: {currentSensorValues.co2 || 0} ppm
      </Typography>
    </Paper>
  );
};

export default CO2Chart;
