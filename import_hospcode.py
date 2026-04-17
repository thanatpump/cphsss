import pandas as pd
import sqlite3

# กำหนด path ของไฟล์
EXCEL_PATH = '../../Downloads/hospcode.xls'
DB_PATH = './sso.db'

# อ่านไฟล์ Excel
print('กำลังอ่านไฟล์ Excel...')
df = pd.read_excel(EXCEL_PATH)

# ตรวจสอบ column ที่ต้องการ
if 'hospcode_5_digit' not in df.columns or 'name' not in df.columns:
    raise Exception('ไม่พบ column hospcode_5_digit หรือ name ในไฟล์ hospcode.xls')

# เชื่อมต่อ SQLite
print('เชื่อมต่อฐานข้อมูล...')
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# สร้างตาราง hospcode ถ้ายังไม่มี
cursor.execute('''
CREATE TABLE IF NOT EXISTS hospcode (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hospcode_5_digit TEXT,
    name TEXT
)
''')

# ลบข้อมูลเดิม (ถ้าต้องการ)
cursor.execute('DELETE FROM hospcode')

# เพิ่มข้อมูลใหม่
print('นำเข้าข้อมูล...')
for _, row in df.iterrows():
    cursor.execute(
        'INSERT INTO hospcode (hospcode_5_digit, name) VALUES (?, ?)',
        (str(row['hospcode_5_digit']), str(row['name']))
    )

conn.commit()
conn.close()
print('นำเข้าข้อมูลเสร็จสิ้น!') 