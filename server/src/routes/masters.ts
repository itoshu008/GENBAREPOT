import { Router } from "express";
import { pool } from "../database/connection";

const router = Router();

export default function masterRoutes() {
  // 現場マスタ一覧取得
  router.get("/sites", async (req, res) => {
    try {
      const { year, month, site_code, site_name, location } = req.query;

      let query = "SELECT * FROM sites WHERE 1=1";
      const params: any[] = [];

      if (year) {
        query += " AND year = ?";
        params.push(year);
      }
      if (month) {
        query += " AND month = ?";
        params.push(month);
      }
      if (site_code) {
        query += " AND site_code LIKE ?";
        params.push(`%${site_code}%`);
      }
      if (site_name) {
        query += " AND site_name LIKE ?";
        params.push(`%${site_name}%`);
      }
      if (location) {
        query += " AND location LIKE ?";
        params.push(`%${location}%`);
      }

      query += " ORDER BY site_code";

      const [rows] = await pool.execute(query, params);

      res.json({ success: true, data: rows });
    } catch (error: any) {
      console.error("Error fetching sites:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // スタッフマスタ一覧取得
  router.get("/staffs", async (req, res) => {
    try {
      const { year, month, staff_name, role } = req.query;

      let query = "SELECT * FROM staffs WHERE 1=1";
      const params: any[] = [];

      if (year) {
        query += " AND year = ?";
        params.push(year);
      }
      if (month) {
        query += " AND month = ?";
        params.push(month);
      }
      if (staff_name) {
        query += " AND staff_name LIKE ?";
        params.push(`%${staff_name}%`);
      }
      if (role) {
        query += " AND role = ?";
        params.push(role);
      }

      query += " ORDER BY staff_name";

      const [rows] = await pool.execute(query, params);

      res.json({ success: true, data: rows });
    } catch (error: any) {
      console.error("Error fetching staffs:", error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

