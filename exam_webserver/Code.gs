// ==========================================
// แบบทดสอบ ESP32/ESP8266 Web Server, WebSocket & LittleFS
// Backend Google Apps Script (Code.gs)
// ==========================================

// 1. ฟังก์ชันเปิดหน้าเว็บข้อสอบเข้าคู่กับ Index.html แบบพิมพ์ใหญ่พิมพ์เล็กตรงกัน
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('แบบทดสอบ: ESP32/ESP8266 Web Server, WebSocket & LittleFS')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

// ⚠️ เปลี่ยน ID ของ Google Sheets ของคุณตรงนี้ (คัดลอกมาจาก URL ของแผ่นงาน)
const SPREADSHEET_ID = "ใส่_ID_ของ_GOOGLE_SHEETS_ตรงนี้"; 

// 2. ฟังก์ชันตรวจสอบว่ารหัสนักเรียนเคยส่งข้อสอบแล้วหรือไม่ (เช็คส่งได้ครั้งเดียว)
function checkStudentSubmitted(studentId) {
  try {
    if (!studentId || String(studentId).trim() === "") {
      return { submitted: false };
    }
    var cleanId = String(studentId).trim();
    if (SPREADSHEET_ID && SPREADSHEET_ID !== "ใส่_ID_ของ_GOOGLE_SHEETS_ตรงนี้") {
      var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      var responseSheet = ss.getSheetByName("Responses");
      if (responseSheet) {
        var lastRow = responseSheet.getLastRow();
        if (lastRow > 1) {
          // ดึงข้อมูลคอลัมน์ที่ 2 (รหัสประจำตัว) จากแถวที่ 2 เป็นต้นไป
          var ids = responseSheet.getRange(2, 2, lastRow - 1, 1).getValues();
          for (var i = 0; i < ids.length; i++) {
            if (String(ids[i][0]).trim() === cleanId) {
              return {
                submitted: true,
                message: "รหัสประจำตัว " + cleanId + " เคยส่งแบบทดสอบไปแล้ว (อนุญาตให้ส่งได้เพียงครั้งเดียว)"
              };
            }
          }
        }
      }
    }
    return { submitted: false };
  } catch (e) {
    return { submitted: false, error: e.toString() };
  }
}

// 3. ฟังก์ชันประมวลผลคำตอบและบันทึกคะแนน
function processQuiz(params) {
  try {
    var studentId = String(params.studentId || "").trim();
    var studentName = params.studentName || "ไม่ได้ระบุชื่อ";
    var studentRoom = params.studentRoom || "ไม่ได้ระบุห้อง";
    var timestamp = new Date();
    
    if (!studentId) {
      return { success: false, message: "กรุณาระบุรหัสประจำตัวผู้เข้าสอบ" };
    }

    // ตรวจสอบการส่งซ้ำในระบบชีต Responses
    if (SPREADSHEET_ID && SPREADSHEET_ID !== "ใส่_ID_ของ_GOOGLE_SHEETS_ตรงนี้") {
      var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      var responseSheet = ss.getSheetByName("Responses");
      if (responseSheet) {
        var lastRow = responseSheet.getLastRow();
        if (lastRow > 1) {
          var existingIds = responseSheet.getRange(2, 2, lastRow - 1, 1).getValues();
          for (var r = 0; r < existingIds.length; r++) {
            if (String(existingIds[r][0]).trim() === studentId) {
              return {
                success: false,
                alreadySubmitted: true,
                message: "รหัสประจำตัว " + studentId + " ได้ส่งคำตอบไปแล้ว ไม่อนุญาตให้ส่งซ้ำครับ"
              };
            }
          }
        }
      }
    }
    
    // คลังเฉลยข้อสอบ 15 ข้อ สำหรับตรวจผลคะแนนแบบอัตโนมัติเรียลไทม์
    var answersKey = {
      "q_0": "WebSocket",
      "q_1": "LittleFS",
      "q_2": "GET ส่งคำขอ/รับข้อมูลผ่าน URL ส่วน POST ส่งข้อมูลภายใน Request Body",
      "q_3": "WebSocket",
      "q_4": "ESPAsyncWebServer",
      "q_5": "ช่วยให้โค้ดสะอาด เป็นระเบียบ และจัดการทรัพยากรเว็บได้ง่ายขึ้น",
      "q_6": "data",
      "q_7": "เริ่มต้นส่งคำขอผ่าน HTTP Request เพื่อยกระดับการเชื่อมต่อเป็น WebSocket",
      "q_8": "Server-Sent Events (SSE)",
      "q_9": "กระจายการเขียนข้อมูลเพื่อยืดอายุการใช้งานของ Flash Memory",
      "q_10": "LittleFS.exists()",
      "q_11": "JSON หรือ URL-encoded",
      "q_12": "การเลือกใช้อุปกรณ์ที่มี Optical Isolation (Optocoupler) เพื่อแยกวงจรกำลังไฟสูงออกจากไมโครคอนโทรลเลอร์",
      "q_13": "LittleFS Filesystem Uploader Plugin (.vsix)",
      "q_14": "วงจรจะเปิด (ตัดกระแสไฟ) ในสถานะปกติ และจะต่อวงจรเมื่อมีสัญญาณสั่งงาน"
    };
    
    var totalQuestions = 15;
    var score = 0;
    var rowData = [timestamp, studentId, studentName, studentRoom];
    var answersRow = [];
    
    // ลูปตรวจสอบคะแนนข้อสอบทีละข้อ
    for (var i = 0; i < totalQuestions; i++) {
      var studentAnswer = params["q_" + i] || "ไม่ได้ตอบ";
      answersRow.push(studentAnswer);
      
      if (studentAnswer === answersKey["q_" + i]) {
        score++;
      }
    }
    
    // นำคะแนนสุทธิและคำตอบไปเรียงต่อท้ายคอลัมน์ประวัติผู้สอบ
    rowData.push(score + " / " + totalQuestions);
    rowData = rowData.concat(answersRow);
    
    // สั่งบันทึกข้อมูลเข้าชีต Responses (สร้างอัตโนมัติหากยังไม่มี)
    if (SPREADSHEET_ID && SPREADSHEET_ID !== "ใส่_ID_ของ_GOOGLE_SHEETS_ตรงนี้") {
      var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      var responseSheet = ss.getSheetByName("Responses");
      if (!responseSheet) {
        responseSheet = ss.insertSheet("Responses");
        var headers = ["ประทับเวลา", "รหัสประจำตัว", "ชื่อ-นามสกุล", "ห้อง/กลุ่ม", "คะแนนรวม"];
        for (var h = 0; h < totalQuestions; h++) {
          headers.push("ข้อ " + (h + 1));
        }
        responseSheet.appendRow(headers);
      }
      responseSheet.appendRow(rowData);
    }
    
    return {
      success: true,
      score: score,
      total: totalQuestions,
      studentName: studentName,
      studentRoom: studentRoom
    };
  } catch (error) {
    throw new Error("เกิดข้อผิดพลาดในการประมวลผลคำตอบ: " + error.toString());
  }
}

