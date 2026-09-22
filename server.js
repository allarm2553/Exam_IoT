/**
 * server.js - Lightweight Local Server for ESP32 Examination Suite
 * Zero External Dependencies (Native Node.js: http, fs, path, url)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const DEFAULT_PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8000;
const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, 'data');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions.json');
const BEHAVIOR_LOG_FILE = path.join(DATA_DIR, 'behavior_logs.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// 1. เฉลยข้อสอบสำหรับแต่ละชุด
const QUIZ_ANSWER_KEYS = {
    exam_wifi: {
        title: "แบบทดสอบ: การใช้งาน Wi-Fi บน ESP32",
        keys: {
            "q_0": "Station (STA)",
            "q_1": "192.168.4.1",
            "q_2": "WiFi.begin(ssid, password)",
            "q_3": "ความเข้มของสัญญาณวิทยุที่ได้รับ",
            "q_4": "-30 dBm",
            "q_5": "เป็นหมายเลขประจำตัวฮาร์ดแวร์ที่ไม่ซ้ำกัน",
            "q_6": "espressif",
            "q_7": "WiFi.config()",
            "q_8": "WL_CONNECTED",
            "q_9": "ไม่ต้องเขียนโค้ดตรวจสอบสถานะใน loop() ตลอดเวลา",
            "q_10": "WiFi.reconnect()",
            "q_11": "ARDUINO_EVENT_WIFI_STA_DISCONNECTED",
            "q_12": "8 ตัวอักษร",
            "q_13": "WiFi.h",
            "q_14": "อ่านค่า IP Address ที่ได้รับจาก Router"
        }
    },
    exam_websocket: {
        title: "แบบทดสอบ: ESP32 Web Server & WebSocket",
        keys: {
            "q_0": "เป็นการสื่อสารที่ค้างไว้ตลอดเวลา ทำให้ส่งข้อมูลสวนกันได้สองทาง",
            "q_1": "WebSocket อัปเดตข้อมูลได้เรียลไทม์โดยไม่ต้องรีเฟรชหน้าจอ",
            "q_2": "HTTP",
            "q_3": "ทั้ง Client และ Server รับส่งข้อมูลพร้อมกันได้ทุกเมื่อ",
            "q_4": "Flash Memory (PROGMEM)",
            "q_5": "AsyncTCP.h",
            "q_6": "ws://",
            "q_7": "สร้างภาระ (Overhead) ให้เซิร์ฟเวอร์และโหลดทรัพยากรซ้ำซ้อน",
            "q_8": "ลบ Client ที่ไม่ทำงานแล้วเพื่อคืนทรัพยากร",
            "q_9": "WS_EVT_CONNECT",
            "q_10": "<meta http-equiv='refresh' content='1'>",
            "q_11": "อัปเดตเฉพาะส่วนที่ต้องการโดยไม่ต้องโหลดหน้าใหม่ทั้งหมด",
            "q_12": "JSON String",
            "q_13": "80",
            "q_14": "การแสดงข้อมูลเซนเซอร์แบบกราฟเรียลไทม์"
        }
    },
    exam_digitalpin_digitalsensor: {
        title: "แบบทดสอบเรื่อง Digital Pin, Switch, Relay และ DHT Sensor",
        keys: {
            "q_0": "pinMode(GPIO, OUTPUT);",
            "q_1": "GPIO 34, 35, 36, 39",
            "q_2": "เชื่อมต่อกับหน่วยความจำ SPI Flash ภายในชิป",
            "q_3": "digitalRead(GPIO);",
            "q_4": "LOW (0V / GND)",
            "q_5": "สถานะ LOW",
            "q_6": "10k Ohm (10,000 Ohm)",
            "q_7": "COM, NO, NC",
            "q_8": "หน้าสัมผัสต่อกัน (ปิดวงจร) กระแสไฟฟ้าไหลผ่านได้",
            "q_9": "จ่ายไฟเลี้ยงขดลวดแม่เหล็กไฟฟ้าของรีเลย์ (Relay Electromagnet)",
            "q_10": "Optocoupler",
            "q_11": "DHT22 มีความแม่นยำสูงกว่า และช่วงการวัดกว้างกว่า DHT11",
            "q_12": "10k Ohm",
            "q_13": "dht.readTemperature();",
            "q_14": "isnan()"
        }
    },
    exam_analogpin_analogsensor: {
        title: "แบบทดสอบเรื่อง Analog Pin, ADC, Sensors และการแปลงสัญญาณอนาล็อก",
        keys: {
            "q_0": "แปลงสัญญาณแรงดันอนาล็อกเป็นค่าตัวเลขดิจิทัลที่ไมโครคอนโทรลเลอร์ประมวลผลได้",
            "q_1": "12-bit (อ่านค่าได้ 0 - 4095)",
            "q_2": "1 พิน (พิน A0) ความละเอียด 10-bit (0 - 1023)",
            "q_3": "analogRead(pin)",
            "q_4": "ไม่สามารถใช้งานอ่านค่า ADCได้ เมื่อมีการเปิดใช้งาน Wi-Fi",
            "q_5": "เทียบสัดส่วนแปลงค่า val จากช่วง 0-4095 ให้เป็นช่วงเปอร์เซ็นต์ 0-100",
            "q_6": "map(val, 0, 1023, 0, 100)",
            "q_7": "เมื่อความเข้มแสงสูงขึ้น ค่าความต้านทานจะลดลง ส่งผลให้แรงดันเอาต์พุตในวงจรแบ่งแรงดันเปลี่ยนแปลง",
            "q_8": "วัดความต้านทานไฟฟ้า (Resistance) ระหว่างแท่งโลหะผ่านน้ำและแร่ธาตุในดิน",
            "q_9": "เกิดการกัดกร่อนของแท่งโลหะ (Corrosion) จากปฏิกิริยาอิเล็กโทรลิซิสเมื่อมีกระแสไหลผ่าน",
            "q_10": "วงจรและแผ่นอิเล็กโทรดถูกเคลือบฉนวน ไม่สัมผัสเนื้อดินและน้ำโดยตรง จึงทนต่อการกัดกร่อน",
            "q_11": "ให้ระดับแรงดันไฟฟ้าเปลี่ยนแปลงต่อเนื่องตามระดับความเข้มข้นของก๊าซที่ตรวจจับได้",
            "q_12": "ค่าแรงดันไฟ/ค่า ADC มักจะลดต่ำลง (หรือเข้าใกล้ 0) เนื่องจากดินมีความต้านทานต่ำลง",
            "q_13": "Vin = (adcValue / 4095.0) * 3.3",
            "q_14": "อ่านค่าจาก ADC หลายๆ ครั้งติดต่อกันแล้วนำมาหาค่าเฉลี่ย (Averaging / Oversampling)"
        }
    },
    Install_Setting: {
        title: "แบบทดสอบ: การติดตั้งใช้งาน Arduino IDE, VS Code PlatformIO และการอัปโหลดโค้ด ESP32/ESP8266",
        keys: {
            "q_0": "ล่ามแปลงภาษา C/C++ ให้เป็นภาษาเครื่อง (.hex/binary)",
            "q_1": "PlatformIO IDE",
            "q_2": "Python (เวอร์ชัน 3.5 ขึ้นไป)",
            "q_3": "File > Preferences ในช่อง \"Additional Boards Manager URLs\"",
            "q_4": "ไปที่เมนู Tools > Board > Boards Manager แล้วค้นหาคำว่า \"esp32\" เพื่อกด Install",
            "q_5": "platformio.ini",
            "q_6": "โฟลเดอร์ src ไฟล์ main.cpp",
            "q_7": "#include <Arduino.h>",
            "q_8": "ตรวจสอบความถูกต้องของโค้ดและคอมไพล์เป็นภาษาเครื่องโดยยังไม่อัปโหลดลงบอร์ด",
            "q_9": "กดปุ่ม BOOT (หรือ IO0) บนบอร์ดค้างไว้ขณะที่โปรแกรมเริ่มการอัปโหลด (Connecting...)",
            "q_10": "ไอคอนรูปเครื่องหมายถูก (Checkmark)",
            "q_11": "Tools > Port",
            "q_12": "ต้องทำการติดตั้งไดรเวอร์ (Driver) เพื่อให้คอมพิวเตอร์มองเห็นพอร์ตสื่อสาร (COM Port)",
            "q_13": "เพื่อให้แสดงผลข้อความออกทางหน้าจอ Serial Monitor ได้อย่างถูกต้อง อ่านไม่เป็นขยะตัวอักษร",
            "q_14": "monitor_speed = 115200"
        }
    }
};

// 2. จัดการไฟล์จัดเก็บข้อมูล (Auto-create data store)
function ensureDataStore() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(SUBMISSIONS_FILE)) {
        fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify([], null, 2), 'utf8');
    }
    if (!fs.existsSync(BEHAVIOR_LOG_FILE)) {
        fs.writeFileSync(BEHAVIOR_LOG_FILE, JSON.stringify([], null, 2), 'utf8');
    }
    if (!fs.existsSync(SETTINGS_FILE)) {
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify({}, null, 2), 'utf8');
    }
}

function readJsonFile(filePath, defaultVal = []) {
    try {
        if (!fs.existsSync(filePath)) return defaultVal;
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data || '[]');
    } catch (e) {
        console.error("Error reading JSON file " + filePath, e);
        return defaultVal;
    }
}

function writeJsonFile(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
        console.error("Error writing JSON file " + filePath, e);
    }
}

// 3. Helper parse JSON Body
function parseRequestBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                if (!body) return resolve({});
                resolve(JSON.parse(body));
            } catch (err) {
                resolve({});
            }
        });
        req.on('error', reject);
    });
}

// 4. Content Type Mapper
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.gs': 'text/plain; charset=utf-8'
};

// 5. สร้าง HTTP Server
const server = http.createServer(async (req, res) => {
    ensureDataStore();
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = decodeURIComponent(parsedUrl.pathname);

    // Enable CORS for flexibility
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // ==========================================
    // API ENDPOINTS
    // ==========================================

    // API: ตรวจสอบสิทธิ์ว่าเคยส่งแล้วหรือไม่
    if (pathname === '/api/check-student' && req.method === 'POST') {
        const body = await parseRequestBody(req);
        const studentId = String(body.studentId || '').trim();
        const examType = body.examType || '';

        if (!studentId) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ submitted: false }));
            return;
        }

        const submissions = readJsonFile(SUBMISSIONS_FILE, []);
        const already = submissions.find(s => s.studentId === studentId && (!examType || s.examType === examType));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            submitted: !!already,
            message: already ? `รหัสประจำตัว ${studentId} เคยส่งแบบทดสอบนี้ไปแล้ว (ส่งได้เพียงครั้งเดียว)` : ''
        }));
        return;
    }

    // API: ส่งและตรวจข้อสอบ (Process Quiz)
    if (pathname === '/api/process-quiz' && req.method === 'POST') {
        const params = await parseRequestBody(req);
        const studentId = String(params.studentId || '').trim();
        const studentName = params.studentName || 'ไม่ได้ระบุชื่อ';
        const studentRoom = params.studentRoom || 'ไม่ได้ระบุห้อง';
        const examType = params.examType || 'exam_wifi';

        if (!studentId) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: 'กรุณาระบุรหัสประจำตัวผู้เข้าสอบ' }));
            return;
        }

        const submissions = readJsonFile(SUBMISSIONS_FILE, []);
        const existing = submissions.find(s => s.studentId === studentId && s.examType === examType);
        if (existing) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                alreadySubmitted: true,
                message: `รหัสประจำตัว ${studentId} ได้ส่งคำตอบไปแล้ว ไม่อนุญาตให้ส่งซ้ำครับ`
            }));
            return;
        }

        const examMeta = QUIZ_ANSWER_KEYS[examType] || QUIZ_ANSWER_KEYS.exam_wifi;
        const answersKey = examMeta.keys;
        const totalQuestions = 15;
        let score = 0;
        const answersDetail = {};

        for (let i = 0; i < totalQuestions; i++) {
            const studentAns = params[`q_${i}`] || 'ไม่ได้ตอบ';
            const correctAns = answersKey[`q_${i}`];
            const isCorrect = studentAns === correctAns;
            if (isCorrect) score++;
            answersDetail[`ข้อ ${i + 1}`] = {
                studentAnswer: studentAns,
                correctAnswer: correctAns,
                isCorrect: isCorrect
            };
        }

        const newRecord = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            formattedTime: new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }),
            examType: examType,
            examTitle: examMeta.title,
            studentId: studentId,
            studentName: studentName,
            studentRoom: studentRoom,
            score: score,
            total: totalQuestions,
            scoreString: `${score} / ${totalQuestions}`,
            answersDetail: answersDetail
        };

        submissions.push(newRecord);
        writeJsonFile(SUBMISSIONS_FILE, submissions);

        console.log(`[Exam Submitted] ${studentName} (${studentId}) - ${examMeta.title} -> Score: ${score}/${totalQuestions}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            score: score,
            total: totalQuestions,
            studentName: studentName,
            studentRoom: studentRoom
        }));
        return;
    }

    // API: บันทึกพฤติกรรมน่าสงสัย (Anti-Cheat Log)
    if (pathname === '/api/log-behavior' && req.method === 'POST') {
        const body = await parseRequestBody(req);
        const logs = readJsonFile(BEHAVIOR_LOG_FILE, []);
        const entry = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            formattedTime: new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }),
            examType: body.examType || 'general',
            studentId: body.studentId || 'ไม่ระบุ ID',
            studentName: body.studentName || 'ไม่ระบุชื่อ',
            studentRoom: body.studentRoom || 'ไม่ระบุห้อง',
            actionType: body.actionType || 'Unknown Alert',
            count: body.count || 1
        };
        logs.push(entry);
        writeJsonFile(BEHAVIOR_LOG_FILE, logs);

        console.warn(`⚠️ [Anti-Cheat Alert] ${entry.studentName} (${entry.studentId}): ${entry.actionType}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Log recorded' }));
        return;
    }

    // API: ดูผลคะแนนการส่งทั้งหมด (สำหรับหน้า Dashboard / Scoreboard)
    if (pathname === '/api/submissions' && req.method === 'GET') {
        const submissions = readJsonFile(SUBMISSIONS_FILE, []);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(submissions));
        return;
    }

    // API: ดูประวัติการแจ้งเตือนพฤติกรรม (Behavior Logs)
    if (pathname === '/api/behavior-logs' && req.method === 'GET') {
        const logs = readJsonFile(BEHAVIOR_LOG_FILE, []);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(logs));
        return;
    }

    // API: บันทึกหรือดึงการตั้งค่า Google Sheet Link สำหรับแต่ละวิชา
    if (pathname === '/api/settings') {
        if (req.method === 'GET') {
            const settings = readJsonFile(SETTINGS_FILE, {});
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(settings));
            return;
        } else if (req.method === 'POST') {
            const body = await parseRequestBody(req);
            const examType = body.examType;
            if (!examType) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: 'Missing examType' }));
                return;
            }
            const settings = readJsonFile(SETTINGS_FILE, {});
            settings[examType] = {
                sheetUrl: body.sheetUrl || '',
                sheetId: body.sheetId || '',
                updatedAt: new Date().toISOString()
            };
            writeJsonFile(SETTINGS_FILE, settings);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, settings: settings[examType] }));
            return;
        }
    }

    // API: ดึงโค้ด Code.gs ที่แทนที่ SPREADSHEET_ID ด้วย Google Sheet ID เรียบร้อยแล้ว
    if (pathname === '/api/code' && req.method === 'GET') {
        const examType = parsedUrl.searchParams.get('exam') || 'exam_wifi';
        let sheetId = parsedUrl.searchParams.get('sheetId');
        
        if (!sheetId) {
            const settings = readJsonFile(SETTINGS_FILE, {});
            sheetId = (settings[examType] && settings[examType].sheetId) ? settings[examType].sheetId : 'ใส่_ID_ของ_GOOGLE_SHEETS_ตรงนี้';
        }

        const codePath = path.join(ROOT_DIR, examType, 'Code.gs');
        if (!fs.existsSync(codePath)) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('404 ไม่พบไฟล์ Code.gs');
            return;
        }

        let codeContent = fs.readFileSync(codePath, 'utf8');
        // แทนที่ const SPREADSHEET_ID = "..." ด้วย ID จริง
        codeContent = codeContent.replace(
            /const\s+SPREADSHEET_ID\s*=\s*["'][^"']*["'];?/,
            `const SPREADSHEET_ID = "${sheetId}";`
        );

        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(codeContent);
        return;
    }

    // API: ล้างข้อมูลคะแนนและ Log สำหรับการสอบรอบใหม่
    if (pathname === '/api/clear-data' && req.method === 'POST') {
        writeJsonFile(SUBMISSIONS_FILE, []);
        writeJsonFile(BEHAVIOR_LOG_FILE, []);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Database reset successfully' }));
        return;
    }

    // ==========================================
    // STATIC FILE SERVING
    // ==========================================

    let relativePath = pathname;
    if (relativePath === '/' || relativePath === '') {
        relativePath = '/index.html';
    } else if (relativePath === '/exam_wifi' || relativePath === '/exam_wifi/') {
        relativePath = '/exam_wifi/Index.html';
    } else if (relativePath === '/exam_websocket' || relativePath === '/exam_websocket/') {
        relativePath = '/exam_websocket/Index.html';
    } else if (relativePath === '/exam_digitalpin_digitalsensor' || relativePath === '/exam_digitalpin_digitalsensor/') {
        relativePath = '/exam_digitalpin_digitalsensor/Index.html';
    } else if (relativePath === '/exam_analogpin_analogsensor' || relativePath === '/exam_analogpin_analogsensor/') {
        relativePath = '/exam_analogpin_analogsensor/Index.html';
    } else if (relativePath.toLowerCase() === '/install_setting' || relativePath.toLowerCase() === '/install_setting/') {
        relativePath = '/Install_Setting/Index.html';
    }

    let filePath = path.join(ROOT_DIR, relativePath);

    // Prevent directory traversal
    if (!filePath.startsWith(ROOT_DIR)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('403 Forbidden');
        return;
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            // Check case insensitivity or Index.html inside directory
            if (stats && stats.isDirectory()) {
                const tryIndex = path.join(filePath, 'Index.html');
                const tryLower = path.join(filePath, 'index.html');
                if (fs.existsSync(tryIndex)) {
                    filePath = tryIndex;
                } else if (fs.existsSync(tryLower)) {
                    filePath = tryLower;
                } else {
                    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                    res.end('404 ไม่พบไฟล์ที่ระบุ');
                    return;
                }
            } else {
                res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('404 ไม่พบไฟล์ที่ระบุ');
                return;
            }
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        fs.readFile(filePath, (readErr, content) => {
            if (readErr) {
                res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('500 Error reading file');
                return;
            }
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        });
    });
});

// เริ่มต้นเปิดเซิร์ฟเวอร์ พร้อมค้นหาพอร์ตที่ว่างอัตโนมัติหาก 8000 ไม่ว่าง
function startServer(port) {
    server.listen(port, '0.0.0.0', () => {
        console.log('');
        console.log('================================================================');
        console.log('🚀 [ESP32 Examination Suite] Local Server กำลังทำงาน');
        console.log('================================================================');
        console.log(`🌐 Dashboard รวมแบบทดสอบ:  http://localhost:${port}`);
        console.log(`📡 แบบทดสอบ Wi-Fi:          http://localhost:${port}/exam_wifi/`);
        console.log(`🔌 แบบทดสอบ WebSocket:     http://localhost:${port}/exam_websocket/`);
        console.log(`📊 Scoreboard & Logs:       http://localhost:${port}#scoreboard`);
        console.log('================================================================');
        console.log('กด Ctrl + C เพื่อหยุดการทำงาน');
        console.log('');
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.warn(`พอร์ต ${port} กำลังถูกใช้งาน กำลังลองพอร์ต ${port + 1}...`);
            startServer(port + 1);
        } else {
            console.error('Server error:', err);
        }
    });
}

ensureDataStore();
startServer(DEFAULT_PORT);
