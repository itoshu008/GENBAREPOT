import { Router } from "express";
import { pool } from "../database/connection";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const { dates, staff_name, role, message } = req.body;

    if (!staff_name || !Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({ error: "staff_name and dates are required" });
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      for (const date of dates) {
        await connection.execute(
          `INSERT INTO staff_availability (available_date, staff_name, role, message)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             role = VALUES(role),
             message = VALUES(message),
             updated_at = CURRENT_TIMESTAMP`,
          [date, staff_name, role || null, message || null]
        );
      }

      await connection.commit();
      res.json({ success: true });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error("Error saving availability:", error);
    res.status(500).json({ error: "Failed to save availability" });
  }
});

router.get("/", async (req, res) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string };

    const today = new Date();
    const defaultFrom = today.toISOString().split("T")[0];
    const future = new Date();
    future.setDate(future.getDate() + 30);
    const defaultTo = future.toISOString().split("T")[0];

    const rangeFrom = from || defaultFrom;
    const rangeTo = to || defaultTo;

    const [rows] = await pool.execute(
      `SELECT id, available_date, staff_name, role, message, created_at
       FROM staff_availability
       WHERE available_date BETWEEN ? AND ?
       ORDER BY available_date, staff_name`,
      [rangeFrom, rangeTo]
    );

    res.json({ success: true, data: rows });
  } catch (error: any) {
    console.error("Error fetching availability:", error);
    res.status(500).json({ error: "Failed to fetch availability" });
  }
});

export default function availabilityRoutes() {
  return router;
}


