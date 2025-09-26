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
import { Box, Typography } from '@mui/material';

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

interface Dataset {
  label: string;
  data: DataPoint[];
  color: string;
  unit?: string;
}

interface CombinedChartProps {
  title: string;
  datasets: Dataset[];
}

const CombinedChart: React.FC<CombinedChartProps> = ({ title, datasets }) => {
  const chartData = {
    datasets: datasets.map(ds => ({
      label: ds.label,
      data: ds.data.map(p => ({ x: p.timestamp, y: p.value })),
      borderColor: ds.color,
      backgroundColor: ds.color + '20',
      tension: 0.3,
      pointRadius: 0,
      fill: false,
      yAxisID: ds.unit === '%' ? 'y1' : 'y',
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' as const },
      tooltip: { mode: 'index' as const, intersect: false },
      title: { display: false }
    },
    scales: {
      x: { type: 'time' as const, time: { unit: 'minute' as const, displayFormats: { minute: 'HH:mm' } }, grid: { display: false } },
      y: { beginAtZero: false, position: 'left' as const, grid: { color: '#f0f0f0' } },
      y1: { beginAtZero: true, position: 'right' as const, grid: { drawOnChartArea: false } }
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>{title}</Typography>
      <Box sx={{ height: 420 }}>
        <Line data={chartData} options={options} />
      </Box>
    </Box>
  );
};

export default CombinedChart;
