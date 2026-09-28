// ==========================================
// แบบทดสอบเรื่อง หลักการและการใช้งาน MQTT
// Backend Google Apps Script (Code.gs)
// ==========================================

// 1. ฟังก์ชันเปิดหน้าเว็บข้อสอบเข้าคู่กับ Index.html แบบพิมพ์ใหญ่พิมพ์เล็กตรงกัน
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('แบบทดสอบ: หลักการและการใช้งาน MQTT')
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
      "q_0": "Message Queuing Telemetry Transport - โปรโตคอลสื่อสารน้ำหนักเบาสำหรับอุปกรณ์ IoT",
      "q_1": "Publish / Subscribe",
      "q_2": "ข้อความจะถูกส่งอย่างมากที่สุด 1 ครั้ง โดยไม่มีการตอบรับการรับข้อความ (No Acknowledgment)",
      "q_3": "QoS 1 รับประกันส่งอย่างน้อย 1 ครั้ง (อาจมีข้อความซ้ำ) ส่วน QoS 2 รับประกันส่งสำเร็จเพียงครั้งเดียวแน่นอน",
      "q_4": "MQTT Broker ทำหน้าที่รับ กรอง และส่งต่อข้อความไปยัง Subscriber ที่สนใจ",
      "q_5": "เป็นได้ทั้ง Publisher และ Subscriber (MQTT Client)",
      "q_6": "ให้ Broker บันทึกข้อความล่าสุดของ Topic นั้นไว้ เพื่อส่งให้ Client ใหม่ที่กด Subscribe ทันทีที่เชื่อมต่อ",
      "q_7": "1883",
      "q_8": "เครื่องหมายสแลช (/)",
      "q_9": "esp32/dht/temperature และ esp32/dht/humidity",
      "q_10": "ทำการ Subscribe Topic นั้นเพื่อรอรับข้อความสั่งงาน (\"on\"/\"off\")",
      "q_11": "เป็นข้อความสตริงที่ใช้ระบุหมวดหมู่ช่องทางข้อมูล เพื่อให้ Broker กรองและกระจายข้อความได้ถูกต้อง",
      "q_12": "Mosquitto MQTT Broker",
      "q_13": "sudo apt install -y mosquitto mosquitto-clients",
      "q_14": "mosquitto_sub -h localhost -t testTopic -u user -P pass"
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
function createMQTTQuizForm() {
  // 1. สร้าง Google Form ใหม่
  var form = FormApp.create('แบบทดสอบ เรื่อง หลักการและการใช้งาน MQTT')
      .setTitle('แบบทดสอบ เรื่อง หลักการและการใช้งาน MQTT')
      .setDescription('แบบทดสอบปรนัย 4 ตัวเลือก จำนวน 15 ข้อ ครอบคลุมหลักการ องค์ประกอบ การตั้ง Topic และการติดตั้ง Local Broker')
      .setIsQuiz(true); // ตั้งค่าให้เป็นแบบทดสอบ (Quiz)

  // ชุดข้อมูลข้อสอบทั้ง 15 ข้อ
  var quizData = [
    {
      question: '1. MQTT ย่อมาจากอะไร และถูกออกแบบมาเพื่อจุดประสงค์ใดเป็นหลัก?',
      choices: [
        'ก) Message Queuing Telemetry Transport - โปรโตคอลสื่อสารน้ำหนักเบาสำหรับอุปกรณ์ IoT',
        'ข) Media Query Transfer Technology - โปรโตคอลสตรีมมิงวิดีโอความละเอียดสูง',
        'ค) Master Queue Text Transport - โปรโตคอลส่งอีเมลระหว่างเซิร์ฟเวอร์',
        'ง) Managed Query Terminal Transport - โปรโตคอลจัดการฐานข้อมูลขนาดใหญ่'
      ],
      correctIndex: 0,
      feedback: 'เฉลย: ก) MQTT ย่อมาจาก Message Queuing Telemetry Transport เป็นโปรโตคอลการสื่อสารแบบ Publish/Subscribe ที่มีขนาดเบา เหมาะสำหรับอุปกรณ์ IoT'
    },
    {
      question: '2. รูปแบบโครงสร้างการสื่อสารหลักของโปรโตคอล MQTT คือรูปแบบใด?',
      choices: [
        'ก) Client-Server แบบ Request-Response',
        'ข) Peer-to-Peer (P2P)',
        'ค) Publish / Subscribe',
        'ง) Master-Slave แบบ Polling'
      ],
      correctIndex: 2,
      feedback: 'เฉลย: ค) MQTT ใช้ระบบการสื่อสารแบบ Publish/Subscribe โดย Client สามารถส่ง (Publish) และรับ (Subscribe) ข้อความผ่าน Broker'
    },
    {
      question: '3. ในการส่งข้อความ MQTT การกำหนด Quality of Service (QoS) ระดับ 0 หมายถึงอะไร?',
      choices: [
        'ก) ข้อความจะถูกส่งอย่างน้อย 1 ครั้ง แต่อาจส่งซ้ำได้',
        'ข) ข้อความจะถูกส่งสำเร็จอย่างแน่นอนเพียง 1 ครั้งเท่านั้น',
        'ค) ข้อความจะถูกส่งอย่างมากที่สุด 1 ครั้ง โดยไม่มีการตอบรับการรับข้อความ (No Acknowledgment)',
        'ง) ไม่มีการส่งข้อความเลย'
      ],
      correctIndex: 2,
      feedback: 'เฉลย: ค) QoS Level 0 (At most once) คือการส่งข้อความเพียงครั้งเดียวหรืออาจไม่ถึงเลย โดยไม่มีการยืนยันตอบรับ'
    },
    {
      question: '4. ข้อใดอธิบายความแตกต่างระหว่าง QoS ระดับ 1 และ QoS ระดับ 2 ได้ถูกต้อง?',
      choices: [
        'ก) QoS 1 ไม่มีการตอบรับ ส่วน QoS 2 มีการตอบรับ',
        'ข) QoS 1 รับประกันส่งอย่างน้อย 1 ครั้ง (อาจมีข้อความซ้ำ) ส่วน QoS 2 รับประกันส่งสำเร็จเพียงครั้งเดียวแน่นอน',
        'ค) QoS 1 ใช้กับวิดีโอ ส่วน QoS 2 ใช้กับข้อความสั้น',
        'ง) QoS 1 เข้ารหัสข้อมูล ส่วน QoS 2 ไม่เข้ารหัสข้อมูล'
      ],
      correctIndex: 1,
      feedback: 'เฉลย: ข) QoS 1 (At least once) การันตีส่งถึงอย่างน้อย 1 ครั้ง แต่อาจซ้ำ ส่วน QoS 2 (Exactly once) การันตีส่งสำเร็จเพียงครั้งเดียวแน่นอน'
    },
    {
      question: '5. ศูนย์กลางในการจัดการและกระจายข้อความในระบบ MQTT คืออะไร และมีหน้าที่อย่างไร?',
      choices: [
        'ก) MQTT Client ทำหน้าที่ประมวลผลกราฟิก',
        'ข) MQTT Broker ทำหน้าที่รับ กรอง และส่งต่อข้อความไปยัง Subscriber ที่สนใจ',
        'ค) Router ทำหน้าที่แปลงสัญลักษณ์ข้อความ',
        'ง) Gateway ทำหน้าที่แปลงสัญญาณอนาล็อกเป็นดิจิทัล'
      ],
      correctIndex: 1,
      feedback: 'เฉลย: ข) MQTT Broker ทำหน้าที่รับข้อความ กรองข้อความ ตรวจสอบความสนใจของผู้รับ และส่งต่อข้อความไปยัง Subscriber'
    },
    {
      question: '6. อุปกรณ์ IoT เช่น ESP32 หรือ ESP8266 ในระบบ MQTT ทำหน้าที่เป็นอะไรได้บ้าง?',
      choices: [
        'ก) เป็นได้เฉพาะ MQTT Broker เท่านั้น',
        'ข) เป็นได้เฉพาะ Publisher เท่านั้น',
        'ค) เป็นได้เฉพาะ Subscriber เท่านั้น',
        'ง) เป็นได้ทั้ง Publisher และ Subscriber (MQTT Client)'
      ],
      correctIndex: 3,
      feedback: 'เฉลย: ง) บอร์ด ESP32 / ESP8266 เป็น MQTT Client ซึ่งสามารถทำหน้าที่ส่งข้อความ (Publish) ค่าเซนเซอร์ และรับข้อความ (Subscribe) เพื่อควบคุมอุปกรณ์ได้'
    },
    {
      question: '7. การตั้งค่าสถานะ Retain Flag เป็น true ในข้อความ MQTT มีประโยชน์อย่างไร?',
      choices: [
        'ก) ลบข้อความทันทีหลังจากส่งสำเร็จ',
        'ข) ให้ Broker บันทึกข้อความล่าสุดของ Topic นั้นไว้ เพื่อส่งให้ Client ใหม่ที่กด Subscribe ทันทีที่เชื่อมต่อ',
        'ค) บังคับให้เปลี่ยนชื่อ Topic อัตโนมัติ',
        'ง) ปิดการเชื่อมต่อของ Client ทั้งหมด'
      ],
      correctIndex: 1,
      feedback: 'เฉลย: ข) Retain Flag ทำให้ Broker บันทึกข้อความล่าสุดของ Topic ไว้ เพื่อส่งต่อให้ Client ที่เข้ามา Subscribe ใหม่ได้รับทราบสถานะล่าสุดทันที'
    },
    {
      question: '8. หมายเลขพอร์ตมาตรฐาน (Default Port) สำหรับการเชื่อมต่อ MQTT แบบไม่เข้ารหัส คือพอร์ตใด?',
      choices: [
        'ก) 80',
        'ข) 443',
        'ค) 1883',
        'ง) 8883'
      ],
      correctIndex: 2,
      feedback: 'เฉลย: ค) พอร์ต 1883 เป็นพอร์ตมาตรฐานสำหรับการเชื่อมต่อ MQTT แบบไม่เข้ารหัส'
    },
    {
      question: '9. สัญลักษณ์ใดที่ใช้ในการแบ่งระดับชั้น (Hierarchy) ของ MQTT Topic?',
      choices: [
        'ก) เครื่องหมายจุด (.)',
        'ข) เครื่องหมายสแลช (/)',
        'ค) เครื่องหมายแดช (-)',
        'ง) เครื่องหมายโคลอน (:)'
      ],
      correctIndex: 1,
      feedback: 'เฉลย: ข) MQTT Topic แบ่งระดับชั้น (Hierarchy) ด้วยเครื่องหมายสแลช (/) เช่น esp32/dht/temperature'
    },
    {
      question: '10. หากต้องการส่งค่าอุณหภูมิและความชื้นจากเซนเซอร์ DHT22 บน ESP32 ไปยัง MQTT Broker ข้อใดคือการตั้งชื่อ Topic ที่เป็นระบบและอ่านเข้าใจง่าย?',
      choices: [
        'ก) temp_and_hum_data_123',
        'ข) esp32/dht/temperature และ esp32/dht/humidity',
        'ค) 192.168.1.1/temperature',
        'ง) sensor.read.all'
      ],
      correctIndex: 1,
      feedback: 'เฉลย: ข) การตั้งชื่อ Topic ควรจัดหมวดหมู่ตามลำดับชั้นอุปกรณ์และประเภทข้อมูล เช่น esp32/dht/temperature และ esp32/dht/humidity'
    },
    {
      question: '11. หากต้องการสั่งงานเปิด/ปิดหลอดไฟผ่าน Node-RED ไปยัง ESP32 ตัวบอร์ด ESP32 จะต้องดำเนินการอย่างไรกับ Topic สั่งงาน?',
      choices: [
        'ก) ทำการ Publish ข้อความไปที่ Topic นั้น',
        'ข) ทำการ Subscribe Topic นั้นเพื่อรอรับข้อความสั่งงาน ("on"/"off")',
        'ค) ติดตั้ง Mosquitto Broker ลงใน ESP32',
        'ง) ลบ Topic นั้นออกจากเซิร์ฟเวอร์'
      ],
      correctIndex: 1,
      feedback: 'เฉลย: ข) ESP32 จะต้องกด Subscribe หัวข้อรับคำสั่งไว้ เพื่อรับข้อความสั่งงาน "on" หรือ "off" แล้วสั่งเปิด/ปิด GPIO ตามคำสั่ง'
    },
    {
      question: '12. ข้อใดอธิบายบทบาทของ Topic ในระบบสื่อสาร MQTT ได้ถูกต้องที่สุด?',
      choices: [
        'ก) เป็น IP Address ของเครื่อง Broker',
        'ข) เป็นสายสัญญาณกายภาพที่เชื่อมต่ออุปกรณ์',
        'ค) เป็นข้อความสตริงที่ใช้ระบุหมวดหมู่ช่องทางข้อมูล เพื่อให้ Broker กรองและกระจายข้อความได้ถูกต้อง',
        'ง) เป็นรหัสผ่านในการเข้าใช้งานเซิร์ฟเวอร์'
      ],
      correctIndex: 2,
      feedback: 'เฉลย: ค) Topic เป็นข้อความระบุหมวดหมู่ข้อมูล เพื่อให้ Broker กรองและกระจายข้อมูลไปยัง Subscriber ที่กดติดตาม Topic นั้นๆ'
    },
    {
      question: '13. ซอฟต์แวร์ MQTT Broker ยอดนิยมที่นิยมนำมาติดตั้งใช้งานแบบ Local บน Linux / Raspberry Pi คือซอฟต์แวร์ใด?',
      choices: [
        'ก) Apache HTTP Server',
        'ข) Mosquitto MQTT Broker',
        'ค) MySQL Server',
        'ง) Nginx Server'
      ],
      correctIndex: 1,
      feedback: 'เฉลย: ข) Mosquitto เป็น MQTT Broker ยอดนิยม ติดตั้งง่ายและใช้งานแพร่หลายบน Linux และ Raspberry Pi'
    },
    {
      question: '14. คำสั่งใดในระบบปฏิบัติการ Linux Ubuntu/Debian ใช้สำหรับติดตั้ง Mosquitto Broker และ Mosquitto Clients?',
      choices: [
        'ก) sudo apt install -y mosquitto mosquitto-clients',
        'ข) npm install mosquitto',
        'ค) pip install mosquitto-broker',
        'ง) git clone mosquitto-server'
      ],
      correctIndex: 0,
      feedback: 'เฉลย: ก) คำสั่งในการติดตั้ง Mosquitto บน Ubuntu/Linux คือ sudo apt install -y mosquitto mosquitto-clients'
    },
    {
      question: '15. คำสั่งใดใช้ในการทดสอบ Subscribe ติดตาม Topic บนเครื่อง Local Broker ผ่าน Terminal?',
      choices: [
        'ก) mosquitto_pub -h localhost -t testTopic -m "Hello"',
        'ข) mosquitto_sub -h localhost -t testTopic -u user -P pass',
        'ค) systemctl status mosquitto',
        'ง) mosquitto -v'
      ],
      correctIndex: 1,
      feedback: 'เฉลย: ข) คำสั่ง mosquitto_sub ใช้เปิดการ Subscribe เพื่อรอรับข้อความจาก Topic บน Broker'
    }
  ];

  // 2. วนลูปสร้างคำถามแต่ละข้อใน Google Form
  for (var i = 0; i < quizData.length; i++) {
    var itemData = quizData[i];
    var item = form.addMultipleChoiceItem();
    
    item.setTitle(itemData.question)
        .setPoints(1); // กำหนดข้อละ 1 คะแนน

    var choices = [];
    for (var j = 0; j < itemData.choices.length; j++) {
      var isCorrect = (j === itemData.correctIndex);
      choices.push(item.createChoice(itemData.choices[j], isCorrect));
    }
    item.setChoices(choices);

    // ใส่ คำอธิบาย/เฉลย (Feedback)
    if (itemData.feedback) {
      var feedbackObj = FormApp.createFeedback().setText(itemData.feedback).build();
      item.setFeedbackForCorrect(feedbackObj);
      item.setFeedbackForIncorrect(feedbackObj);
    }
  }

  // แสดงผล URL
  Logger.log('สร้างแบบทดสอบเรียบร้อยแล้ว!');
  Logger.log('ลิงก์สำหรับแก้ไขฟอร์ม: ' + form.getEditUrl());
  Logger.log('ลิงก์สำหรับทำแบบทดสอบ: ' + form.getPublishedUrl());
}
