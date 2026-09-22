# 🚀 ESP32 IoT Examination Suite (ระบบแบบทดสอบออนไลน์วิชา ESP32 IoT)

ศูนย์รวมแบบทดสอบออนไลน์วิชาไมโครคอนโทรลเลอร์และการเชื่อมต่อเครือข่ายไร้สายด้วย ESP32 พร้อมระบบตรวจคะแนนแบบเรียลไทม์ และระบบรักษาความปลอดภัย ป้องกันการทุจริต 6 ชั้น (6-Layer Anti-Cheat Protection) รองรับทั้งการรันแบบ **Local Server (Offline / Intranet)** และการนำไป Deploy บน **Google Apps Script Web App (Cloud)**

---

## 📚 ชุดแบบทดสอบในระบบ

1. **แบบทดสอบ: การใช้งาน Wi-Fi บน ESP32 (`/exam_wifi`)**
   - จำนวน: 15 ข้อ (15 คะแนน)
   - ครอบคลุมเนื้อหา: โหมด Station (STA), Access Point (soft-AP), คำสั่ง `WiFi.begin()`, การวัดค่าความแรงสัญญาณ RSSI (-30 dBm), หมายเลข MAC Address, การกำหนด Static IP (`WiFi.config()`), สถานะการเชื่อมต่อ `WL_CONNECTED`, การจัดการ Wi-Fi Events และ Library `WiFi.h`

2. **แบบทดสอบ: ESP32 Web Server & WebSocket (`/exam_websocket`)**
   - จำนวน: 15 ข้อ (15 คะแนน)
   - ครอบคลุมเนื้อหา: การสื่อสารแบบสองทางพร้อมกัน (Full Duplex Real-Time), ความแตกต่างระหว่าง HTTP Polling และ WebSocket, การเก็บไฟล์ HTML ใน PROGMEM Flash Memory, Library `AsyncTCP.h`, การ Handshake ด้วย HTTP, โปรโตคอล `ws://`, การดักจับ Event `WS_EVT_CONNECT`, พอร์ตมาตรฐาน 80 และการส่งผ่านข้อมูลรูปแบบ JSON

3. **แบบทดสอบ: Digital Pin, Switch, Relay และ DHT Sensor (`/exam_digitalpin_digitalsensor`)**
   - จำนวน: 15 ข้อ (15 คะแนน)
   - ครอบคลุมเนื้อหา: คำสั่ง `pinMode(GPIO, OUTPUT/INPUT_PULLUP)`, ขาที่เป็น Input-only บน ESP32 (GPIO 34, 35, 36, 39), ขาที่ต่อ SPI Flash ภายในชิป (GPIO 6-11), คำสั่ง `digitalRead()`, วงจร Active-Low สวิตช์ปุ่มกด, ตัวต้านทาน Pull-up (10kΩ), หน้าสัมผัสรีเลย์ COM, NO, NC, การควบคุมโหลดไฟฟ้ากำลังสูง, วงจร Optocoupler ป้องกันสัญญาณรบกวน, ความแตกต่างระหว่าง DHT11 และ DHT22, คำสั่ง `dht.readTemperature()`, และการตรวจสอบค่า Sensor ด้วยฟังก์ชัน `isnan()`

4. **แบบทดสอบ: Analog Pin, ADC, Sensors และการแปลงสัญญาณอนาล็อก (`/exam_analogpin_analogsensor`)**
   - จำนวน: 15 ข้อ (15 คะแนน)
   - ครอบคลุมเนื้อหา: หน้าที่ของวงจร ADC, ความละเอียดเริ่มต้น 12-bit (0-4095) บน ESP32 เทียบกับ 10-bit (0-1023 พิน A0) บน ESP8266, คำสั่ง `analogRead()`, ข้อจำกัดพิน ADC2 เมื่อเปิดใช้ Wi-Fi, ฟังก์ชัน `map()`, เซนเซอร์แสง LDR กับวงจรแบ่งแรงดัน (Voltage Divider), เซนเซอร์วัดความชื้นในดิน Resistive (YL-69) กับปัญหาการกัดกร่อนจาก Electrolysis เทียบกับแบบ Capacitive, พิน AO ของเซนเซอร์ก๊าซ MQ Series, การแปลงค่า ADC เป็นโวลต์จริง (Vin = (adcValue/4095.0)*3.3), และการลด Noise ด้วย Signal Averaging / Oversampling

---

## 🛡️ มาตรฐานความปลอดภัย 6 ชั้น (6-Layer Anti-Cheat)

