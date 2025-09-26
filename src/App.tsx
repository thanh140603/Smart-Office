import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { MQTTProvider } from './contexts/MQTTContext';
import Dashboard from './pages/Dashboard';

const App: React.FC = () => {
  return (
    <Router>
      <MQTTProvider>
        <Dashboard />
      </MQTTProvider>
    </Router>
  );
};

export default App;