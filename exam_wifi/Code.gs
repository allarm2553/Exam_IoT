// ==========================================
// แบบทดสอบ: การใช้งาน Wi-Fi บน ESP32
// Backend Google Apps Script (Code.gs)
// ==========================================

// 1. ฟังก์ชันเปิดหน้าเว็บข้อสอบเข้าคู่กับ Index.html แบบพิมพ์ใหญ่พิมพ์เล็กตรงกัน
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('แบบทดสอบ: การใช้งาน Wi-Fi บน ESP32')
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
function createESP32WiFiQuiz() {
  var form = FormApp.create('แบบทดสอบ: การใช้งาน Wi-Fi บน ESP32');
  form.setIsQuiz(true)
      .setAllowResponseEdits(false)
      .setShowLinkToRespondAgain(false);

  var questions = [
    {
      q: "โหมดการทำงานใดที่ ESP32 ทำหน้าที่เป็นเหมือนอุปกรณ์ลูกข่ายเพื่อเชื่อมต่อกับ Router?",
      c: ["Access Point (AP)", "Station (STA)", "Web Server", "Dual Mode"],
      a: "Station (STA)"
    },
    {
      q: "เมื่อตั้งค่า ESP32 เป็น Access Point (AP) โดยปกติจะมี IP Address เริ่มต้นคืออะไร?",
      c: ["192.168.1.1", "10.0.0.1", "192.168.4.1", "172.16.0.1"],
      a: "192.168.4.1"
    },
    {
      q: "คำสั่งใดใช้สำหรับการเชื่อมต่อ Wi-Fi ในโหมด Station?",
      c: ["WiFi.softAP(ssid, password)", "WiFi.begin(ssid, password)", "WiFi.connect(ssid, password)", "WiFi.config(ssid, password)"],
      a: "WiFi.begin(ssid, password)"
    },
    {
      q: "RSSI (Received Signal Strength Indicator) ใช้สำหรับวัดค่าอะไร?",
      c: ["ความเร็วในการรับส่งข้อมูล", "ความเข้มของสัญญาณวิทยุที่ได้รับ", "จำนวนอุปกรณ์ที่เชื่อมต่อ", "ระยะเวลาที่เชื่อมต่อได้"],
      a: "ความเข้มของสัญญาณวิทยุที่ได้รับ"
    },
    {
      q: "ค่า RSSI ใดต่อไปนี้แสดงถึงสัญญาณ Wi-Fi ที่มีความแรงมากที่สุด?",
      c: ["-30 dBm", "-50 dBm", "-70 dBm", "-90 dBm"],
      a: "-30 dBm"
    },
    {
      q: "MAC Address ของ ESP32 มีลักษณะเฉพาะอย่างไร?",
      c: ["เป็นหมายเลข IP ที่เปลี่ยนไปตาม Router", "เป็นหมายเลขประจำตัวฮาร์ดแวร์ที่ไม่ซ้ำกัน", "เป็นชื่อที่ผู้ใช้ตั้งขึ้นเองได้อิสระ", "เป็นรหัสผ่านสำหรับเข้าใช้งาน Wi-Fi"],
      a: "เป็นหมายเลขประจำตัวฮาร์ดแวร์ที่ไม่ซ้ำกัน"
    },
    {
      q: "Hostname เริ่มต้นของ ESP32 จากโรงงานคือชื่ออะไร?",
      c: ["esp32-device", "arduino-esp32", "espressif", "smart-home-node"],
      a: "espressif"
    },
    {
      q: "หากต้องการกำหนด IP Address คงที่ (Static IP) ให้กับ ESP32 ต้องใช้คำสั่งใด?",
      c: ["WiFi.setIP()", "WiFi.localIP()", "WiFi.config()", "WiFi.softAPConfig()"],
      a: "WiFi.config()"
    },
    {
      q: "สถานะ (Status) ใดที่บ่งบอกว่า ESP32 เชื่อมต่อกับเครือข่าย Wi-Fi สำเร็จแล้ว?",
      c: ["WL_IDLE_STATUS", "WL_DISCONNECTED", "WL_CONNECTED", "WL_CONNECT_FAILED"],
      a: "WL_CONNECTED"
    },
    {
      q: "ข้อใดคือข้อดีของการใช้ Wi-Fi Events ในการจัดการการเชื่อมต่อใหม่?",
      c: ["ทำให้สัญญาณ Wi-Fi แรงขึ้น", "ไม่ต้องเขียนโค้ดตรวจสอบสถานะใน loop() ตลอดเวลา", "ป้องกันการโดนแฮกข้อมูล", "ช่วยประหยัดหน่วยความจำ Flash"],
      a: "ไม่ต้องเขียนโค้ดตรวจสอบสถานะใน loop() ตลอดเวลา"
    },
    {
      q: "คำสั่งใดใช้สำหรับพยายามเชื่อมต่อกับ Access Point เดิมที่เคยเชื่อมต่อไว้ก่อนหน้า?",
      c: ["WiFi.reconnect()", "WiFi.retry()", "WiFi.begin()", "WiFi.status()"],
      a: "WiFi.reconnect()"
    },
    {
      q: "Event ใดจะเกิดขึ้นเมื่อ ESP32 ในโหมด Station หลุดจากการเชื่อมต่อกับ Router?",
      c: ["ARDUINO_EVENT_WIFI_STA_CONNECTED", "ARDUINO_EVENT_WIFI_STA_GOT_IP", "ARDUINO_EVENT_WIFI_STA_DISCONNECTED", "ARDUINO_EVENT_WIFI_READY"],
      a: "ARDUINO_EVENT_WIFI_STA_DISCONNECTED"
    },
    {
      q: "ในการตั้งค่า Access Point (soft-AP) รหัสผ่านที่กำหนดต้องมีอย่างน้อยกี่ตัวอักษร?",
      c: ["4 ตัวอักษร", "6 ตัวอักษร", "8 ตัวอักษร", "10 ตัวอักษร"],
      a: "8 ตัวอักษร"
    },
    {
      q: "Library พื้นฐานที่จำเป็นต้อง Include ทุกครั้งเมื่อต้องการใช้งาน Wi-Fi บน ESP32 คืออะไร?",
      c: ["ESP8266WiFi.h", "WiFi.h", "WiFiClient.h", "ESP32WiFi.h"],
      a: "WiFi.h"
    },
    {
      q: "ฟังก์ชัน WiFi.localIP() ใช้สำหรับทำหน้าที่อะไรในโหมด Station?",
      c: ["เปลี่ยนหมายเลข IP Address", "อ่านค่า IP Address ที่ได้รับจาก Router", "ค้นหาเครือข่าย Wi-Fi รอบตัว", "ตรวจสอบความแรงของสัญญาณ"],
      a: "อ่านค่า IP Address ที่ได้รับจาก Router"
    }
  ];

  questions.forEach(function(item) {
    var mcItem = form.addMultipleChoiceItem();
    mcItem.setTitle(item.q)
          .setPoints(1);
    
    var choices = item.c.map(function(choice) {
      return mcItem.createChoice(choice, choice === item.a);
    });
    mcItem.setChoices(choices);
  });

  Logger.log('สร้างแบบทดสอบเรียบร้อยแล้ว: ' + form.getEditUrl());
}
