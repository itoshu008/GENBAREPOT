import { Router } from "express";
import { Server } from "socket.io";
import { pool } from "../database/connection";
import { Sheet, SheetType } from "../types/sheets";
import { syncSheetData } from "../services/csvSync";
import { syncSheetDataWithCoordinates, getSheetDataByDate } from "../services/sheetSync";

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

  // スプレッドシートURL登録（座標指定対応）
  router.post("/", async (req, res) => {
    try {
      const {
        url,
        type,
        target_year,
        target_month,
        is_active,
        date_column,
        site_name_column,
        location_column,
        staff_column,
        start_row,
      } = req.body;

      if (!url || !type || !target_year || !target_month) {
        return res.status(400).json({
          error: "url, type, target_year, and target_month are required",
        });
      }

      const validTypes: SheetType[] = ["sites", "staffs", "other"];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ error: "Invalid type" });
      }

      // 座標情報のバリデーション（sitesタイプの場合）
      if (type === "sites") {
        if (!date_column || !site_name_column || !staff_column) {
          return res.status(400).json({
            error: "date_column, site_name_column, and staff_column are required for sites type",
          });
        }
      }

      const [result] = await pool.execute(
        `INSERT INTO sheets (
          url, type, target_year, target_month, is_active,
          date_column, site_name_column, location_column, staff_column, start_row
        )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          url,
          type,
          target_year,
          target_month,
          is_active !== undefined ? is_active : true,
          date_column || null,
          site_name_column || null,
          location_column || null,
          staff_column || null,
          start_row || 2,
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
      const {
        url,
        type,
        target_year,
        target_month,
        is_active,
        date_column,
        site_name_column,
        location_column,
        staff_column,
        start_row,
      } = req.body;

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
      if (date_column !== undefined) {
        updateFields.push("date_column = ?");
        updateValues.push(date_column);
      }
      if (site_name_column !== undefined) {
        updateFields.push("site_name_column = ?");
        updateValues.push(site_name_column);
      }
      if (location_column !== undefined) {
        updateFields.push("location_column = ?");
        updateValues.push(location_column);
      }
      if (staff_column !== undefined) {
        updateFields.push("staff_column = ?");
        updateValues.push(staff_column);
      }
      if (start_row !== undefined) {
        updateFields.push("start_row = ?");
        updateValues.push(start_row);
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

  // 日付でスプレッドシートからデータを取得
  router.get("/by-date", async (req, res) => {
    try {
      const { date } = req.query;

      if (!date || typeof date !== "string") {
        return res.status(400).json({
          error: "date query parameter is required",
        });
      }

      // アクティブなスプレッドシートを取得（座標指定があるもの）
      const [sheets] = await pool.execute(
        `SELECT * FROM sheets 
         WHERE is_active = 1 
         AND date_column IS NOT NULL 
         AND site_name_column IS NOT NULL 
         AND staff_column IS NOT NULL
         ORDER BY target_year DESC, target_month DESC, created_at DESC`,
        []
      ) as any[];

      if (sheets.length === 0) {
        return res.json({ success: true, data: [] });
      }

      // 最初のアクティブなシートからデータを取得
      const sheet = sheets[0];
      const data = await getSheetDataByDate(sheet, date);

      res.json({ success: true, data });
    } catch (error: any) {
      console.error("Error fetching sheet data by date:", error);
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

      // 座標指定がある場合は座標指定で同期、なければ従来のCSV同期
      let result;
      if (sheet.date_column && sheet.site_name_column && sheet.staff_column) {
        result = await syncSheetDataWithCoordinates(sheet);
      } else {
        result = await syncSheetData(sheet);
      }

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
      const errorMessage = error.message || "同期に失敗しました";
      res.status(500).json({ 
        error: errorMessage,
        details: error.stack 
      });
    }
  });

  return router;
}

