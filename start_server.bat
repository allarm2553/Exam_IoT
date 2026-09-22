@echo off
chcp 65001 > nul
title ESP32 Examination Suite - Local Server
echo ================================================================
echo   🚀 เริ่มต้นเปิดใช้งาน Local Server - ESP32 Examination Suite
echo ================================================================
echo.
echo กำลังตรวจสอบระบบ Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [คำเตือน] ไม่พบ Node.js ในเครื่อง กำลังสลับไปใช้ Python...
    where python >nul 2>nul
    if %errorlevel% neq 0 (
        echo [ข้อผิดพลาด] ไม่พบทั้ง Node.js และ Python ในระบบ
        pause
        exit /b 1
    ) else (
        echo กำลังเริ่มต้นผ่าน Python Server...
        start http://localhost:8000
        python server.py
        pause
        exit /b 0
    )
)

echo พบ Node.js เรียบร้อย!
echo กำลังเปิดหน้า Dashboard ในเบราว์เซอร์อัตโนมัติ...
start http://localhost:8000
echo กำลังรัน Node.js Server...
echo.
node server.js
pause
