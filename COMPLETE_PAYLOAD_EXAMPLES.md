# Payload Examples cho Smart Office System

## 📋 **Dựa trên các components hiện tại**

### 🔧 **Device Controls (Điều khiển thiết bị)**

#### **1. Light Control (Đèn)**
```json
{
  "light": "on"
}
```
```json
{
  "light": "off"
}
```

#### **2. Air Conditioning (Điều hòa)**
```json
{
  "ac": 24
}
```
```json
{
  "ac": 26
}
```

#### **3. Curtain Control (Rèm cửa)**
```json
{
  "curtain": "open"
}
```
```json
{
  "curtain": "close"
}
```

#### **4. Door Control (Cửa)**
```json
{
  "door": "open"
}
```
```json
{
  "door": "close"
}
```

### 📊 **Sensor Data (Dữ liệu cảm biến)**

#### **5. Temperature Sensor (Nhiệt độ)**
```json
{
  "temperature": 28.5
}
```

#### **6. Humidity Sensor (Độ ẩm)**
```json
{
  "humidity": 65.2
}
```

#### **7. CO2 Sensor**
```json
{
  "co2": 450
}
```

#### **8. TVOC Sensor (Total Volatile Organic Compounds)**
```json
{
  "tvoc": 0.553
}
```

### 🏢 **Room Information (Thông tin phòng)**
```json
{
  "room_id": "office1",
  "room_name": "Office 1",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## 🚀 **Complete Payload Examples (Tất cả trường)**

### **1. Full Office State (Trạng thái đầy đủ văn phòng)**
```json
{
  "room_id": "office1",
  "timestamp": "2024-01-15T10:30:00Z",
  "devices": {
    "light": "on",
    "ac": 24,
    "curtain": "open",
    "door": "close"
  },
  "sensors": {
    "temperature": 28.5,
    "humidity": 65.2,
    "co2": 450,
    "tvoc": 0.553
  },
  "status": {
    "occupancy": true,
    "air_quality": "good",
    "energy_consumption": 2.5
  }
}
```

### **2. Simple Device Control (Điều khiển thiết bị đơn giản)**
```json
{
  "light": "on",
  "ac": 26,
  "curtain": "open",
  "door": "close"
}
```

### **3. Sensor Data Only (Chỉ dữ liệu cảm biến)**
```json
{
  "temperature": 28.5,
  "humidity": 65.2,
  "co2": 450,
  "tvoc": 0.553
}
```

### **4. Mixed Control + Sensor (Kết hợp điều khiển và cảm biến)**
```json
{
  "light": "on",
  "ac": 24,
  "temperature": 28.5,
  "humidity": 65.2
}
```

## 🎯 **Recommended Payloads (Khuyến nghị)**

### **For Device Control (Cho điều khiển thiết bị):**
```json
{
  "light": "on",
  "ac": 26,
  "curtain": "open",
  "door": "close"
}
```

### **For Sensor Updates (Cho cập nhật cảm biến):**
```json
{
  "temperature": 28.5,
  "humidity": 65.2,
  "co2": 450,
  "tvoc": 0.553
}
```

### **For Complete Room State (Cho trạng thái phòng đầy đủ):**
```json
{
  "light": "on",
  "ac": 24,
  "curtain": "open",
  "door": "close",
  "temperature": 28.5,
  "humidity": 65.2,
  "co2": 450,
  "tvoc": 0.553
}
```

## 📝 **Data Types (Kiểu dữ liệu)**

| Field | Type | Values | Example |
|-------|------|--------|---------|
| `light` | string | "on", "off" | "on" |
| `ac` | number | 16-30 | 24 |
| `curtain` | string | "open", "close" | "open" |
| `door` | string | "open", "close" | "close" |
| `temperature` | number | -10 to 50 | 28.5 |
| `humidity` | number | 0 to 100 | 65.2 |
| `co2` | number | 0 to 5000 | 450 |
| `tvoc` | number | 0 to 10 | 0.553 |

## 🔄 **Usage Examples (Ví dụ sử dụng)**

### **Topic Format:**
```
office/{room_id}
```

### **Examples:**
- `office/office1`
- `office/room1`
- `office/meetingRoom`
- `office/lab`

### **Publish Commands:**
```bash
# Turn on light
mosquitto_pub -h localhost -t "office/office1" -m '{"light":"on"}'

# Set AC to 26°C
mosquitto_pub -h localhost -t "office/office1" -m '{"ac":26}'

# Update all devices
mosquitto_pub -h localhost -t "office/office1" -m '{"light":"on","ac":24,"curtain":"open","door":"close"}'

# Update sensors
mosquitto_pub -h localhost -t "office/office1" -m '{"temperature":28.5,"humidity":65.2,"co2":450,"tvoc":0.553}'
```
