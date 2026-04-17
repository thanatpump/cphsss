# PowerShell Script สำหรับอ่านบัตรประชาชนไทย
# ใช้ Windows Smart Card API

# ตรวจสอบว่ามีบัตรหรือไม่
$cardInfo = certutil -scinfo 2>&1 | Out-String

if ($cardInfo -match "SCARD_STATE_EMPTY|No card") {
    Write-Host "ไม่พบบัตรประชาชน"
    exit 1
}

# สำหรับบัตรประชาชนไทย ต้องใช้ APDU commands
# แต่ PowerShell ไม่สามารถส่ง APDU commands ได้โดยตรง
# ต้องใช้ library หรือ tool พิเศษ

Write-Host "พบบัตรแล้ว แต่ไม่สามารถอ่านข้อมูลได้โดยตรง"
Write-Host "กรุณาใช้ ThaiIDCardReader.exe หรือ library พิเศษ"
exit 1
