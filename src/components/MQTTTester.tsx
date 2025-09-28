import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Paper, Stack } from '@mui/material';
import { useMQTT } from '../contexts/MQTTContext';

const MQTTTester: React.FC = () => {
  const { publishRoom, currentRoomId, deviceStates, isConnected } = useMQTT();
  const [testPayload, setTestPayload] = useState('{"light":"on","ac":24,"door":"open"}');

  const handleTestPublish = () => {
    if (!currentRoomId) {
      alert('Vui lòng chọn phòng trước!');
      return;
    }

    try {
      const payload = JSON.parse(testPayload);
      publishRoom(currentRoomId, payload);
      console.log(`Published to office/${currentRoomId}:`, payload);
    } catch (e) {
      alert('JSON không hợp lệ!');
    }
  };

  const handleQuickTest = (payload: Record<string, any>) => {
    if (!currentRoomId) {
      alert('Vui lòng chọn phòng trước!');
      return;
    }
    publishRoom(currentRoomId, payload);
    console.log(`Published to office/${currentRoomId}:`, payload);
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        MQTT Tester
      </Typography>
      
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Phòng hiện tại: {currentRoomId || 'Chưa chọn'}
      </Typography>
      
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Trạng thái kết nối: {isConnected ? 'Đã kết nối' : 'Chưa kết nối'}
      </Typography>

      <Stack spacing={2} sx={{ mt: 2 }}>
        <TextField
          label="JSON Payload"
          multiline
          rows={3}
          value={testPayload}
          onChange={(e) => setTestPayload(e.target.value)}
          placeholder='{"light":"on","ac":24}'
          fullWidth
        />
        
        <Button 
          variant="contained" 
          onClick={handleTestPublish}
          disabled={!isConnected || !currentRoomId}
        >
          Publish JSON
        </Button>

        <Typography variant="subtitle2">Test nhanh:</Typography>
        
        <Stack direction="row" spacing={1}>
          <Button 
            size="small" 
            variant="outlined"
            onClick={() => handleQuickTest({ light: 'on' })}
            disabled={!isConnected || !currentRoomId}
          >
            Light ON
          </Button>
          <Button 
            size="small" 
            variant="outlined"
            onClick={() => handleQuickTest({ light: 'off' })}
            disabled={!isConnected || !currentRoomId}
          >
            Light OFF
          </Button>
          <Button 
            size="small" 
            variant="outlined"
            onClick={() => handleQuickTest({ ac: 22 })}
            disabled={!isConnected || !currentRoomId}
          >
            AC 22°C
          </Button>
          <Button 
            size="small" 
            variant="outlined"
            onClick={() => handleQuickTest({ door: 'open' })}
            disabled={!isConnected || !currentRoomId}
          >
            Door Open
          </Button>
        </Stack>

        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2">Trạng thái thiết bị hiện tại:</Typography>
          <Box sx={{ maxHeight: 200, overflow: 'auto', mt: 1 }}>
            {Object.entries(deviceStates)
              .filter(([key]) => key.includes(currentRoomId || ''))
              .map(([key, value]) => (
                <Typography key={key} variant="caption" display="block">
                  {key}: {value.state}
                </Typography>
              ))}
          </Box>
        </Box>
      </Stack>
    </Paper>
  );
};

export default MQTTTester;