// 4. ฟังก์ชันรับคำตอบตอนกดส่งฟอร์มผ่าน POST Method
function doPost(e) {
  try {
    var result = processQuiz(e.parameter);
    if (result.alreadySubmitted) {
      return HtmlService.createHtmlOutput(
        "<div style='font-family:sans-serif; text-align:center; padding-top:10%; color:#333;'>" +
        "<h2 style='color:#dc3545;'>⚠️ ไม่สามารถส่งคำตอบได้</h2>" +
        "<p style='font-size:1.2em;'>" + result.message + "</p>" +
        "</div>"
      );
    }
    return HtmlService.createHtmlOutput(
      "<div style='font-family:sans-serif; text-align:center; padding-top:10%; color:#333;'>" +
      "<h2 style='color:#28a745;'>🎉 ส่งคำตอบเรียบร้อยแล้ว</h2>" +
      "<p style='font-size:1.2em;'>ระบบได้รับข้อมูลของ <strong>" + result.studentName + " (ห้อง " + result.studentRoom + ")</strong> เรียบร้อยแล้วครับ</p>" +
      "<p style='font-size:1.4em; color:#1b5e20; font-weight:bold;'>คะแนนที่ได้: " + result.score + " / 15</p>" +
      "</div>"
    );
  } catch(error) {
    return HtmlService.createHtmlOutput("<h2 style='color:red;'>เกิดข้อผิดพลาดในการประมวลผลคำตอบ: " + error.toString() + "</h2>");
  }
}

// 5. ฟังก์ชันบันทึกประวัติพฤติกรรมสลับแอป / แคปหน้าจอ
function logBehavior(studentId, studentName, studentRoom, actionType, count) {
  try {
    if (SPREADSHEET_ID && SPREADSHEET_ID !== "ใส่_ID_ของ_GOOGLE_SHEETS_ตรงนี้") {
      var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      var logSheet = ss.getSheetByName("BehaviorLog");
      if (!logSheet) {
        logSheet = ss.insertSheet("BehaviorLog");
        logSheet.appendRow(["ประทับเวลา", "รหัสประจำตัว", "ชื่อ-นามสกุล", "ห้อง/กลุ่ม", "พฤติกรรม/เหตุการณ์", "จำนวนครั้ง"]);
      }
      var timestamp = new Date();
      logSheet.appendRow([timestamp, studentId, studentName, studentRoom, actionType, count]);
    }
    return "บันทึกสำเร็จ";
  } catch(e) {
    return "Error Log: " + e.toString();
  }
}

