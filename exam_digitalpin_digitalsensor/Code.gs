// ==========================================
// แบบทดสอบเรื่อง Digital Pin, Switch, Relay และ DHT Sensor
// Backend Google Apps Script (Code.gs)
// ==========================================

// 1. ฟังก์ชันเปิดหน้าเว็บข้อสอบเข้าคู่กับ Index.html แบบพิมพ์ใหญ่พิมพ์เล็กตรงกัน
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('แบบทดสอบ: Digital Pin, Switch, Relay และ DHT Sensor')
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
function createQuizForm() {
  // 1. สร้าง Google Form ใหม่ และเปิดโหมดแบบทดสอบ (Quiz)
  var form = FormApp.create('แบบทดสอบเรื่อง Digital Pin, Switch, Relay และ DHT Sensor');
  form.setIsQuiz(true);
  form.setDescription('แบบทดสอบวัดความรู้จำนวน 15 ข้อ เกี่ยวกับการใช้งาน Digital Input/Output, สวิตช์ปุ่มกด, รีเลย์โมดูล และ DHT Sensor');

  // 2. ข้อมูลข้อสอบ ตัวเลือก เฉลย และคำอธิบายเฉลย
  var questions = [
    {
      title: '1. คำสั่งใดที่ใช้สำหรับกำหนดให้พิน GPIO ของไมโครคอนโทรลเลอร์ทำหน้าที่เป็นพินส่งสัญญาณส่งออก (Digital Output)?',
      choices: ['ก. digitalWrite(GPIO, OUTPUT);', 'ข. pinMode(GPIO, OUTPUT);', 'ค. pinMode(GPIO, INPUT);', 'ง. digitalRead(GPIO, OUTPUT);'],
      answer: 1,
      feedback: 'เฉลย ข. pinMode(GPIO, OUTPUT); - การตั้งค่าโหมดการทำงานของพิน ต้องใช้ฟังก์ชัน pinMode(GPIO, OUTPUT); ก่อนการใช้งาน'
    },
    {
      title: '2. พิน GPIO กลุ่มใดบนบอร์ด ESP32 ที่ทำหน้าที่เป็น Input Only (รับสัญญาณได้อย่างเดียว ไม่สามารถกำหนดเป็น Output ได้)?',
      choices: ['ก. GPIO 0, 2, 4, 5', 'ข. GPIO 6, 7, 8, 9', 'ค. GPIO 12, 13, 14, 15', 'ง. GPIO 34, 35, 36, 39'],
      answer: 3,
      feedback: 'เฉลย ง. GPIO 34, 35, 36, 39 - พินกลุ่มนี้บน ESP32 เป็นพินประเภท Input Only ไม่สามารถขับสัญญาณเอาต์พุตได้'
    },
    {
      title: '3. เหตุใดจึงควรหลีกเลี่ยงการนำพิน GPIO 6 ถึง GPIO 11 บนบอร์ด ESP32 มาใช้งานทั่วไป?',
      choices: ['ก. เป็นพินอนาล็อกความละเอียดสูง', 'ข. เชื่อมต่อกับหน่วยความจำ SPI Flash ภายในชิป', 'ค. จ่ายแรงดันไฟฟ้าได้เฉพาะ 5V', 'ง. ทำหน้าที่เป็นพินรับสัญญาณอนาล็อกเท่านั้น'],
      answer: 1,
      feedback: 'เฉลย ข. เชื่อมต่อกับหน่วยความจำ SPI Flash ภายในชิป - พินกลุ่มนี้ต่อกับ SPI Flash ภายในชิป หากนำมาใช้งานอาจทำให้ระบบค้าง'
    },
    {
      title: '4. ฟังก์ชันใดที่ใช้สำหรับอ่านค่าสถานะดิจิทัล (HIGH/LOW) จากพินอินพุต?',
      choices: ['ก. digitalRead(GPIO);', 'ข. analogRead(GPIO);', 'ค. digitalWrite(GPIO);', 'ง. pinRead(GPIO);'],
      answer: 0,
      feedback: 'เฉลย ก. digitalRead(GPIO); - ใช้สำหรับอ่านค่าสถานะดิจิทัล (HIGH หรือ LOW) จากพินที่กำหนด'
    },
    {
      title: '5. ในวงจรสวิตช์ปุ่มกดที่มีการต่อตัวต้านทานแบบ Pull-down ไว้ เมื่อยังไม่ได้กดปุ่ม พินอินพุตจะอ่านค่าได้สถานะใด?',
      choices: ['ก. HIGH (3.3V)', 'ข. LOW (0V / GND)', 'ค. Floating (ไม่แน่นอน)', 'ง. Analog'],
      answer: 1,
      feedback: 'เฉลย ข. LOW (0V / GND) - วงจร Pull-down จะดึงแรงดันลง GND (LOW) เมื่อไม่ได้กดสวิตช์'
    },
    {
      title: '6. หากตั้งค่า pinMode(buttonPin, INPUT_PULLUP); ในโปรแกรม และต่อสวิตช์ปุ่มกดลง GND เมื่อกดปุ่ม ค่าที่อ่านได้จาก digitalRead() จะเป็นอย่างไร?',
      choices: ['ก. สถานะ HIGH', 'ข. สถานะ LOW', 'ค. สถานะ Floating', 'ง. ไม่สามารถอ่านค่าได้'],
      answer: 1,
      feedback: 'เฉลย ข. สถานะ LOW -INPUT_PULLUP จะดึงพินเป็น HIGH เมื่อปล่อยปุ่ม และเมื่อกดปุ่มลง GND ค่าจะเปลี่ยนเป็น LOW'
    },
    {
      title: '7. ขนาดของตัวต้านทานภายนอกที่นิยมนำมาต่อเป็น Pull-up หรือ Pull-down resistor ร่วมกับสวิตช์ปุ่มกดคือเท่าใด?',
      choices: ['ก. 10 Ohm', 'ข. 330 Ohm', 'ค. 10k Ohm (10,000 Ohm)', 'ง. 1M Ohm'],
      answer: 2,
      feedback: 'เฉลย ค. 10k Ohm - เป็นขนาดตัวต้านทานมาตรฐานที่นิยมใช้รักษาระดับแรงดันลอจิกให้เสถียร'
    },
    {
      title: '8. ขั้วเชื่อมต่อสำหรับฝั่งไฟฟ้าแรงสูง (Mains Voltage) บน Relay Module ประกอบด้วยขั้วใดบ้าง?',
      choices: ['ก. VCC, GND, IN', 'ข. COM, NO, NC', 'ค. RX, TX, EN', 'ง. ADC, DAC, PWM'],
      answer: 1,
      feedback: 'เฉลย ข. COM, NO, NC - ขั้วไฟสูงของรีเลย์ประกอบด้วย Common, Normally Open และ Normally Closed'
    },
    {
      title: '9. ในการต่อใช้งานรีเลย์แบบ Normally Open (NO) หากโมดูลเป็นแบบ Active LOW การส่งสัญญาณ LOW จากบอร์ดควบคุมจะเกิดผลอย่างไร?',
      choices: ['ก. หน้าสัมผัสเปิด ตัดกระแสไฟฟ้า', 'ข. หน้าสัมผัสต่อกัน (ปิดวงจร) กระแสไฟฟ้าไหลผ่านได้', 'ค. เกิดการลัดวงจร', 'ง. รีเลย์หยุดทำงานทันที'],
      answer: 1,
      feedback: 'เฉลย ข. หน้าสัมผัสต่อกัน (ปิดวงจร) กระแสไฟฟ้าไหลผ่านได้ - การส่งสัญญาณ LOW ใน Active LOW จะสั่งให้รีเลย์ทำงาน ทำให้ NO เชื่อมกับ COM'
    },
    {
      title: '10. พิน JD-VCC บนโมดูลรีเลย์ทำหน้าที่อะไร?',
      choices: ['ก. รับสัญญาณอินพุตจากเซนเซอร์', 'ข. จ่ายไฟเลี้ยงขดลวดแม่เหล็กไฟฟ้าของรีเลย์ (Relay Electromagnet)', 'ค. จ่ายไฟเลี้ยงตัวต้านทานของสวิตช์', 'ง. ใช้สำหรับอัปโหลดเฟิร์มแวร์'],
      answer: 1,
      feedback: 'เฉลย ข. จ่ายไฟเลี้ยงขดลวดแม่เหล็กไฟฟ้าของรีเลย์ - ใช้จ่ายไฟแยกขดลวดแม่เหล็กไฟฟ้าออกจากบอร์ดควบคุม'
    },
    {
      title: '11. อุปกรณ์ใดในโมดูลรีเลย์ที่ช่วยทำหน้าที่แยกวงจรไฟฟ้าแรงสูงออกจากวงจรไมโครคอนโทรลเลอร์ด้วยแสง?',
      choices: ['ก. Transistor', 'ข. Capacitor', 'ค. Optocoupler', 'ง. Diode'],
      answer: 2,
      feedback: 'เฉลย ค. Optocoupler - ทำหน้าที่แยกวงจรทางไฟฟ้าด้วยสัญญาณแสงเพื่อป้องกันแรงดันกระชาก'
    },
    {
      title: '12. ข้อใดเปรียบเทียบคุณสมบัติระหว่างเซนเซอร์ DHT11 และ DHT22 ได้ถูกต้อง?',
      choices: ['ก. DHT11 มีความแม่นยำและช่วงการวัดกว้างกว่า DHT22', 'ข. DHT22 มีความแม่นยำสูงกว่า และช่วงการวัดกว้างกว่า DHT11', 'ค. ทั้งคู่มีความแม่นยำและช่วงการวัดเท่ากันทุกประการ', 'ง. DHT11 อ่านค่าได้ทุก 2 วินาที ส่วน DHT22 อ่านค่าได้ทุก 1 วินาที'],
      answer: 1,
      feedback: 'เฉลย ข. DHT22 มีความแม่นยำสูงกว่า และช่วงการวัดกว้างกว่า DHT11 - DHT22 มีความแม่นยำสูงกว่า และช่วงวัดกว้างกว่าทั้งอุณหภูมิและความชื้น'
    },
    {
      title: '13. ในการต่อเซนเซอร์ DHT11/DHT22 ควรต่อตัวต้านทาน Pull-up ขนาดเท่าใดเข้ากับสายข้อมูล (Data Pin)?',
      choices: ['ก. 220 Ohm', 'ข. 1k Ohm', 'ค. 10k Ohm', 'ง. 1M Ohm'],
      answer: 2,
      feedback: 'เฉลย ค. 10k Ohm - สายสัญญาณ Data ของ DHT จำเป็นต้องต่อ Pull-up resistor ขนาด 10k Ohm เพื่อความเสถียร'
    },
    {
      title: '14. ฟังก์ชันใดในไลบรารี Adafruit DHT ที่ใช้สำหรับอ่านค่าอุณหภูมิในหน่วยองศาเซลเซียส?',
      choices: ['ก. dht.getTemp();', 'ข. dht.readTemperature();', 'ค. dht.readHumidity();', 'ง. dht.getCelsius();'],
      answer: 1,
      feedback: 'เฉลย ข. dht.readTemperature(); - เป็นคำสั่งสำหรับอ่านค่าอุณหภูมิองศาเซลเซียสจากไลบรารี Adafruit DHT'
    },
    {
      title: '15. ฟังก์ชันใดที่นิยมนำมาใช้ตรวจสอบว่าการอ่านค่าจากเซนเซอร์ DHT ล้มเหลวหรือไม่ (เช่น อ่านค่าไม่ได้ตัวเลข / Nan)?',
      choices: ['ก. isnan()', 'ข. isError()', 'ค. isNull()', 'ง. checkDHT()'],
      answer: 0,
      feedback: 'เฉลย ก. isnan() - ฟังก์ชัน Is Not a Number ใช้ตรวจจับค่า Nan เพื่อเช็กว่าการอ่านค่าล้มเหลวหรือไม่'
    }
  ];

  // 3. วนลูปสร้างคำถามและกำหนดเฉลยลงใน Google Form
  for (var i = 0; i < questions.length; i++) {
    var q = questions[i];
    var item = form.addMultipleChoiceItem();
    item.setTitle(q.title)
        .setPoints(1); // กำหนดคะแนนข้อละ 1 คะแนน

    var choicesList = [];
    for (var j = 0; j < q.choices.length; j++) {
      var isCorrect = (j === q.answer);
      choicesList.push(item.createChoice(q.choices[j], isCorrect));
    }
    item.setChoices(choicesList);

    // กำหนดคำอธิบายเฉลย
    if (q.feedback) {
      var feedbackObj = FormApp.createFeedbackBuilder()
        .setText(q.feedback)
        .build();
      item.setFeedbackForCorrect(feedbackObj);
      item.setFeedbackForIncorrect(feedbackObj);
    }
  }

  // 4. แสดงผล URL ฟอร์มที่สร้างขึ้นใน Logger
  Logger.log('=== สร้างข้อสอบเรียบร้อยแล้ว ===');
  Logger.log('URL สำหรับแก้ไขฟอร์ม: ' + form.getEditUrl());
  Logger.log('URL สำหรับส่งให้ผู้เรียนทำแบบทดสอบ: ' + form.getPublishedUrl());
}
