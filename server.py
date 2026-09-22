# -*- coding: utf-8 -*-
"""
server.py - Alternative Python HTTP Server for ESP32 Examination Suite
Compatible with Python 3.7+ (No pip install required)
"""

import os
import sys
import json
import mimetypes
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.parse

PORT = int(os.environ.get('PORT', 8000))
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(ROOT_DIR, 'data')
SUBMISSIONS_FILE = os.path.join(DATA_DIR, 'submissions.json')
BEHAVIOR_LOG_FILE = os.path.join(DATA_DIR, 'behavior_logs.json')
SETTINGS_FILE = os.path.join(DATA_DIR, 'settings.json')

QUIZ_ANSWER_KEYS = {
    'exam_wifi': {
        'title': 'แบบทดสอบ: การใช้งาน Wi-Fi บน ESP32',
        'keys': {
            'q_0': 'Station (STA)',
            'q_1': '192.168.4.1',
            'q_2': 'WiFi.begin(ssid, password)',
            'q_3': 'ความเข้มของสัญญาณวิทยุที่ได้รับ',
            'q_4': '-30 dBm',
            'q_5': 'เป็นหมายเลขประจำตัวฮาร์ดแวร์ที่ไม่ซ้ำกัน',
            'q_6': 'espressif',
            'q_7': 'WiFi.config()',
            'q_8': 'WL_CONNECTED',
            'q_9': 'ไม่ต้องเขียนโค้ดตรวจสอบสถานะใน loop() ตลอดเวลา',
            'q_10': 'WiFi.reconnect()',
            'q_11': 'ARDUINO_EVENT_WIFI_STA_DISCONNECTED',
            'q_12': '8 ตัวอักษร',
            'q_13': 'WiFi.h',
            'q_14': 'อ่านค่า IP Address ที่ได้รับจาก Router'
        }
    },
    'exam_websocket': {
        'title': 'แบบทดสอบ: ESP32 Web Server & WebSocket',
        'keys': {
            'q_0': 'เป็นการสื่อสารที่ค้างไว้ตลอดเวลา ทำให้ส่งข้อมูลสวนกันได้สองทาง',
            'q_1': 'WebSocket อัปเดตข้อมูลได้เรียลไทม์โดยไม่ต้องรีเฟรชหน้าจอ',
            'q_2': 'HTTP',
            'q_3': 'ทั้ง Client และ Server รับส่งข้อมูลพร้อมกันได้ทุกเมื่อ',
            'q_4': 'Flash Memory (PROGMEM)',
            'q_5': 'AsyncTCP.h',
            'q_6': 'ws://',
            'q_7': 'สร้างภาระ (Overhead) ให้เซิร์ฟเวอร์และโหลดทรัพยากรซ้ำซ้อน',
            'q_8': 'ลบ Client ที่ไม่ทำงานแล้วเพื่อคืนทรัพยากร',
            'q_9': 'WS_EVT_CONNECT',
            'q_10': "<meta http-equiv='refresh' content='1'>",
            'q_11': 'อัปเดตเฉพาะส่วนที่ต้องการโดยไม่ต้องโหลดหน้าใหม่ทั้งหมด',
            'q_12': 'JSON String',
            'q_13': '80',
            'q_14': 'การแสดงข้อมูลเซนเซอร์แบบกราฟเรียลไทม์'
        }
    },
    'exam_digitalpin_digitalsensor': {
        'title': 'แบบทดสอบเรื่อง Digital Pin, Switch, Relay และ DHT Sensor',
        'keys': {
            'q_0': 'pinMode(GPIO, OUTPUT);',
            'q_1': 'GPIO 34, 35, 36, 39',
            'q_2': 'เชื่อมต่อกับหน่วยความจำ SPI Flash ภายในชิป',
            'q_3': 'digitalRead(GPIO);',
            'q_4': 'LOW (0V / GND)',
            'q_5': 'สถานะ LOW',
            'q_6': '10k Ohm (10,000 Ohm)',
            'q_7': 'COM, NO, NC',
            'q_8': 'หน้าสัมผัสต่อกัน (ปิดวงจร) กระแสไฟฟ้าไหลผ่านได้',
            'q_9': 'จ่ายไฟเลี้ยงขดลวดแม่เหล็กไฟฟ้าของรีเลย์ (Relay Electromagnet)',
            'q_10': 'Optocoupler',
            'q_11': 'DHT22 มีความแม่นยำสูงกว่า และช่วงการวัดกว้างกว่า DHT11',
            'q_12': '10k Ohm',
            'q_13': 'dht.readTemperature();',
            'q_14': 'isnan()'
        }
    },
    'exam_analogpin_analogsensor': {
        'title': 'แบบทดสอบเรื่อง Analog Pin, ADC, Sensors และการแปลงสัญญาณอนาล็อก',
        'keys': {
            'q_0': 'แปลงสัญญาณแรงดันอนาล็อกเป็นค่าตัวเลขดิจิทัลที่ไมโครคอนโทรลเลอร์ประมวลผลได้',
            'q_1': '12-bit (อ่านค่าได้ 0 - 4095)',
            'q_2': '1 พิน (พิน A0) ความละเอียด 10-bit (0 - 1023)',
            'q_3': 'analogRead(pin)',
            'q_4': 'ไม่สามารถใช้งานอ่านค่า ADCได้ เมื่อมีการเปิดใช้งาน Wi-Fi',
            'q_5': 'เทียบสัดส่วนแปลงค่า val จากช่วง 0-4095 ให้เป็นช่วงเปอร์เซ็นต์ 0-100',
            'q_6': 'map(val, 0, 1023, 0, 100)',
            'q_7': 'เมื่อความเข้มแสงสูงขึ้น ค่าความต้านทานจะลดลง ส่งผลให้แรงดันเอาต์พุตในวงจรแบ่งแรงดันเปลี่ยนแปลง',
            'q_8': 'วัดความต้านทานไฟฟ้า (Resistance) ระหว่างแท่งโลหะผ่านน้ำและแร่ธาตุในดิน',
            'q_9': 'เกิดการกัดกร่อนของแท่งโลหะ (Corrosion) จากปฏิกิริยาอิเล็กโทรลิซิสเมื่อมีกระแสไหลผ่าน',
            'q_10': 'วงจรและแผ่นอิเล็กโทรดถูกเคลือบฉนวน ไม่สัมผัสเนื้อดินและน้ำโดยตรง จึงทนต่อการกัดกร่อน',
            'q_11': 'ให้ระดับแรงดันไฟฟ้าเปลี่ยนแปลงต่อเนื่องตามระดับความเข้มข้นของก๊าซที่ตรวจจับได้',
            'q_12': 'ค่าแรงดันไฟ/ค่า ADC มักจะลดต่ำลง (หรือเข้าใกล้ 0) เนื่องจากดินมีความต้านทานต่ำลง',
            'q_13': 'Vin = (adcValue / 4095.0) * 3.3',
            'q_14': 'อ่านค่าจาก ADC หลายๆ ครั้งติดต่อกันแล้วนำมาหาค่าเฉลี่ย (Averaging / Oversampling)'
        }
    },
    'Install_Setting': {
        'title': 'แบบทดสอบ: การติดตั้งใช้งาน Arduino IDE, VS Code PlatformIO และการอัปโหลดโค้ด ESP32/ESP8266',
        'keys': {
            'q_0': 'ล่ามแปลงภาษา C/C++ ให้เป็นภาษาเครื่อง (.hex/binary)',
            'q_1': 'PlatformIO IDE',
            'q_2': 'Python (เวอร์ชัน 3.5 ขึ้นไป)',
            'q_3': 'File > Preferences ในช่อง "Additional Boards Manager URLs"',
            'q_4': 'ไปที่เมนู Tools > Board > Boards Manager แล้วค้นหาคำว่า "esp32" เพื่อกด Install',
            'q_5': 'platformio.ini',
            'q_6': 'โฟลเดอร์ src ไฟล์ main.cpp',
            'q_7': '#include <Arduino.h>',
            'q_8': 'ตรวจสอบความถูกต้องของโค้ดและคอมไพล์เป็นภาษาเครื่องโดยยังไม่อัปโหลดลงบอร์ด',
            'q_9': 'กดปุ่ม BOOT (หรือ IO0) บนบอร์ดค้างไว้ขณะที่โปรแกรมเริ่มการอัปโหลด (Connecting...)',
            'q_10': 'ไอคอนรูปเครื่องหมายถูก (Checkmark)',
            'q_11': 'Tools > Port',
            'q_12': 'ต้องทำการติดตั้งไดรเวอร์ (Driver) เพื่อให้คอมพิวเตอร์มองเห็นพอร์ตสื่อสาร (COM Port)',
            'q_13': 'เพื่อให้แสดงผลข้อความออกทางหน้าจอ Serial Monitor ได้อย่างถูกต้อง อ่านไม่เป็นขยะตัวอักษร',
            'q_14': 'monitor_speed = 115200'
        }
    }
}

