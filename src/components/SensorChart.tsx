import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { Box, Paper, Typography } from '@mui/material';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  TimeScale,
  Title,
  Tooltip,
  Legend
);

interface DataPoint {
  timestamp: Date;
  value: number;
}

interface SensorChartProps {
  title: string;
  data: DataPoint[];
  color: string;
  unit: string;
}

const SensorChart: React.FC<SensorChartProps> = ({ title, data, color, unit }) => {
  const chartData = {
    datasets: [
      {
        label: title,
        data: data.map(point => ({
          x: point.timestamp,
          y: point.value,
        })),
        borderColor: color,
        backgroundColor: color + '20',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: 'minute' as const,
          displayFormats: {
            minute: 'HH:mm',
          },
        },
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: '#f0f0f0',
        },
        ticks: {
          callback: (tickValue: string | number) => `${Number(tickValue)}${unit}`,
        },
      },
    },
  };

  return (
    <Box sx={{ p: 2, height: '100%' }}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Box sx={{ height: 300 }}>
        <Line data={chartData} options={options} />
      </Box>
    </Box>
  );
};

export default SensorChart;