// =========================================================================
// 6. ฟังก์ชันสร้าง Google Forms Quiz อัตโนมัติ (รันเพื่อสร้าง Google Form ได้ทันที)
// =========================================================================
function createESP32Quiz() {
  // 1. สร้าง Google Form ใหม่
  var form = FormApp.create('แบบทดสอบ ESP32/ESP8266 Web Server, WebSocket & LittleFS');
  form.setDescription('แบบทดสอบวัดความรู้เรื่อง Web Server, WebSocket, LittleFS และการสื่อสารข้อมูลบน ESP32/ESP8266 (จำนวน 15 ข้อ)');
  form.setIsQuiz(true); // กำหนดให้เป็นแบบทดสอบ (Quiz)

  // 2. รายการคำถาม ตัวเลือก และดัชนีข้อที่ถูกต้อง (0 = A, 1 = B, 2 = C, 3 = D)
  var quizData = [
    {
      q: '1. โปรโตคอลใดที่ใช้สร้างการเชื่อมต่อแบบ Full-Duplex สองทางตลอดเวลา บน TCP Connection เดียวกัน?',
      options: ['HTTP GET', 'HTTP POST', 'WebSocket', 'Server-Sent Events (SSE)'],
      correct: 2
    },
    {
      q: '2. ระบบไฟล์ใดที่เข้ามาทดแทน SPIFFS สำหรับจัดเก็บไฟล์บน Flash Memory ของ ESP32/ESP8266?',
      options: ['FAT32', 'LittleFS', 'NTFS', 'EEPROM'],
      correct: 1
    },
    {
      q: '3. ความแตกต่างหลักระหว่าง HTTP GET และ HTTP POST คืออะไร?',
      options: [
        'GET ใช้ส่งข้อมูลปริมาณมากเสมอ ส่วน POST ใช้รับข้อมูลเล็กๆ',
        'GET ส่งคำขอ/รับข้อมูลผ่าน URL ส่วน POST ส่งข้อมูลภายใน Request Body',
        'GET ทำงานได้เฉพาะบน WebSocket เท่านั้น',
        'POST ไม่สามารถใช้งานร่วมกับข้อมูลรูปแบบ JSON ได้'
      ],
      correct: 1
    },
    {
      q: '4. เมื่อต้องการให้อุปกรณ์หลายเครื่องที่เปิดหน้าเว็บควบคุม ESP32 พร้อมกัน อัปเดตสถานะแบบเรียลไทม์ทันที ควรเลือกใช้เทคโนโลยีใด?',
      options: ['HTTP Polling', 'Manual Page Refresh', 'WebSocket', 'Static HTML Form'],
      correct: 2
    },
    {
      q: '5. ในการสร้าง Asynchronous Web Server บน ESP32 นิยมใช้ไลบรารีใดร่วมกับ Arduino IDE?',
      options: ['WiFiClientSecure', 'ESPAsyncWebServer', 'SoftwareSerial', 'EEPROM.h'],
      correct: 1
    },
    {
      q: '6. ข้อใดคือข้อดีของการแยกไฟล์ HTML, CSS และ JavaScript เก็บไว้ใน LittleFS แทนการเขียนรวมในสเกตช์ C++?',
      options: [
        'ทำให้ประมวลผลเร็วขึ้น 100 เท่า',
        'ช่วยให้โค้ดสะอาด เป็นระเบียบ และจัดการทรัพยากรเว็บได้ง่ายขึ้น',
        'ไม่ต้องเชื่อมต่อ WiFi ก็สามารถเปิดเว็บได้',
        'ป้องกันไม่ให้บอร์ด ESP32 รีเซ็ตตัวเอง'
      ],
      correct: 1
    },
    {
      q: '7. โฟลเดอร์ใดในโปรเจกต์ PlatformIO หรือ Arduino IDE ที่ใช้สำหรับเก็บไฟล์เว็บเพื่ออัปโหลดไปยัง LittleFS?',
      options: ['src', 'include', 'data', 'lib'],
      correct: 2
    },
    {
      q: '8. ข้อใดถูกต้องเกี่ยวกับกระบวนการเริ่มต้นเชื่อมต่อของ WebSocket (WebSocket Handshake)?',
      options: [
        'เริ่มต้นส่งข้อมูลผ่าน UDP ก่อนเสมอ',
        'เริ่มต้นส่งคำขอผ่าน HTTP Request เพื่อยกระดับการเชื่อมต่อเป็น WebSocket',
        'ต้องป้อนรหัสผ่าน WPA2 ทุกครั้งที่ส่งข้อมูล',
        'ไม่จำเป็นต้องอ้างอิง IP Address ของ Server'
      ],
      correct: 1
    },
    {
      q: '9. หากต้องการส่งข้อมูลเซนเซอร์จาก ESP8266 ไปยังเว็บเบราว์เซอร์แบบส่งฝ่ายเดียวจาก Server ไปยัง Client (One-way Push) ควรเลือกใช้เทคโนโลยีใด?',
      options: ['Server-Sent Events (SSE)', 'HTTP POST', 'SPIFFS', 'Serial Monitor'],
      correct: 0
    },
    {
      q: '10. คุณสมบัติ Wear-Leveling ใน LittleFS มีประโยชน์อย่างไร?',
      options: [
        'เพิ่มความเร็วของสัญญาณ WiFi',
        'กระจายการเขียนข้อมูลเพื่อยืดอายุการใช้งานของ Flash Memory',
        'เพิ่มขนาด RAM ให้กับไมโครคอนโทรลเลอร์',
        'ช่วยให้อ่านค่าจากเซนเซอร์ได้แม่นยำขึ้น'
      ],
      correct: 1
    },
    {
      q: '11. ในการเขียนข้อมูลลงไฟล์ด้วย LittleFS หากต้องการป้องกันไม่ให้ข้อมูลเก่าถูกเขียนทับเมื่อบอร์ดรีสตาร์ท ควรใช้ฟังก์ชันใดตรวจสอบก่อน?',
      options: ['LittleFS.format()', 'LittleFS.begin()', 'LittleFS.exists()', 'LittleFS.end()'],
      correct: 2
    },
    {
      q: '12. สำหรับการส่งข้อมูลค่าเซนเซอร์จาก ESP32 เข้าสู่บริการ Cloud เช่น ThingSpeak รูปแบบข้อมูลที่นิยมใช้ส่งผ่าน HTTP คืออะไร?',
      options: ['JSON หรือ URL-encoded', 'Binary Executable', 'HTML File', 'Assembly Code'],
      correct: 0
    },
    {
      q: '13. การใช้งาน Relay Module ร่วมกับ ESP32 ข้อใดคือข้อควรระวังเรื่องฮาร์ดแวร์และความปลอดภัย?',
      options: [
        'ใช้ Relay ควบคุมไฟ AC ได้โดยไม่ต้องต่อสายไฟ',
        'การเลือกใช้อุปกรณ์ที่มี Optical Isolation (Optocoupler) เพื่อแยกวงจรกำลังไฟสูงออกจากไมโครคอนโทรลเลอร์',
        'ห้ามต่อ Relay เข้ากับขา GPIO ใดๆ ทั้งสิ้น',
        'ต้องจ่ายไฟ 220V AC เข้าขา GPIO ของ ESP32 โดยตรง'
      ],
      correct: 1
    },
    {
      q: '14. เครื่องมือใดใช้สำหรับอัปโหลดไฟล์จากคอมพิวเตอร์ไปยัง LittleFS บน Arduino IDE 2?',
      options: [
        'LittleFS Filesystem Uploader Plugin (.vsix)',
        'Serial Plotter',
        'Library Manager',
        'Bootloader Flasher'
      ],
      correct: 0
    },
    {
      q: '15. ข้อใดระบุลักษณะของโหมด Normally Open (NO) บน Relay Module ได้ถูกต้อง?',
      options: [
        'วงจรจะเปิด (ตัดกระแสไฟ) ในสถานะปกติ และจะต่อวงจรเมื่อมีสัญญาณสั่งงาน',
        'วงจรจะปิด (ต่อกระแสไฟ) ตลอดเวลาไม่ว่าจะสั่งงานหรือไม่',
        'ช็อตวงจรลง Ground ทันทีที่จ่ายไฟ',
        'ใช้งานได้เฉพาะไฟ DC 3.3V เท่านั้น'
      ],
      correct: 0
    }
  ];

  // 3. วนลูปสร้างข้อสอบแต่ละข้อลงใน Form
  quizData.forEach(function(item) {
    var itemMC = form.addMultipleChoiceItem();
    itemMC.setTitle(item.q)
          .setPoints(1); // กำหนดข้อละ 1 คะแนน

    var choices = item.options.map(function(optionText, index) {
      var isCorrect = (index === item.correct);
      return itemMC.createChoice(optionText, isCorrect);
    });

    itemMC.setChoices(choices);
  });

  // 4. แสดงผลลิงก์สำหรับใช้งานและแก้ไขใน Logger
  Logger.log('=== สร้างแบบทดสอบสำเร็จ! ===');
  Logger.log('URL สำหรับทำแบบทดสอบ (Published Form): ' + form.getPublishedUrl());
  Logger.log('URL สำหรับแก้ไขแบบทดสอบ (Edit Form): ' + form.getEditUrl());
}
