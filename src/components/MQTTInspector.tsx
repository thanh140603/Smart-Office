import React from 'react';
import { Box, Typography, Paper, List, ListItem, ListItemText, Chip } from '@mui/material';
import { useMQTT } from '../contexts/MQTTContext';

const MQTTInspector: React.FC = () => {
  const { isConnected, messageLog } = useMQTT();

  return (
    <Paper sx={{ p: 2, height: 300, overflow: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="subtitle1">MQTT Inspector</Typography>
        <Chip label={isConnected ? 'Connected' : 'Disconnected'} color={isConnected ? 'success' : 'default'} size="small" />
      </Box>

      <List dense>
        {messageLog.length === 0 && (
          <Typography variant="body2" color="text.secondary">No messages yet</Typography>
        )}
        {messageLog.map((m, idx) => (
          <ListItem key={idx} divider>
            <ListItemText primary={m.topic} secondary={`${m.payload} — ${new Date(m.receivedAt).toLocaleTimeString()}`} />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};

export default MQTTInspector;
