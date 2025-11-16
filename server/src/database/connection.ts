import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "genbareport_user",
  password: process.env.DB_PASSWORD || "zatint_6487",
  database: process.env.DB_NAME || "genbareport_db",
  port: parseInt(process.env.DB_PORT || "3306"),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export async function initDatabase() {
  try {
    const connection = await pool.getConnection();
    console.log("Database connected");
    connection.release();
  } catch (error) {
    console.error("Database connection error:", error);
  }
}

export { pool };

