import mysql from 'mysql2/promise';

export async function getDB() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
  });
  return connection;
}

// ฟังก์ชัน initDatabase ถูกลบออก เพราะไม่ได้ใช้กับ MySQL production จริง 