// ==========================================
// แบบทดสอบเรื่อง OLED, LCD, Library, คำสั่ง และการเชื่อมต่อ
// Backend Google Apps Script (Code.gs)
// ==========================================

// 1. ฟังก์ชันเปิดหน้าเว็บข้อสอบเข้าคู่กับ Index.html แบบพิมพ์ใหญ่พิมพ์เล็กตรงกัน
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('แบบทดสอบ: OLED, LCD, Library, คำสั่ง และการเชื่อมต่อ I2C')
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
      "q_0": "128x64 พิกเซล",
      "q_1": "พิกเซลสามารถเปล่งแสงได้เองโดยไม่ต้องมีหลอด Backlight",
      "q_2": "GPIO 21 (SDA), GPIO 22 (SCL)",
      "q_3": "0x3C และ 0x27",
      "q_4": "Adafruit_SSD1306 และ Adafruit_GFX",
      "q_5": "จอแสดงผลไม่มีขา Reset แยกต่างหาก (ใช้ขารีเซ็ตร่วมกับไมโครคอนโทรลเลอร์)",
      "q_6": "display.display();",
      "q_7": "lcd.backlight();",
      "q_8": "ย้ายเคอร์เซอร์ไปที่คอลัมน์แรก แถวที่สอง",
      "q_9": "8 ตัว",
      "q_10": "display.startscrollright(0x00, 0x0F);",
      "q_11": "ตัวต้านทานปรับค่าได้ (Potentiometer / Trimpot)",
      "q_12": "display.clearDisplay();",
      "q_13": "LCD Image Converter",
      "q_14": "I2C_Scanner"
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
function createDisplayQuizForm() {
  // สร้าง Google Form ใหม่
  var form = FormApp.create("แบบทดสอบเรื่อง OLED, LCD, Library, คำสั่ง และการเชื่อมต่อ");
  
  // ตั้งค่าให้เป็นแบบทดสอบ (Quiz)
  form.setIsQuiz(true);
  form.setDescription("แบบทดสอบประเมินความรู้เกี่ยวกับ OLED SSD1306, LCD 16x2, Library, คำสั่งการใช้งาน และการเชื่อมต่อแบบ I2C จำนวน 15 ข้อ (ข้อละ 1 คะแนน)");

  // ข้อมูลข้อสอบทั้ง 15 ข้อ
  var quizData = [
    {
      title: "1. จอ OLED SSD1306 ขนาด 0.96 นิ้ว ที่นิยมใช้กับ ESP32 มีความละเอียดหน้าจอกี่พิกเซล?",
      choices: [
        { text: "ก) 16x2 พิกเซล", correct: false },
        { text: "ข) 128x32 พิกเซล", correct: false },
        { text: "ค) 128x64 พิกเซล", correct: true },
        { text: "ง) 20x4 พิกเซล", correct: false }
      ],
      feedback: "จอ OLED SSD1306 ขนาด 0.96 นิ้ว มีความละเอียดหน้าจอมาตรฐานเท่ากับ 128x64 พิกเซล"
    },
    {
      title: "2. ข้อใดคือคุณสมบัติเด่นของจอแสดงผล OLED เมื่อเปรียบเทียบกับจอ LCD แบบทั่วไป?",
      choices: [
        { text: "ก) ต้องใช้ไฟเลี้ยงหลอด Backlight ตลอดเวลา", correct: false },
        { text: "ข) พิกเซลสามารถเปล่งแสงได้เองโดยไม่ต้องมีหลอด Backlight", correct: true },
        { text: "ค) บริโภคพลังงานสูงกว่าจอ LCD ทุกกรณี", correct: false },
        { text: "ง) แสดงผลได้เฉพาะตัวอักษรภาษาอังกฤษเท่านั้น", correct: false }
      ],
      feedback: "จอ OLED พิกเซลเปล่งแสงได้เองโดยไม่ต้องใช้หลอด Backlight ทำให้คมชัดและประหยัดพลังงาน"
    },
    {
      title: "3. ขาสัญญาณ I2C พื้นฐาน (Default) สำหรับบอร์ด ESP32 ในการเชื่อมต่อ SDA และ SCL คือ GPIO ใดตามลำดับ?",
      choices: [
        { text: "ก) GPIO 4 (SDA), GPIO 5 (SCL)", correct: false },
        { text: "ข) GPIO 18 (SDA), GPIO 19 (SCL)", correct: false },
        { text: "ค) GPIO 21 (SDA), GPIO 22 (SCL)", correct: true },
        { text: "ง) GPIO 23 (SDA), GPIO 5 (SCL)", correct: false }
      ],
      feedback: "ขา I2C บัสเริ่มต้นของ ESP32 คือ GPIO 21 (SDA) และ GPIO 22 (SCL)"
    },
    {
      title: "4. ค่า I2C Address เริ่มต้นที่นิยมใช้สำหรับจอ OLED SSD1306 และจอ I2C LCD (ชิป PCF8574) คือค่าใดตามลำดับ?",
      choices: [
        { text: "ก) 0x27 และ 0x3C", correct: false },
        { text: "ข) 0x3C และ 0x27", correct: true },
        { text: "ค) 0x3F และ 0x3D", correct: false },
        { text: "ง) 0x00 และ 0xFF", correct: false }
      ],
      feedback: "จอ OLED SSD1306 มักใช้ 0x3C ส่วนจอ I2C LCD (ชิป PCF8574) มักใช้ 0x27"
    },
    {
      title: "5. การเขียนโปรแกรมควบคุมจอ OLED SSD1306 ด้วย Arduino IDE จำเป็นต้องติดตั้ง Library หลักใดบ้าง?",
      choices: [
        { text: "ก) Adafruit_SSD1306 และ Adafruit_GFX", correct: true },
        { text: "ข) LiquidCrystal_I2C และ Wire", correct: false },
        { text: "ค) Adafruit_Sensor และ DHT", correct: false },
        { text: "ง) SSD1306_Simple และ GFXFont", correct: false }
      ],
      feedback: "ต้องใช้ Adafruit_SSD1306 ร่วมกับ Adafruit_GFX ในการควบคุมจอและการวาดกราฟิก"
    },
    {
      title: "6. ในการสร้างออบเจกต์ Adafruit_SSD1306 display(128, 64, &Wire, -1); พารามิเตอร์ -1 มีความหมายอย่างไร?",
      choices: [
        { text: "ก) ไม่ใช้อินเทอร์เฟซ I2C", correct: false },
        { text: "ข) จอแสดงผลไม่มีขา Reset แยกต่างหาก (ใช้ขารีเซ็ตร่วมกับไมโครคอนโทรลเลอร์)", correct: true },
        { text: "ค) กำหนดความสว่างของหน้าจอให้ต่ำที่สุด", correct: false },
        { text: "ง) ปิดการใช้งานฟังก์ชันเลื่อนข้อความ", correct: false }
      ],
      feedback: "พารามิเตอร์ -1 หมายถึงโมดูล OLED ไม่มีขา Reset แยกต่างหาก"
    },
    {
      title: "7. คำสั่งใดของ Library Adafruit_SSD1306 ที่จำเป็นต้องเรียกใช้หลังจากวาดภาพหรือเขียนข้อความ เพื่อให้ข้อมูลแสดงผลบนหน้าจอ OLED?",
      choices: [
        { text: "ก) display.clearDisplay();", correct: false },
        { text: "ข) display.begin();", correct: false },
        { text: "ค) display.display();", correct: true },
        { text: "ง) display.show();", correct: false }
      ],
      feedback: "ต้องเรียกใช้ display.display(); เพื่อส่งข้อมูลจากบัฟเฟอร์ใน RAM ไปแสดงผลบนหน้าจอจริง"
    },
    {
      title: "8. ในการใช้งานจอ I2C LCD ร่วมกับ Library LiquidCrystal_I2C คำสั่งใดใช้สำหรับเปิดไฟพ้นหลัง (Backlight)?",
      choices: [
        { text: "ก) lcd.init();", correct: false },
        { text: "ข) lcd.backlight();", correct: true },
        { text: "ค) lcd.clear();", correct: false },
        { text: "ง) lcd.setCursor(0,0);", correct: false }
      ],
      feedback: "คำสั่ง lcd.backlight(); ใช้สำหรับเปิดไฟ Backlight ของจอ LCD"
    },
    {
      title: "9. คำสั่ง lcd.setCursor(0, 1); สำหรับจอ LCD 16x2 มีผลอย่างไรต่อตำแหน่งเคอร์เซอร์?",
      choices: [
        { text: "ก) ย้ายเคอร์เซอร์ไปที่คอลัมน์แรก แถวแรก", correct: false },
        { text: "ข) ย้ายเคอร์เซอร์ไปที่คอลัมน์แรก แถวที่สอง", correct: true },
        { text: "ค) ย้ายเคอร์เซอร์ไปที่คอลัมน์ที่สอง แถวแรก", correct: false },
        { text: "ง) ย้ายเคอร์เซอร์ไปที่คอลัมน์ที่สอง แถวที่สอง", correct: false }
      ],
      feedback: "ดัชนีเริ่มจาก 0 ดังนั้น (0, 1) คือคอลัมน์แรก (0) และแถวที่สอง (1)"
    },
    {
      title: "10. จอ LCD 16x2 สามารถสร้างและจัดเก็บอักขระพิเศษ (Custom Characters) ลงใน CGRAM ได้สูงสุดกี่ตัวอักษรพร้อมกัน?",
      choices: [
        { text: "ก) 4 ตัว", correct: false },
        { text: "ข) 8 ตัว", correct: true },
        { text: "ค) 16 ตัว", correct: false },
        { text: "ง) 32 ตัว", correct: false }
      ],
      feedback: "หน่วยความจำ CGRAM ของจอ LCD รองรับการสร้างอักขระพิเศษได้สูงสุด 8 ตัว (สล็อต 0 ถึง 7)"
    },
    {
      title: "11. คำสั่งใดใช้สำหรับสั่งให้ข้อความบนจอ OLED SSD1306 เลื่อนจากซ้ายไปขวา?",
      choices: [
        { text: "ก) display.startscrollright(0x00, 0x0F);", correct: true },
        { text: "ข) display.startscrollleft(0x00, 0x0F);", correct: false },
        { text: "ค) lcd.scrollDisplayLeft();", correct: false },
        { text: "ง) lcd.scrollDisplayRight();", correct: false }
      ],
      feedback: "display.startscrollright() เป็นคำสั่งเลื่อนข้อความจากซ้ายไปขวาของ Adafruit_SSD1306"
    },
    {
      title: "12. อุปกรณ์ใดบนบอร์ด I2C LCD Adapter ที่ใช้สำหรับปรับระดับความคมชัด (Contrast) ของตัวอักษร?",
      choices: [
        { text: "ก) สวิตช์ DIP Switch 3 ตำแหน่ง", correct: false },
        { text: "ข) ตัวต้านทานปรับค่าได้ (Potentiometer / Trimpot)", correct: true },
        { text: "ค) จัมเปอร์เลือกระดับแรงดัน 3.3V/5V", correct: false },
        { text: "ง) คริสตัลไทม์มิ่ง", correct: false }
      ],
      feedback: "บอร์ด I2C LCD Adapter มี Potentiometer/Trimpot ตัวต้านทานปรับค่าได้สำหรับปรับ Contrast"
    },
    {
      title: "13. หากต้องการล้างข้อมูลทั้งหมดในบัฟเฟอร์หน้าจอ OLED เพื่อเตรียมเขียนข้อความใหม่ ต้องใช้คำสั่งใด?",
      choices: [
        { text: "ก) display.stopscroll();", correct: false },
        { text: "ข) display.clearDisplay();", correct: true },
        { text: "ค) display.cp437(false);", correct: false },
        { text: "ง) display.reset();", correct: false }
      ],
      feedback: "display.clearDisplay(); ทำหน้าที่ล้างข้อมูลพิกเซลทั้งหมดในบัฟเฟอร์หน้าจอ OLED"
    },
    {
      title: "14. ในการแปลงไฟล์รูปภาพบิตแมปเป็น C Array เพื่อนำไปแสดงผลด้วยคำสั่ง display.drawBitmap() บนจอ OLED นิยมใช้เครื่องมือใดตามบทเรียน?",
      choices: [
        { text: "ก) Adobe Illustrator", correct: false },
        { text: "ข) LCD Image Converter", correct: true },
        { text: "ค) Fritzing", correct: false },
        { text: "ง) AutoCAD", correct: false }
      ],
      feedback: "โปรแกรม LCD Image Converter ใช้สำหรับแปลงรูปภาพเป็น C Array เพื่อใช้วาดรูปบน OLED"
    },
    {
      title: "15. หากต่อสายจอ I2C LCD แล้วหน้าจอไม่แสดงผล ควรใช้สเกตช์ (Sketch) ใดในการตรวจสอบหาค่าตำแหน่ง Address ของอุปกรณ์บนบัส I2C?",
      choices: [
        { text: "ก) OLED_Hello_World", correct: false },
        { text: "ข) I2C_Scanner", correct: true },
        { text: "ค) DHT_Tester", correct: false },
        { text: "ง) SPI_Master_Test", correct: false }
      ],
      feedback: "โค้ด I2C_Scanner ใช้สำหรับสแกนหาค่า I2C Address ของอุปกรณ์ที่เชื่อมต่ออยู่บนบัส I2C"
    }
  ];

  // วนลูปสร้างคำถามแต่ละข้อใน Google Form
  for (var i = 0; i < quizData.length; i++) {
    var data = quizData[i];
    var item = form.addMultipleChoiceItem();
    item.setTitle(data.title)
        .setPoints(1); // กำหนดข้อละ 1 คะแนน
    
    var choices = [];
    for (var j = 0; j < data.choices.length; j++) {
      choices.push(item.createChoice(data.choices[j].text, data.choices[j].correct));
    }
    item.setChoices(choices);

    // ใส่คำอธิบายเฉลยเมื่อตอบถูก/ผิด
    if (data.feedback) {
      var feedbackObj = FormApp.createFeedback().setText(data.feedback).build();
      item.setFeedbackForCorrect(feedbackObj);
      item.setFeedbackForIncorrect(feedbackObj);
    }
  }

  // แสดงผล URL
  Logger.log("สร้างแบบทดสอบเรียบร้อยแล้ว!");
  Logger.log("ลิงก์สำหรับแก้ไขฟอร์ม: " + form.getEditUrl());
  Logger.log("ลิงก์สำหรับส่งให้ผู้เรียนทำข้อสอบ: " + form.getPublishedUrl());
}
