import { Router } from "express";
import { Server } from "socket.io";
import { pool } from "../database/connection";
import { Sheet, SheetType } from "../types/sheets";
import { syncSheetData } from "../services/csvSync";

const router = Router();

export default function sheetRoutes(io: Server) {
  // スプレッドシートURL一覧取得
  router.get("/", async (req, res) => {
    try {
      const { type, year, month, is_active } = req.query;

      let query = "SELECT * FROM sheets WHERE 1=1";
      const params: any[] = [];

      if (type) {
        query += " AND type = ?";
        params.push(type);
      }
      if (year) {
        query += " AND target_year = ?";
        params.push(year);
      }
      if (month) {
        query += " AND target_month = ?";
        params.push(month);
      }
      if (is_active !== undefined) {
        query += " AND is_active = ?";
        params.push(is_active === "true" || is_active === "1");
      }

      query += " ORDER BY target_year DESC, target_month DESC, created_at DESC";

      const [rows] = await pool.execute(query, params);

      res.json({ success: true, data: rows });
    } catch (error: any) {
      console.error("Error fetching sheets:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // スプレッドシートURL登録
  router.post("/", async (req, res) => {
    try {
      const { url, type, target_year, target_month, is_active } = req.body;

      if (!url || !type || !target_year || !target_month) {
        return res.status(400).json({
          error: "url, type, target_year, and target_month are required",
        });
      }

      const validTypes: SheetType[] = ["sites", "staffs", "other"];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ error: "Invalid type" });
      }

      const [result] = await pool.execute(
        `INSERT INTO sheets (url, type, target_year, target_month, is_active)
         VALUES (?, ?, ?, ?, ?)`,
        [
          url,
          type,
          target_year,
          target_month,
          is_active !== undefined ? is_active : true,
        ]
      ) as any;

      res.json({
        success: true,
        message: "Sheet URL registered",
        data: { id: result.insertId },
      });
    } catch (error: any) {
      console.error("Error registering sheet:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // スプレッドシートURL更新
  router.put("/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { url, type, target_year, target_month, is_active } = req.body;

      const updateFields: string[] = [];
      const updateValues: any[] = [];

      if (url !== undefined) {
        updateFields.push("url = ?");
        updateValues.push(url);
      }
      if (type !== undefined) {
        updateFields.push("type = ?");
        updateValues.push(type);
      }
      if (target_year !== undefined) {
        updateFields.push("target_year = ?");
        updateValues.push(target_year);
      }
      if (target_month !== undefined) {
        updateFields.push("target_month = ?");
        updateValues.push(target_month);
      }
      if (is_active !== undefined) {
        updateFields.push("is_active = ?");
        updateValues.push(is_active);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ error: "No fields to update" });
      }

      updateValues.push(id);

      await pool.execute(
        `UPDATE sheets SET ${updateFields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        updateValues
      );

      res.json({ success: true, message: "Sheet updated" });
    } catch (error: any) {
      console.error("Error updating sheet:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // スプレッドシートURL削除
  router.delete("/:id", async (req, res) => {
    try {
      const { id } = req.params;

      await pool.execute("DELETE FROM sheets WHERE id = ?", [id]);

      res.json({ success: true, message: "Sheet deleted" });
    } catch (error: any) {
      console.error("Error deleting sheet:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // CSV同期実行
  router.post("/:id/sync", async (req, res) => {
    try {
      const { id } = req.params;

      // シート情報取得
      const [sheets] = await pool.execute(
        "SELECT * FROM sheets WHERE id = ?",
        [id]
      ) as any[];

      if (sheets.length === 0) {
        return res.status(404).json({ error: "Sheet not found" });
      }

      const sheet = sheets[0];

      // CSV同期実行
      const result = await syncSheetData(sheet);

      // 最終同期日時更新
      await pool.execute(
        "UPDATE sheets SET last_synced_at = CURRENT_TIMESTAMP WHERE id = ?",
        [id]
      );

      // Socket.IOで通知
      io.emit("sheet:synced", {
        sheet_id: id,
        type: sheet.type,
        count: result.count,
      });

      res.json({
        success: true,
        message: "Sync completed",
        data: result,
      });
    } catch (error: any) {
      console.error("Error syncing sheet:", error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

