// ==========================================
// แบบทดสอบ: การติดตั้งใช้งาน Arduino IDE, VS Code PlatformIO และการอัปโหลดโค้ด ESP32/ESP8266
// Backend Google Apps Script (Code.gs)
// ==========================================

// 1. ฟังก์ชันเปิดหน้าเว็บข้อสอบเข้าคู่กับ Index.html แบบพิมพ์ใหญ่พิมพ์เล็กตรงกัน
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('แบบทดสอบ: การติดตั้งใช้งาน Arduino IDE, VS Code PlatformIO และการอัปโหลดโค้ด ESP32/ESP8266')
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
function createArduinoIDEAndVSCodeQuiz() {
  var form = FormApp.create('แบบทดสอบ: การติดตั้งใช้งาน Arduino IDE, VS Code PlatformIO และการอัปโหลดโค้ด ESP32/ESP8266');
  form.setIsQuiz(true);
  
  var quizData = [
    {
      q: '1. โปรแกรม Arduino IDE ทำหน้าที่เปรียบเสมือนสิ่งใดในการเขียนโปรแกรมควบคุมไมโครคอนโทรลเลอร์?',
      options: [
        'ระบบปฏิบัติการ (Operating System)',
        'ล่ามแปลงภาษา C/C++ ให้เป็นภาษาเครื่อง (.hex/binary)',
        'ตัวจำลองการทำงานของฮาร์ดแวร์ (Simulator)',
        'แหล่งเก็บข้อมูลบนระบบคลาวด์ (Cloud Storage)'
      ],
      answer: 'ล่ามแปลงภาษา C/C++ ให้เป็นภาษาเครื่อง (.hex/binary)'
    },
    {
      q: '2. หากต้องการใช้งาน VS Code ร่วมกับ PlatformIO IDE ในการพัฒนาโปรเจกต์ขนาดใหญ่ จะต้องติดตั้งส่วนขยาย (Extension) ใดใน VS Code?',
      options: [
        'Arduino Classic',
        'C/C++ Runner',
        'PlatformIO IDE',
        'ESP32 Flash Tool'
      ],
      answer: 'PlatformIO IDE'
    },
    {
      q: '3. ในการโปรแกรม ESP32/ESP8266 ด้วย PlatformIO บนระบบปฏิบัติการ Windows จำเป็นต้องติดตั้งซอฟต์แวร์ภาษาใดในเครื่องคอมพิวเตอร์ก่อน?',
      options: [
        'Java (เวอร์ชัน 1.8 ขึ้นไป)',
        'Python (เวอร์ชัน 3.5 ขึ้นไป)',
        'Node.js',
        'Ruby'
      ],
      answer: 'Python (เวอร์ชัน 3.5 ขึ้นไป)'
    },
    {
      q: '4. การติดตั้งบอร์ด ESP32 หรือ ESP8266 ในโปรแกรม Arduino IDE จะต้องนำ URL ของตัวจัดการบอร์ดไปวางไว้ที่เมนูใดก่อน?',
      options: [
        'File > Preferences ในช่อง "Additional Boards Manager URLs"',
        'Tools > Board > Boards Manager',
        'Sketch > Include Library > Add .ZIP Library',
        'Help > About Arduino'
      ],
      answer: 'File > Preferences ในช่อง "Additional Boards Manager URLs"'
    },
    {
      q: '5. เมื่อเพิ่ม URL ในช่อง Preferences เรียบร้อยแล้ว ขั้นตอนถัดไปในการติดตั้งแพ็กเกจบอร์ด ESP32 บน Arduino IDE คือข้อใด?',
      options: [
        'เปิด Serial Monitor แล้วพิมพ์คำสั่ง install esp32',
        'ไปที่เมนู Tools > Board > Boards Manager แล้วค้นหาคำว่า "esp32" เพื่อกด Install',
        'ไปที่เมนู File > Open แล้วเลือกไฟล์ esp32.json',
        'กดปุ่ม Upload บนแถบเครื่องมือทันที'
      ],
      answer: 'ไปที่เมนู Tools > Board > Boards Manager แล้วค้นหาคำว่า "esp32" เพื่อกด Install'
    },
    {
      q: '6. ไฟล์โครงสร้างหลักที่ใช้ในการกำหนดค่าคอนฟิกของโปรเจกต์ PlatformIO เช่น การเลือกบอร์ด แพลตฟอร์ม และเฟรมเวิร์ก คือไฟล์ใด?',
      options: [
        'main.cpp',
        'platformio.ini',
        'settings.json',
        'Arduino.h'
      ],
      answer: 'platformio.ini'
    },
    {
      q: '7. ในโปรเจกต์ PlatformIO ไฟล์โค้ดหลักภาษา C++ ที่ใช้เขียนฟังก์ชัน setup() และ loop() จะถูกจัดเก็บไว้ในโฟลเดอร์ใดและชื่อไฟล์อะไร?',
      options: [
        'โฟลเดอร์ include ไฟล์ header.h',
        'โฟลเดอร์ src ไฟล์ main.cpp',
        'โฟลเดอร์ lib ไฟล์ library.cpp',
        'โฟลเดอร์ build ไฟล์ firmware.bin'
      ],
      answer: 'โฟลเดอร์ src ไฟล์ main.cpp'
    },
    {
      q: '8. ในการเขียนโค้ดสำหรับ Arduino บน PlatformIO IDE บรรทัดแรกของไฟล์ main.cpp จำเป็นต้องระบุคำสั่งใดเสมอเพื่อใช้งานฟังก์ชันมาตรฐานของ Arduino?',
      options: [
        '#include <WiFi.h>',
        '#include <Arduino.h>',
        '#include <PlatformIO.h>',
        '#define ARDUINO_MAIN'
      ],
      answer: '#include <Arduino.h>'
    },
    {
      q: '9. ปุ่มเครื่องมือ "Verify/Compile" บน Arduino IDE หรือไอคอนรูปเครื่องหมายถูก (Checkmark) มีหน้าที่อะไร?',
      options: [
        'อัปโหลดโค้ดลงบอร์ดไมโครคอนโทรลเลอร์ทันที',
        'ตรวจสอบความถูกต้องของโค้ดและคอมไพล์เป็นภาษาเครื่องโดยยังไม่อัปโหลดลงบอร์ด',
        'ลบข้อมูลทั้งหมดในหน่วยความจำ Flash',
        'รีเซ็ตการทำงานของบอร์ดไมโครคอนโทรลเลอร์'
      ],
      answer: 'ตรวจสอบความถูกต้องของโค้ดและคอมไพล์เป็นภาษาเครื่องโดยยังไม่อัปโหลดลงบอร์ด'
    },
    {
      q: '10. หากพบข้อผิดพลาด "A fatal error occurred: Failed to connect to ESP32: Timed out..." ขณะอัปโหลดโปรแกรมลงบอร์ด ESP32 ควรแก้ไขอย่างไร?',
      options: [
        'เปลี่ยนสาย USB หรือเปลี่ยนคอมพิวเตอร์ทันที',
        'กดปุ่ม BOOT (หรือ IO0) บนบอร์ดค้างไว้ขณะที่โปรแกรมเริ่มการอัปโหลด (Connecting...)',
        'ลบโปรแกรม Arduino IDE แล้วติดตั้งใหม่',
        'แก้ไขโค้ดในฟังก์ชัน loop() ใหม่ทั้งหมด'
      ],
      answer: 'กดปุ่ม BOOT (หรือ IO0) บนบอร์ดค้างไว้ขณะที่โปรแกรมเริ่มการอัปโหลด (Connecting...)'
    },
    {
      q: '11. สัญลักษณ์หรือไอคอนใดบนแถบสถานะด้านล่างของ PlatformIO ที่ใช้สำหรับสั่งคอมไพล์โปรเจกต์ (Build/Compile)?',
      options: [
        'ไอคอนรูปบ้าน (Home)',
        'ไอคอนรูปเครื่องหมายถูก (Checkmark)',
        'ไอคอนรูปลูกศรชี้ไปทางขวา (Upload)',
        'ไอคอนรูปถังขยะ (Clean)'
      ],
      answer: 'ไอคอนรูปเครื่องหมายถูก (Checkmark)'
    },
    {
      q: '12. บน Arduino IDE การเลือกพอร์ตสื่อสารที่เชื่อมต่ออยู่กับบอร์ด ESP32/ESP8266 สามารถตรวจสอบและเลือกได้ที่เมนูใด?',
      options: [
        'Tools > Port',
        'File > Examples',
        'Sketch > Show Sketch Folder',
        'Tools > Programmer'
      ],
      answer: 'Tools > Port'
    },
    {
      q: '13. ชิปแปลงสัญญาณ USB-to-UART Bridge ที่นิยมใช้บนบอร์ด ESP32/ESP8266 เช่น CP2102 หรือ CH340 มีความสำคัญอย่างไรก่อนเริ่มใช้งานอัปโหลดโค้ด?',
      options: [
        'ต้องทำการติดตั้งไดรเวอร์ (Driver) เพื่อให้คอมพิวเตอร์มองเห็นพอร์ตสื่อสาร (COM Port)',
        'ไม่ต้องติดตั้งอะไรเลย เพราะชิปนี้ประมวลผลโค้ด C++ ได้ด้วยตัวเอง',
        'ต้องทำหน้าที่เป็นเสาอากาศรับสัญญาณ WiFi',
        'ใช้สำหรับจ่ายไฟเลี้ยง 12V ให้บอร์ดเท่านั้น'
      ],
      answer: 'ต้องทำการติดตั้งไดรเวอร์ (Driver) เพื่อให้คอมพิวเตอร์มองเห็นพอร์ตสื่อสาร (COM Port)'
    },
    {
      q: '14. การตั้งค่าอัตราเร็วในการสื่อสารของ Serial Monitor ให้ตรงกับที่กำหนดในโค้ด Serial.begin(115200); ทำเพื่อวัตถุประสงค์ใด?',
      options: [
        'เพิ่มความเร็วในการคอมไพล์โปรแกรม',
        'เพื่อให้แสดงผลข้อความออกทางหน้าจอ Serial Monitor ได้อย่างถูกต้อง อ่านไม่เป็นขยะตัวอักษร',
        'เพื่อให้บอร์ดประมวลผลคำสั่งได้เร็วขึ้น 10 เท่า',
        'เพื่อเปิดระบบรับส่งข้อมูลแบบไร้สาย'
      ],
      answer: 'เพื่อให้แสดงผลข้อความออกทางหน้าจอ Serial Monitor ได้อย่างถูกต้อง อ่านไม่เป็นขยะตัวอักษร'
    },
    {
      q: '15. คำสั่งหรือฟังก์ชันใดใน PlatformIO ที่ใช้สำหรับกำหนดค่า Baud Rate ของ Serial Monitor ในไฟล์ platformio.ini?',
      options: [
        'upload_speed = 115200',
        'monitor_speed = 115200',
        'baud_rate = 115200',
        'serial_baud = 115200'
      ],
      answer: 'monitor_speed = 115200'
    }
  ];

  quizData.forEach(function(data) {
    var item = form.addMultipleChoiceItem();
    item.setTitle(data.q);
    var choices = data.options.map(function(opt) {
      return item.createChoice(opt, opt === data.answer);
    });
    item.setChoices(choices).setPoints(1);
  });

  Logger.log('สร้าง Google Form สำเร็จ! URL สำหรับแก้ไข: ' + form.getEditUrl());
}
