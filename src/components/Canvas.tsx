import React from 'react';
import { Box, Paper, IconButton, Tooltip } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { BaseWidget, WidgetType } from '../types/widgets';
import SensorGauge from './SensorGauge';
import DeviceControl from './DeviceControl';
import MQTTInspector from './MQTTInspector';
import CombinedChart from './CombinedChart';
import SensorChart from './SensorChart';
import AirQualityBar from './AirQualityBar';
import TemperatureGauge from './TemperatureGauge';
import HumidityGauge from './HumidityGauge';
import CO2Gauge from './CO2Gauge';
import TVOCGauge from './TVOCGauge';
import TemperatureChart from './TemperatureChart';
import HumidityChart from './HumidityChart';
import CO2Chart from './CO2Chart';
import TVOCChart from './TVOCChart';
import { useMQTT } from '../contexts/MQTTContext';

interface CanvasProps {
  widgets: BaseWidget[];
  onChange: (next: BaseWidget[]) => void;
  onSelect?: (widget: BaseWidget | null) => void;
}

const renderWidget = (w: BaseWidget, currentSensorValues: { temperature: number; humidity: number; co2: number; tvoc: number }) => {
  
  switch (w.type as WidgetType) {
    case 'sensorGauge':
      // Determine sensor value based on label
      const getSensorValue = () => {
        const label = (w.props?.label ?? 'Sensor').toLowerCase();
        if (label.includes('temperature')) return currentSensorValues.temperature;
        if (label.includes('humidity')) return currentSensorValues.humidity;
        if (label.includes('co2')) return currentSensorValues.co2;
        if (label.includes('tvoc')) return currentSensorValues.tvoc;
        return w.props?.value ?? 25; // fallback to props
      };
      
      return (
        <SensorGauge
          value={getSensorValue()}
          label={w.props?.label ?? 'Sensor'}
          unit={w.props?.unit ?? '°C'}
          color={w.props?.color ?? '#ff6b6b'}
          min={w.props?.min ?? 0}
          max={w.props?.max ?? 100}
        />
      );
    case 'deviceControl':
      return (
        <DeviceControl room={w.props?.room ?? 'room1'} type={w.props?.deviceType ?? 'light'} />
      );
    case 'mqttInspector':
      return <MQTTInspector />;
    case 'combinedChart':
      return (
        <CombinedChart
          title={w.props?.title ?? 'Temperature & Humidity'}
          datasets={w.props?.datasets ?? [
            { label: 'Temperature (°C)', data: generateDummyData(28, 2, 30), color: '#ff6b6b', unit: '°C' },
            { label: 'Humidity (%)', data: generateDummyData(30, 8, 30), color: '#4dabf7', unit: '%' },
          ]}
        />
      );
    case 'sensorChart':
      // Determine sensor data based on title
      const getSensorChartData = () => {
        const title = (w.props?.title ?? 'TVOC').toLowerCase();
        if (title.includes('temperature')) return generateDummyData(currentSensorValues.temperature, 3, 20);
        if (title.includes('humidity')) return generateDummyData(currentSensorValues.humidity, 10, 20);
        if (title.includes('co2')) return generateDummyData(currentSensorValues.co2, 100, 20);
        if (title.includes('tvoc')) return generateDummyData(currentSensorValues.tvoc, 0.1, 20);
        return w.props?.data ?? generateDummyData(0.55, 0.1, 20); // fallback to props
      };
      
      return (
        <SensorChart
          title={w.props?.title ?? 'TVOC'}
          data={getSensorChartData()}
          color={w.props?.color ?? '#00bcd4'}
          unit={w.props?.unit ?? 'ppm'}
        />
      );
    case 'airQualityBar':
      return (
        <AirQualityBar
          label={w.props?.label ?? 'Air Quality'}
          value={w.props?.value ?? 75}
          max={w.props?.max ?? 500}
        />
      );
    // New dedicated gauge components
    case 'temperatureGauge':
      return <TemperatureGauge />;
    case 'humidityGauge':
      return <HumidityGauge />;
    case 'co2Gauge':
      return <CO2Gauge />;
    case 'tvocGauge':
      return <TVOCGauge />;
    // New dedicated chart components
    case 'temperatureChart':
      return <TemperatureChart />;
    case 'humidityChart':
      return <HumidityChart />;
    case 'co2Chart':
      return <CO2Chart />;
    case 'tvocChart':
      return <TVOCChart />;
    default:
      return null;
  }
};

function generateDummyData(baseValue: number, range: number, count: number) {
  const data = [] as Array<{ timestamp: Date; value: number }>;
  let currentDate = new Date();
  for (let i = count - 1; i >= 0; i--) {
    data.push({ timestamp: new Date(currentDate.getTime() - i * 60000), value: baseValue + (Math.random() - 0.5) * range });
  }
  return data;
}

