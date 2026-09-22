// ==========================================
// แบบทดสอบเรื่อง Analog Pin, ADC, Sensors และการแปลงสัญญาณอนาล็อก
// Backend Google Apps Script (Code.gs)
// ==========================================

// 1. ฟังก์ชันเปิดหน้าเว็บข้อสอบเข้าคู่กับ Index.html แบบพิมพ์ใหญ่พิมพ์เล็กตรงกัน
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('แบบทดสอบ: Analog Pin, ADC, Sensors และการแปลงสัญญาณอนาล็อก')
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
  // 1. สร้าง Google Form ใหม่
  var formTitle = "แบบทดสอบเรื่อง Analog Pin, ADC, Sensors และการแปลงสัญญาณอนาล็อก";
  var form = FormApp.create(formTitle);
  
  // ตั้งค่าให้ Form เป็น แบบทดสอบ (Quiz)
  form.setIsQuiz(true);
  form.setDescription("แบบทดสอบวัดความรู้แบบ 4 ตัวเลือก จำนวน 15 ข้อ\nครอบคลุมเนื้อหา: Analog Pin, ADC, LDR, Moisture Sensor, GAS Sensor, ฟังก์ชัน map() และการแปลงสัญญาณอนาล็อกเป็นดิจิทัล");
  form.setAllowResponseEdits(false);
  form.setCollectEmail(true); // เก็บอีเมลผู้ทำแบบทดสอบ
  
  // 2. ข้อมูลข้อสอบ 15 ข้อ
  var quizData = [
    {
      question: "1. ADC (Analog-to-Digital Converter) มีหน้าที่สำคัญอย่างไรในระบบไมโครคอนโทรลเลอร์?",
      choices: [
        "แปลงสัญญาณดิจิทัลเป็นสัญญาณอนาล็อกเพื่อขับลำโพง",
        "แปลงสัญญาณแรงดันอนาล็อกเป็นค่าตัวเลขดิจิทัลที่ไมโครคอนโทรลเลอร์ประมวลผลได้",
        "เพิ่มแรงดันไฟฟ้าให้กับพินอนาล็อกเพื่อป้องกันสัญญาณรบกวน",
        "แปลงสัญญาณกระแสสลับ (AC) ให้เป็นกระแสตรง (DC)"
      ],
      correctIndex: 1,
      explanation: "ADC ทำหน้าที่แปลงแรงดันไฟฟ้าอนาล็อกแบบต่อเนื่อง ให้เป็นค่าตัวเลขดิจิทัล (Digital Value) เพื่อให้ไมโครคอนโทรลเลอร์นำไปคำนวณและประมวลผลต่อได้"
    },
    {
      question: "2. ค่าความละเอียด (Resolution) ของ ADC บน ESP32 แบบค่าเริ่มต้น (Default) คือเท่าใด และอ่านค่าได้ในช่วงใด?",
      choices: [
        "10-bit (อ่านค่าได้ 0 - 1023)",
        "12-bit (อ่านค่าได้ 0 - 4095)",
        "8-bit (อ่านค่าได้ 0 - 255)",
        "16-bit (อ่านค่าได้ 0 - 65535)"
      ],
      correctIndex: 1,
      explanation: "ESP32 มี ADC ความละเอียดเริ่มต้น 12-bit ทำให้สามารถแปลงแรงดันไฟเป็นค่าตัวเลขดิจิทัลได้ตั้งแต่ 0 ถึง 4095 (2^12 = 4096 ระดับ)"
    },
    {
      question: "3. บอร์ดไมโครคอนโทรลเลอร์ ESP8266 มีพินสำหรับอ่านสัญญาณอนาล็อก (ADC) กี่พิน และมีความละเอียดเท่าใด?",
      choices: [
        "1 พิน (พิน A0) ความละเอียด 10-bit (0 - 1023)",
        "2 พิน (A0, A1) ความละเอียด 12-bit (0 - 4095)",
        "16 พิน ความละเอียด 12-bit (0 - 4095)",
        "8 พิน ความละเอียด 8-bit (0 - 255)"
      ],
      correctIndex: 0,
      explanation: "ESP8266 มีพิน ADC เพียงพินเดียวคือ A0 (หรือ TOUT) มีความละเอียด 10-bit อ่านค่าได้ช่วง 0 - 1023"
    },
    {
      question: "4. ฟังก์ชันมาตรฐานใน Arduino IDE ที่ใช้สำหรับอ่านค่าแรงดันอนาล็อกจากพินที่กำหนดคือฟังก์ชันใด?",
      choices: [
        "digitalRead(pin)",
        "analogWrite(pin, value)",
        "analogRead(pin)",
        "adcRead(pin)"
      ],
      correctIndex: 2,
      explanation: "analogRead(pin) เป็นฟังก์ชันหลักในการสั่งให้ ADC อ่านค่าแรงดันอนาล็อกจากพินที่ระบุ แล้วคืนค่าเป็นตัวเลขดิจิทัล"
    },
    {
      question: "5. ข้อจำกัดสำคัญในการใช้งานพินกลุ่ม ADC2 บนบอร์ด ESP32 คืออะไร?",
      choices: [
        "ไม่สามารถอ่านแรงดันไฟฟ้าเกิน 1.0V ได้",
        "ไม่สามารถใช้งานอ่านค่า ADCได้ เมื่อมีการเปิดใช้งาน Wi-Fi",
        "สามารถใช้อ่านค่าได้เฉพาะสัญญาณดิจิทัลเท่านั้น",
        "จะทำให้ชิป ESP32 รีเซ็ตตัวเองทันทีที่เรียกใช้งาน"
      ],
      correctIndex: 1,
      explanation: "บน ESP32 ช่อง ADC2 ถูกใช้งานร่วมกับไดรเวอร์ Wi-Fi ดังนั้นเมื่อมีการเปิดใช้งาน Wi-Fi พินในกลุ่ม ADC2 จะไม่สามารถใช้อ่านค่า analogRead() ได้"
    },
    {
      question: "6. ฟังก์ชัน map(val, 0, 4095, 0, 100) มีการทำงานอย่างไร?",
      choices: [
        "เทียบสัดส่วนแปลงค่า val จากช่วง 0-4095 ให้เป็นช่วงเปอร์เซ็นต์ 0-100",
        "กรองสัญญาณรบกวนของค่า val ให้คงที่อยู่ที่ 100",
        "กำหนดความเร็วในการอ่านค่าอนาล็อกให้เท่ากับ 100 ms",
        "แปลงค่าดิจิทัล 0-100 ให้เป็นแรงดันไฟ 0-4095 mV"
      ],
      correctIndex: 0,
      explanation: "ฟังก์ชัน map(value, fromLow, fromHigh, toLow, toHigh) ทำการแปลงช่วงข้อมูลเชิงเส้น โดยแปลงค่า val จากช่วง 0-4095 ไปเป็นช่วง 0-100"
    },
    {
      question: "7. หากต้องการแปลงค่า ADC 10-bit (0 - 1023) ของ ESP8266 ให้เป็นเปอร์เซ็นต์ (0 - 100%) ควรใช้ฟังก์ชัน map() อย่างไร?",
      choices: [
        "map(val, 0, 100, 0, 1023)",
        "map(val, 0, 1023, 0, 100)",
        "map(val, 1023, 0, 100, 0)",
        "map(val, 0, 4095, 0, 100)"
      ],
      correctIndex: 1,
      explanation: "ค่าเข้าคือ 0 ถึง 1023 (10-bit) และค่าส่งออกที่ต้องการคือ 0 ถึง 100 (%) จึงใช้ map(val, 0, 1023, 0, 100)"
    },
    {
      question: "8. LDR Sensor (Light Dependent Resistor) มีหลักการทำงานอย่างไรเมื่อความเข้มแสงเปลี่ยนแปลง?",
      choices: [
        "เมื่อความเข้มแสงสูงขึ้น ค่าความต้านทานจะสูงขึ้นตาม",
        "เมื่อความเข้มแสงสูงขึ้น ค่าความต้านทานจะลดลง ส่งผลให้แรงดันเอาต์พุตในวงจรแบ่งแรงดันเปลี่ยนแปลง",
        "สามารถสร้างกระแสไฟฟ้าได้เองตามความเข้มแสงเหมือนโซลาร์เซลล์",
        "สวิตช์ภายในจะตัดการทำงานทันทีเมื่อไม่มีแสง"
      ],
      correctIndex: 1,
      explanation: "LDR เป็นสารกึ่งตัวนำชนิด Photoresistor เมื่อได้รับแสงสว่างมากขึ้น ความต้านทานภายในจะลดต่ำลง ทำให้เกิดการเปลี่ยนแปลงแรงดันไฟเมื่อต่อร่วมกับวงจรแบ่งแรงดัน (Voltage Divider)"
    },
    {
      question: "9. เซนเซอร์วัดความชื้นในดินชนิด YL-69 / HL-69 (Resistive Type) วัดความชื้นโดยใช้วิธีใด?",
      choices: [
        "วัดการเปลี่ยนแปลงความจุไฟฟ้า (Capacitance) ระหว่างแผ่นอิเล็กโทรด",
        "วัดความต้านทานไฟฟ้า (Resistance) ระหว่างแท่งโลหะผ่านน้ำและแร่ธาตุในดิน",
        "วัดการสะท้อนของแสงอินฟราเรดในดิน",
        "วัดความถี่เสียงสะท้อนผ่านเนื้อดิน"
      ],
      correctIndex: 1,
      explanation: "เซนเซอร์ YL-69/HL-69 ชนิด Resistive จะปล่อยกระแสไฟฟ้าผ่านแท่งวัด 2 แท่งแล้ววัดความต้านทานไฟฟ้า ดินเปียกจะมีน้ำและแร่ธาตุช่วยนำไฟฟ้า ทำให้ความต้านทานต่ำลง"
    },
    {
      question: "10. ข้อเสียสำคัญของเซนเซอร์วัดความชื้นในดินชนิด YL-69 (Resistive Type) เมื่อเปิดใช้งานต่อเนื่องคืออะไร?",
      choices: [
        "เกิดการกัดกร่อนของแท่งโลหะ (Corrosion) จากปฏิกิริยาอิเล็กโทรลิซิสเมื่อมีกระแสไหลผ่าน",
        "ใช้พลังงานสูงมากจนบอร์ดไมโครคอนโทรลเลอร์ตัดการทำงาน",
        "อ่านค่าได้เฉพาะเมื่อดินแห้งสนิทเท่านั้น",
        "ไม่สามารถส่งสัญญาณออกมาเป็นอนาล็อกได้"
      ],
      correctIndex: 0,
      explanation: "เนื่องจากมีกระแสไฟฟ้า DC ไหลผ่านแท่งโลหะและดินเปียกตลอดเวลา ทำให้เกิดปฏิกิริยาอิเล็กโทรลิซิส กัดกร่อนแท่งโลหะจนสึกหรอและเสียหายอย่างรวดเร็ว"
    },
    {
      question: "11. เซนเซอร์วัดความชื้นในดินแบบ Capacitive (Capacitive Soil Moisture Sensor) มีจุดเด่นเหนือกว่าแบบ Resistive อย่างไร?",
      choices: [
        "ราคาถูกกว่าแบบ Resistive หลายเท่า",
        "วงจรและแผ่นอิเล็กโทรดถูกเคลือบฉนวน ไม่สัมผัสเนื้อดินและน้ำโดยตรง จึงทนต่อการกัดกร่อน",
        "ต้องใช้แรงดันไฟเลี้ยงสูงถึง 12V ขึ้นไปเท่านั้น",
        "ส่งข้อมูลออกเป็นสัญญาณดิจิทัล Bus I2C เท่านั้น"
      ],
      correctIndex: 1,
      explanation: "เซนเซอร์ Capacitive วัดความชื้นจากค่าไดอิเล็กทริก (Dielectric Constant) โดยแผ่นทองแดงเปรียบเหมือนแผ่นคาปาซิเตอร์ที่มีฉนวนเคลือบไว้ จึงทนทาน ไม่เกิดการกัดกร่อนแบบ electrolysis"
    },
    {
      question: "12. GAS Sensor (เช่น MQ-2, MQ-135) มักมีพินเอาต์พุต AO (Analog Output) สัญญาณจากพินนี้มีลักษณะอย่างไร?",
      choices: [
        "ให้ระดับแรงดันไฟฟ้าเปลี่ยนแปลงต่อเนื่องตามระดับความเข้มข้นของก๊าซที่ตรวจจับได้",
        "ให้สัญญาณสถานะ HIGH (1) หรือ LOW (0) เท่านั้น",
        "ส่งข้อมูลอนุกรมแบบโปรโตคอล SPI",
        "ให้ค่าความถี่ของสัญญาณสี่เหลี่ยมเปลี่ยนตามความเข้มข้นก๊าซ"
      ],
      correctIndex: 0,
      explanation: "พิน AO (Analog Output) จะจ่ายแรงดันอนาล็อกแปรผันตามความเข้มข้นของก๊าซ ยิ่งมีก๊าซมาก แรงดันไฟที่วัดได้จาก ADC จะยิ่งสูงขึ้น"
    },
    {
      question: "13. โดยทั่วไปเมื่อนำเซนเซอร์วัดความชื้นในดินต่อเข้ากับพิน ADC ค่าที่อ่านได้จะมีลักษณะอย่างไรเมื่อดินมีความชื้นสูง (ดินเปียก)?",
      choices: [
        "ค่าที่อ่านได้จาก ADC จะเพิ่มขึ้นจนสูงสุดเสมอ",
        "ค่าแรงดันไฟ/ค่า ADC มักจะลดต่ำลง (หรือเข้าใกล้ 0) เนื่องจากดินมีความต้านทานต่ำลง",
        "ค่า ADC จะเปลี่ยนเป็นค่าติดลบ",
        "สัญญาณ ADC จะหยุดการตอบสนอง"
      ],
      correctIndex: 1,
      explanation: "เมื่อดินเปียก นำไฟฟ้าได้ดีขึ้น ความต้านทานดินจะลดลง ส่งผลให้แรงดันตกคร่อมที่พินวัดอนาล็อกลดต่ำลง (ค่า ADC จึงเข้าใกล้ 0 ในสภาพดินเปียกชุ่ม)"
    },
    {
      question: "14. หากต้องการคำนวณแปลงค่าดิจิทัลจาก ADC 12-bit (0-4095) ของ ESP32 ให้เป็นค่าแรงดันไฟฟ้าจริง (Vin) ในหน่วยโวลต์ (แรงดันอ้างอิง 3.3V) สมการใดถูกต้อง?",
      choices: [
        "Vin = (adcValue / 4095.0) * 3.3",
        "Vin = (adcValue / 3.3) * 4095.0",
        "Vin = (adcValue / 1023.0) * 5.0",
        "Vin = adcValue * 3.3"
      ],
      correctIndex: 0,
      explanation: "แรงดันจริงหาได้จาก สัดส่วนค่า ADC ที่อ่านได้หารด้วยค่าสูงสุด (4095.0) แล้วคูณด้วยแรงดันอ้างอิงสูงสุด (3.3V)"
    },
    {
      question: "15. ในการอ่านค่าอนาล็อกจาก GAS Sensor หรือ LDR Sensor หากพบว่าสัญญาณมีความผันผวนเล็กน้อย (Noise) วิธีทางซอฟต์แวร์เบื้องต้นที่ดีที่สุดในการแก้ปัญหาคืออะไร?",
      choices: [
        "อ่านค่าจาก ADC หลายๆ ครั้งติดต่อกันแล้วนำมาหาค่าเฉลี่ย (Averaging / Oversampling)",
        "เพิ่มแรงดันไฟเลี้ยงให้เซนเซอร์เป็น 2 เท่า",
        "ใส่คำสั่ง delay(10000) ทุกครั้งหลังอ่านค่า",
        "เปลี่ยนไปใช้ดิจิทัลพินแบบ External Interrupt"
      ],
      correctIndex: 0,
      explanation: "การทำ Signal Averaging โดยอ่านค่าจาก ADC หลายๆ รอบ (เช่น 10-20 รอบ) แล้วหาค่าเฉลี่ย เป็นวิธีมาตรฐานทางซอฟต์แวร์ที่ช่วยลด Noise และทำให้ค่าที่ได้มีความนิ่งแม่นยำยิ่งขึ้น"
    }
  ];

  // 3. วนลูปสร้างข้อสอบแต่ละข้อ
  for (var i = 0; i < quizData.length; i++) {
    var qData = quizData[i];
    var item = form.addMultipleChoiceItem();
    
    item.setTitle(qData.question);
    item.setPoints(1); // กำหนดข้อละ 1 คะแนน
    
    // สร้างตัวเลือก 4 ตัวเลือก พร้อมกำหนดข้อที่ถูกต้อง
    var choices = [];
    for (var j = 0; j < qData.choices.length; j++) {
      var isCorrect = (j === qData.correctIndex);
      choices.push(item.createChoice(qData.choices[j], isCorrect));
    }
    item.setChoices(choices);
    
    // ตั้งค่าเฉลี่ยและคำอธิบาย (Feedback) สำหรับคำตอบ
    var feedback = FormApp.createFeedback()
      .setText(qData.explanation)
      .build();
    item.setFeedbackForCorrect(feedback);
    item.setFeedbackForIncorrect(feedback);
  }

  // 4. แสดง URL ของ Google Form ใน Log
  Logger.log("=== สร้าง Google Form แบบทดสอบเรียบร้อยแล้ว ===");
  Logger.log("URL สำหรับแก้ไข (Edit URL): " + form.getEditUrl());
  Logger.log("URL สำหรับส่งให้ผู้ทำแบบทดสอบ (Published URL): " + form.getPublishedUrl());
}
