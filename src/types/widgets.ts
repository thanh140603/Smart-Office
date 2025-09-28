export type WidgetType = 
  | 'sensorGauge' 
  | 'deviceControl' 
  | 'mqttInspector' 
  | 'combinedChart' 
  | 'sensorChart' 
  | 'airQualityBar'
  | 'temperatureGauge'
  | 'humidityGauge'
  | 'co2Gauge'
  | 'tvocGauge'
  | 'temperatureChart'
  | 'humidityChart'
  | 'co2Chart'
  | 'tvocChart';

export interface BaseWidget {
  id: string;
  type: WidgetType;
  x: number; // px
  y: number; // px
  w: number; // px
  h: number; // px
  props?: Record<string, any>;
}

export interface RoomLayout {
  id: string;
  name: string;
  widgets: BaseWidget[];
}

export interface WorkspaceState {
  rooms: RoomLayout[];
  currentRoomId: string | null;
}


