# Hướng dẫn sử dụng MQTT với Smart Office

## Tổng quan

Hệ thống Smart Office đã được cập nhật để sử dụng MQTT với format mới:
- **Topic**: `office/{phong_ma_nguoi_dung_chon}`
- **Payload**: JSON format để điều khiển nhiều thiết bị cùng lúc

## Cách hoạt động

### 1. Subscription
- Hệ thống tự động subscribe vào topic `office/{roomId}` khi người dùng chọn phòng
- Khi đổi phòng, hệ thống sẽ unsubscribe phòng cũ và subscribe phòng mới

### 2. JSON Payload Format
```json
{
  "light": "on",      // "on" hoặc "off"
  "ac": 24,           // Nhiệt độ (số)
  "door": "open",     // "open" hoặc "close"
  "curtain": "open"   // "open" hoặc "close"
}
```

### 3. Ví dụ sử dụng

#### Điều khiển đèn
```json
{"light": "on"}
{"light": "off"}
```

#### Điều khiển điều hòa
```json
{"ac": 22}
{"ac": 26}
```

#### Điều khiển cửa
```json
{"door": "open"}
{"door": "close"}
```

#### Điều khiển nhiều thiết bị cùng lúc
```json
{"light": "on", "ac": 24, "door": "open"}
```

## Test hệ thống

### 1. Sử dụng MQTT Tester trong UI
- Mở ứng dụng Smart Office
- Chọn phòng từ danh sách
- Sử dụng component "MQTT Tester" để test publish JSON payload
- Quan sát trạng thái thiết bị thay đổi theo payload

### 2. Sử dụng script test
```bash
cd Smart-Office
node test-mqtt.js
```

Script này sẽ tự động publish các test cases vào topic `office/room1`.

### 3. Sử dụng MQTT client khác
```bash
# Publish JSON payload
mosquitto_pub -h localhost -t "office/room1" -m '{"light":"on","ac":24}'

# Subscribe để xem messages
mosquitto_sub -h localhost -t "office/room1"
```

## Luồng hoạt động

1. **Người dùng chọn phòng** → Hệ thống subscribe vào `office/{roomId}`
2. **Nhận JSON payload** → Parse và cập nhật trạng thái thiết bị
3. **UI tự động cập nhật** → Hiển thị trạng thái mới của các thiết bị
4. **Người dùng điều khiển** → Publish JSON payload mới

## Troubleshooting

### 1. Không nhận được messages
- Kiểm tra kết nối MQTT broker
- Đảm bảo đã chọn phòng
- Kiểm tra topic có đúng format `office/{roomId}` không

### 2. JSON payload không được parse
- Kiểm tra JSON syntax
- Xem console logs để debug

### 3. Trạng thái thiết bị không cập nhật
- Kiểm tra deviceStates trong MQTT Inspector
- Đảm bảo room ID trong payload khớp với phòng đang chọn