- **Layer 1: Randomizer** — สุ่มลำดับข้อสอบและตัวเลือกทุกครั้ง ไม่แสดงเลขข้อเพื่อป้องกันการจำลำดับ
- **Layer 2: Real-time ID Verification** — ตรวจสอบสิทธิ์รหัสประจำตัวผู้เข้าสอบแบบเรียลไทม์ ป้องกันการส่งข้อสอบซ้ำ
- **Layer 3: Desktop Anti-Screenshot** — ดักจับปุ่ม PrintScreen พร้อมล้างคลิปบอร์ด, บล็อกคำสั่ง `Ctrl+P`, `Ctrl+S`, `Ctrl+Shift+S` (Snipping Tool), `F12`
- **Layer 4: Mobile Anti-Cheat** — ปิด Callout/Context Menu ป้องกันการกดค้างบน iOS & Android, บล็อกท่าทางปัด 3 นิ้วแคปหน้าจอ
- **Layer 5: Blur Detection & Anti-Snipping Shield** — ม่านดำบังหน้าจอทันทีเมื่อสลับแอปหรือเปิดโปรแกรมแคปภาพ พร้อมระบบล็อกข้อสอบหากสลับหน้าจอเกิน 3 ครั้ง
- **Layer 6: Dynamic Forensic Watermark** — เลเยอร์ลายน้ำประทับ "รหัสประจำตัว • ชื่อ-นามสกุล" ทแยงมุมทั่วทั้งหน้าจอแบบโปร่งแสง

---

## 👨‍🏫 ส่วนสำหรับครูผู้สอน (Teacher Tools & Deployment)

- **ช่องกรอกลิงก์ Google Sheets & เซฟลิงก์ (`💾 เซฟลิงก์`)**: รองรับการวางลิงก์ Google Sheets โดยระบบจะดึง Sheet ID ออกมาให้อัตโนมัติ พร้อมบันทึกจำไว้ไม่ต้องกรอกซ้ำ
- **ปุ่มคัดลอก Code.gs (`📋 คัดลอก Code.gs (ที่ใส่ Sheet ID แล้ว)`)**: คัดลอกโค้ด Backend ที่ผูกกับ Sheet ID เรียบร้อยแล้ว นำไปวางใน Google Apps Script Editor ได้ทันที
- **ปุ่มคัดลอก Index.html (`📄 คัดลอก Index.html`)**: คัดลอกโค้ด Frontend ทั้งหมดนำไปสร้างไฟล์ `Index.html` บน Apps Script

---

## 💻 วิธีการเปิดใช้งานบนเครื่อง (Local Server)

### วิธีที่ 1: ดับเบิลคลิกเปิดไฟล์ (Windows)
ดับเบิลคลิกที่ไฟล์ **`start_server.bat`** ระบบจะเปิดเซิร์ฟเวอร์และเรียกเบราว์เซอร์อัตโนมัติที่:
👉 **`http://localhost:8000`**

### วิธีที่ 2: รันผ่าน Node.js (Zero Dependency)
```bash
node server.js
```

### วิธีที่ 3: รันผ่าน Python
```bash
python server.py
```

---

## 📂 โครงสร้างโฟลเดอร์

```text
Exam_IoT/
├── index.html            # หน้า Dashboard ศูนย์รวมแบบทดสอบ + กระดานผลคะแนน
├── server.js             # Local Web Server (Node.js แบบ Zero-dependency)
├── server.py             # Local Web Server สำรอง (Python 3.x)
├── local-adapter.js      # ตัวจำลอง google.script.run สำหรับทดสอบบน Localhost
├── start_server.bat      # สคริปต์คลิกเปิดเซิร์ฟเวอร์บน Windows อัตโนมัติ
├── data/                 # ฐานข้อมูลจัดเก็บคะแนนและประวัติการสอบ
│   ├── submissions.json
│   ├── behavior_logs.json
│   └── settings.json
├── exam_wifi/            # ชุดข้อสอบ Wi-Fi บน ESP32 (Index.html, Code.gs)
├── exam_websocket/       # ชุดข้อสอบ ESP32 Web Server & WebSocket (Index.html, Code.gs)
├── exam_digitalpin_digitalsensor/ # ชุดข้อสอบ Digital Pin, Switch, Relay และ DHT Sensor (Index.html, Code.gs)
└── exam_analogpin_analogsensor/   # ชุดข้อสอบ Analog Pin, ADC, Sensors และการแปลงสัญญาณ (Index.html, Code.gs)
```