def ensure_data_store():
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(SUBMISSIONS_FILE):
        with open(SUBMISSIONS_FILE, 'w', encoding='utf-8') as f:
            json.dump([], f)
    if not os.path.exists(BEHAVIOR_LOG_FILE):
        with open(BEHAVIOR_LOG_FILE, 'w', encoding='utf-8') as f:
            json.dump([], f)
    if not os.path.exists(SETTINGS_FILE):
        with open(SETTINGS_FILE, 'w', encoding='utf-8') as f:
            json.dump({}, f)

def read_json(path):
    try:
        if os.path.exists(path):
            with open(path, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception:
        pass
    return []

def write_json(path, data):
    try:
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Error writing {path}: {e}")

class ExamRequestHandler(BaseHTTPRequestHandler):
    def _send_json(self, data, code=200):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        ensure_data_store()
        parsed = urllib.parse.urlparse(self.path)
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length).decode('utf-8') if content_length > 0 else '{}'
        try:
            body = json.loads(post_data)
        except Exception:
            body = {}

        if parsed.path == '/api/check-student':
            student_id = str(body.get('studentId', '')).strip()
            exam_type = body.get('examType', '')
            submissions = read_json(SUBMISSIONS_FILE)
            already = any(s.get('studentId') == student_id and (not exam_type or s.get('examType') == exam_type) for s in submissions)
            self._send_json({
                'submitted': already,
                'message': f"รหัสประจำตัว {student_id} เคยส่งแบบทดสอบนี้ไปแล้ว (ส่งได้เพียงครั้งเดียว)" if already else ''
            })
            return

        if parsed.path == '/api/process-quiz':
            student_id = str(body.get('studentId', '')).strip()
            student_name = body.get('studentName', 'ไม่ได้ระบุชื่อ')
            student_room = body.get('studentRoom', 'ไม่ได้ระบุห้อง')
            exam_type = body.get('examType', 'exam_wifi')

            if not student_id:
                self._send_json({'success': False, 'message': 'กรุณาระบุรหัสประจำตัวผู้เข้าสอบ'}, 400)
                return

            submissions = read_json(SUBMISSIONS_FILE)
            if any(s.get('studentId') == student_id and s.get('examType') == exam_type for s in submissions):
                self._send_json({
                    'success': False,
                    'alreadySubmitted': True,
                    'message': f"รหัสประจำตัว {student_id} ได้ส่งคำตอบไปแล้ว ไม่อนุญาตให้ส่งซ้ำครับ"
                })
                return

            exam_meta = QUIZ_ANSWER_KEYS.get(exam_type, QUIZ_ANSWER_KEYS['exam_wifi'])
            answers_key = exam_meta['keys']
            score = sum(1 for i in range(15) if body.get(f'q_{i}') == answers_key.get(f'q_{i}'))

            record = {
                'id': str(int(datetime.now().timestamp() * 1000)),
                'timestamp': datetime.now().isoformat(),
                'formattedTime': datetime.now().strftime('%d/%m/%Y %H:%M:%S'),
                'examType': exam_type,
                'examTitle': exam_meta['title'],
                'studentId': student_id,
                'studentName': student_name,
                'studentRoom': student_room,
                'score': score,
                'total': 15,
                'scoreString': f"{score} / 15"
            }
            submissions.append(record)
            write_json(SUBMISSIONS_FILE, submissions)
            print(f"[Exam Submitted] {student_name} ({student_id}) - {exam_meta['title']} -> {score}/15")
            self._send_json({
                'success': True,
                'score': score,
                'total': 15,
                'studentName': student_name,
                'studentRoom': student_room
            })
            return

        if parsed.path == '/api/log-behavior':
            logs = read_json(BEHAVIOR_LOG_FILE)
            entry = {
                'id': str(int(datetime.now().timestamp() * 1000)),
                'timestamp': datetime.now().isoformat(),
                'formattedTime': datetime.now().strftime('%d/%m/%Y %H:%M:%S'),
                'examType': body.get('examType', 'general'),
                'studentId': body.get('studentId', 'ไม่ระบุ ID'),
                'studentName': body.get('studentName', 'ไม่ระบุชื่อ'),
                'studentRoom': body.get('studentRoom', 'ไม่ระบุห้อง'),
                'actionType': body.get('actionType', 'Unknown Alert'),
                'count': body.get('count', 1)
            }
            logs.append(entry)
            write_json(BEHAVIOR_LOG_FILE, logs)
            self._send_json({'success': True, 'message': 'Log recorded'})
            return

        if parsed.path == '/api/settings':
            exam_type = body.get('examType')
            if not exam_type:
                self._send_json({'success': False, 'message': 'Missing examType'}, 400)
                return
            settings = read_json(SETTINGS_FILE)
            if not isinstance(settings, dict):
                settings = {}
            settings[exam_type] = {
                'sheetUrl': body.get('sheetUrl', ''),
                'sheetId': body.get('sheetId', ''),
                'updatedAt': datetime.now().isoformat()
            }
            write_json(SETTINGS_FILE, settings)
            self._send_json({'success': True, 'settings': settings[exam_type]})
            return

        if parsed.path == '/api/clear-data':
            write_json(SUBMISSIONS_FILE, [])
            write_json(BEHAVIOR_LOG_FILE, [])
            self._send_json({'success': True, 'message': 'Database reset successfully'})
            return

        self._send_json({'error': 'Not found'}, 404)

    def do_GET(self):
        ensure_data_store()
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        if path == '/api/settings':
            self._send_json(read_json(SETTINGS_FILE) if isinstance(read_json(SETTINGS_FILE), dict) else {})
            return

        if path == '/api/code':
            exam_type = query.get('exam', ['exam_wifi'])[0]
            sheet_id = query.get('sheetId', [''])[0]
            if not sheet_id:
                settings = read_json(SETTINGS_FILE)
                if isinstance(settings, dict) and exam_type in settings:
                    sheet_id = settings[exam_type].get('sheetId', '')
            if not sheet_id:
                sheet_id = 'ใส่_ID_ของ_GOOGLE_SHEETS_ตรงนี้'

            code_path = os.path.join(ROOT_DIR, exam_type, 'Code.gs')
            if not os.path.exists(code_path):
                self.send_response(404)
                self.send_header('Content-Type', 'text/plain; charset=utf-8')
                self.end_headers()
                self.wfile.write('404 Not Found'.encode('utf-8'))
                return

            with open(code_path, 'r', encoding='utf-8') as f:
                code_content = f.read()

            import re
            code_content = re.sub(r'const\s+SPREADSHEET_ID\s*=\s*["\'][^"\']*["\'];?', f'const SPREADSHEET_ID = "{sheet_id}";', code_content)
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(code_content.encode('utf-8'))
            return

        if path == '/api/submissions':
            self._send_json(read_json(SUBMISSIONS_FILE))
            return

        if path == '/api/behavior-logs':
            self._send_json(read_json(BEHAVIOR_LOG_FILE))
            return

        # Static files
        if path in ('/', ''):
            rel_path = 'index.html'
        elif path in ('/exam_wifi', '/exam_wifi/'):
            rel_path = os.path.join('exam_wifi', 'Index.html')
        elif path in ('/exam_websocket', '/exam_websocket/'):
            rel_path = os.path.join('exam_websocket', 'Index.html')
        elif path in ('/exam_digitalpin_digitalsensor', '/exam_digitalpin_digitalsensor/'):
            rel_path = os.path.join('exam_digitalpin_digitalsensor', 'Index.html')
        elif path in ('/exam_analogpin_analogsensor', '/exam_analogpin_analogsensor/'):
            rel_path = os.path.join('exam_analogpin_analogsensor', 'Index.html')
        elif path.lower() in ('/install_setting', '/install_setting/'):
            rel_path = os.path.join('Install_Setting', 'Index.html')
        else:
            rel_path = path.lstrip('/')

        file_path = os.path.join(ROOT_DIR, rel_path)
        if os.path.isdir(file_path):
            file_path = os.path.join(file_path, 'Index.html')
            if not os.path.exists(file_path):
                file_path = os.path.join(os.path.dirname(file_path), 'index.html')

        if not os.path.exists(file_path) or not os.path.isfile(file_path):
            self.send_response(404)
            self.send_header('Content-Type', 'text/plain; charset=utf-8')
            self.end_headers()
            self.wfile.write('404 ไม่พบหน้าที่ต้องการ'.encode('utf-8'))
            return

        mime_type, _ = mimetypes.guess_type(file_path)
        if not mime_type:
            mime_type = 'text/plain; charset=utf-8'
        elif mime_type.startswith('text/') or mime_type in ('application/javascript', 'application/json'):
            mime_type += '; charset=utf-8'

        self.send_response(200)
        self.send_header('Content-Type', mime_type)
        self.end_headers()
        with open(file_path, 'rb') as f:
            self.wfile.write(f.read())

def run():
    ensure_data_store()
    server_address = ('', PORT)
    httpd = HTTPServer(server_address, ExamRequestHandler)
    print(f"🚀 [Python Exam Server] Running at http://localhost:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")

if __name__ == '__main__':
    run()