const Canvas: React.FC<CanvasProps> = ({ widgets, onChange, onSelect }) => {
  const [dragId, setDragId] = React.useState<string | null>(null);
  const [offset, setOffset] = React.useState<{x: number; y: number}>({ x: 0, y: 0 });
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const { currentSensorValues } = useMQTT();

  const onMouseDown = (e: React.MouseEvent, id: string) => {
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    setDragId(id);
    setOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setSelectedId(id);
    onSelect?.(widgets.find(w => w.id === id) || null);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragId) return;
    const canvas = e.currentTarget as HTMLElement;
    const canvasRect = canvas.getBoundingClientRect();
    const x = e.clientX - canvasRect.left - offset.x;
    const y = e.clientY - canvasRect.top - offset.y;

    const canvasWidth = canvasRect.width;
    const canvasHeight = canvasRect.height;
    const next = widgets.map(w => w.id === dragId ? { ...w, x: Math.max(0, x), y: Math.max(0, y) } : { ...w });

    // Collision avoidance: push other widgets down if overlapping with dragged widget.
    const gridSizeLocal = gridSize;

    type R = { x: number; y: number; w: number; h: number };
    const rectOf = (w: typeof next[number]): R => ({ x: snap(Math.max(0, w.x)), y: snap(Math.max(0, w.y)), w: w.w, h: w.h });
    const intersects = (a: R, b: R) => !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);

    const idToIndex = new Map<string, number>();
    next.forEach((w, i) => idToIndex.set(w.id, i));

    const pushAway = (movingRect: R, blockerId: string, visited: Set<string>) => {
      const idx = idToIndex.get(blockerId);
      if (idx === undefined) return;
      const w = next[idx];
      const wr = rectOf(w);

      // Candidate positions: left, right, above, below the movingRect
      const candidates: Array<{ x: number; y: number; cost: number }> = [];
      // left
      let newX = snap(Math.max(0, movingRect.x - wr.w - gridSizeLocal));
      candidates.push({ x: newX, y: wr.y, cost: Math.abs(newX - wr.x) });
      // right
      newX = snap(Math.min(canvasWidth - wr.w, movingRect.x + movingRect.w + gridSizeLocal));
      candidates.push({ x: newX, y: wr.y, cost: Math.abs(newX - wr.x) });
      // above
      let newY = snap(Math.max(0, movingRect.y - wr.h - gridSizeLocal));
      candidates.push({ x: wr.x, y: newY, cost: Math.abs(newY - wr.y) });
      // below
      newY = snap(Math.min(canvasHeight - wr.h, movingRect.y + movingRect.h + gridSizeLocal));
      candidates.push({ x: wr.x, y: newY, cost: Math.abs(newY - wr.y) });

      // pick the smallest cost that actually resolves intersection
      candidates.sort((a, b) => a.cost - b.cost);
      for (const c of candidates) {
        const trial: R = { x: c.x, y: c.y, w: wr.w, h: wr.h };
        if (!intersects(movingRect, trial)) {
          w.x = c.x; w.y = c.y;
          // After moving, cascade if it hits others
          const movedRect = rectOf(w);
          for (const other of next) {
            if (other.id === w.id) continue;
            const or = rectOf(other);
            if (intersects(movedRect, or)) {
              const key = `${w.id}->${other.id}`;
              if (visited.has(key)) continue;
              visited.add(key);
              pushAway(movedRect, other.id, visited);
            }
          }
          return;
        }
      }
      // Fallback: push down
      const fallbackY = snap(Math.min(canvasHeight - wr.h, movingRect.y + movingRect.h + gridSizeLocal));
      w.y = fallbackY;
    };

    const dragged = next.find(w => w.id === dragId)!;
    const dr = rectOf(dragged);
    for (const other of next) {
      if (other.id === dragId) continue;
      const or = rectOf(other);
      if (intersects(dr, or)) {
        pushAway(dr, other.id, new Set<string>());
      }
    }

    onChange(next);
  };

  const onMouseUp = () => setDragId(null);

  const onCanvasClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.MuiPaper-root')) return;
    setSelectedId(null);
    onSelect?.(null);
  };

  const onDelete = (id: string) => {
    onChange(widgets.filter(w => w.id !== id));
  };

  const gridSize = 16;

  const snap = (v: number) => Math.round(v / gridSize) * gridSize;

  return (
    <Box
      sx={{ position: 'relative', width: '100%', height: 'calc(100vh - 140px)', bgcolor: '#f7f7f7', border: 1, borderColor: 'divider', overflow: 'auto', backgroundImage: `linear-gradient(0deg, rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)`, backgroundSize: `${gridSize}px ${gridSize}px` }}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onClick={onCanvasClick}
    >
      {widgets.map(w => (
        <Paper
          key={w.id}
          elevation={3}
          onMouseDown={(e) => onMouseDown(e, w.id)}
          sx={{ position: 'absolute', left: snap(w.x), top: snap(w.y), width: w.w, height: w.h, cursor: 'move', p: 1, transition: dragId === w.id ? 'none' : 'box-shadow 0.2s ease', '&:hover': { boxShadow: 6 }, overflow: 'hidden', outline: selectedId === w.id ? '2px solid #42a5f5' : 'none' }}
        >
          <Box sx={{ position: 'absolute', top: 6, right: 6, zIndex: 2, opacity: 0, transition: 'opacity 0.15s ease', '.MuiPaper-root:hover &': { opacity: 1 } }} className="widget-action">
            <Tooltip title="Delete">
              <IconButton size="small" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onDelete(w.id); }} sx={{ bgcolor: 'rgba(255,255,255,0.9)', '&:hover': { bgcolor: 'rgba(255,255,255,1)' }, boxShadow: 1 }}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          <Box sx={{ position: 'absolute', top: 6, left: 8, zIndex: 1, px: 1, py: 0.25, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.85)', color: 'text.secondary', fontSize: 11, fontWeight: 600, opacity: 0, transition: 'opacity 0.15s ease', '.MuiPaper-root:hover &': { opacity: 1 } }}>
            {w.type}
          </Box>
          <Box sx={{ p: 1, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {renderWidget(w, currentSensorValues)}
          </Box>
        </Paper>
      ))}
    </Box>
  );
};

export default Canvas;


