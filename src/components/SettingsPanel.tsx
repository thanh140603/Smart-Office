import React from 'react';
import { Box, Typography, TextField, MenuItem, InputAdornment, Divider, Stack } from '@mui/material';
import { BaseWidget } from '../types/widgets';

interface SettingsPanelProps {
  widget: BaseWidget | null;
  onChange: (updated: BaseWidget) => void;
}

const deviceTypes = [
  { value: 'light', label: 'Light' },
  { value: 'ac', label: 'AC' },
  { value: 'curtain', label: 'Curtain' },
  { value: 'door', label: 'Door' },
];

const SettingsPanel: React.FC<SettingsPanelProps> = ({ widget, onChange }) => {
  if (!widget) {
    return (
      <Box sx={{ p: 2, color: 'text.secondary' }}>
        <Typography variant="subtitle1">Select a widget to edit</Typography>
      </Box>
    );
  }

  const setProp = (key: string, value: any) => {
    const next: BaseWidget = { ...widget, props: { ...widget.props, [key]: value } };
    onChange(next);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>Widget Settings</Typography>
      <Typography variant="caption" color="text.secondary">Type: {widget.type}</Typography>
      <Divider sx={{ my: 1 }} />

      {widget.type === 'sensorGauge' && (
        <Stack spacing={2}>
          <TextField label="Label" size="small" value={widget.props?.label ?? ''} onChange={(e) => setProp('label', e.target.value)} />
          <TextField label="Unit" size="small" value={widget.props?.unit ?? ''} onChange={(e) => setProp('unit', e.target.value)} />
          <TextField label="Color" size="small" value={widget.props?.color ?? ''} onChange={(e) => setProp('color', e.target.value)} />
          <Stack direction="row" spacing={1}>
            <TextField label="Min" type="number" size="small" value={widget.props?.min ?? 0} onChange={(e) => setProp('min', Number(e.target.value))} />
            <TextField label="Max" type="number" size="small" value={widget.props?.max ?? 100} onChange={(e) => setProp('max', Number(e.target.value))} />
          </Stack>
        </Stack>
      )}

      {widget.type === 'sensorChart' && (
        <Stack spacing={2}>
          <TextField label="Title" size="small" value={widget.props?.title ?? ''} onChange={(e) => setProp('title', e.target.value)} />
          <TextField label="Color" size="small" value={widget.props?.color ?? ''} onChange={(e) => setProp('color', e.target.value)} />
          <TextField label="Unit" size="small" value={widget.props?.unit ?? ''} onChange={(e) => setProp('unit', e.target.value)} />
        </Stack>
      )}

      {widget.type === 'combinedChart' && (
        <Stack spacing={2}>
          <TextField label="Title" size="small" value={widget.props?.title ?? ''} onChange={(e) => setProp('title', e.target.value)} />
        </Stack>
      )}

      {widget.type === 'airQualityBar' && (
        <Stack spacing={2}>
          <TextField label="Label" size="small" value={widget.props?.label ?? ''} onChange={(e) => setProp('label', e.target.value)} />
          <TextField label="Max" type="number" size="small" value={widget.props?.max ?? 500} onChange={(e) => setProp('max', Number(e.target.value))} />
        </Stack>
      )}

      {widget.type === 'deviceControl' && (
        <Stack spacing={2}>
          <TextField label="Room" size="small" value={widget.props?.room ?? ''} onChange={(e) => setProp('room', e.target.value)} />
          <TextField label="Device Type" size="small" select value={widget.props?.deviceType ?? 'light'} onChange={(e) => setProp('deviceType', e.target.value)}>
            {deviceTypes.map(d => (
              <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>
            ))}
          </TextField>
        </Stack>
      )}

      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle2" gutterBottom>Position & Size</Typography>
      <Stack direction="row" spacing={1}>
        <TextField label="X" type="number" size="small" value={widget.x} onChange={(e) => onChange({ ...widget, x: Number(e.target.value) })} InputProps={{ endAdornment: <InputAdornment position="end">px</InputAdornment> }} />
        <TextField label="Y" type="number" size="small" value={widget.y} onChange={(e) => onChange({ ...widget, y: Number(e.target.value) })} InputProps={{ endAdornment: <InputAdornment position="end">px</InputAdornment> }} />
      </Stack>
      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
        <TextField label="W" type="number" size="small" value={widget.w} onChange={(e) => onChange({ ...widget, w: Number(e.target.value) })} InputProps={{ endAdornment: <InputAdornment position="end">px</InputAdornment> }} />
        <TextField label="H" type="number" size="small" value={widget.h} onChange={(e) => onChange({ ...widget, h: Number(e.target.value) })} InputProps={{ endAdornment: <InputAdornment position="end">px</InputAdornment> }} />
      </Stack>
    </Box>
  );
};

export default SettingsPanel;


