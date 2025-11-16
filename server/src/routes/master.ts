import { Router } from "express";
import { Server } from "socket.io";
import { pool } from "../database/connection";
import {
  extractSheetId,
  getValues,
  determineSheetName,
} from "../services/googleSheets";
import { SheetSettings } from "../types";

const router = Router();

export default function masterRoutes(io: Server) {
  // シート設定を保存
  router.post("/sheet-settings/save", async (req, res) => {
    try {
      const { year, month, sheet_url, sheet_name, range_a1 } = req.body;

      if (!year || !month || !sheet_url) {
        return res.status(400).json({
          error: "year, month, and sheet_url are required",
        });
      }

      const sheet_id = extractSheetId(sheet_url);
      if (!sheet_id) {
        return res.status(400).json({
          error: "Invalid Google Sheets URL",
        });
      }

      const defaultRange = range_a1 || "A2:G500";

      const [result] = await pool.execute(
        `INSERT INTO sheet_settings (year, month, sheet_url, sheet_id, sheet_name, range_a1)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           sheet_url = VALUES(sheet_url),
           sheet_id = VALUES(sheet_id),
           sheet_name = VALUES(sheet_name),
           range_a1 = VALUES(range_a1),
           updated_at = CURRENT_TIMESTAMP`,
        [year, month, sheet_url, sheet_id, sheet_name || null, defaultRange]
      );

      res.json({
        success: true,
        message: "Sheet settings saved",
        data: result,
      });
    } catch (error: any) {
      console.error("Error saving sheet settings:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // サイトマスタをインポート
  router.post("/sites/import", async (req, res) => {
    try {
      const { year, month } = req.body;

      if (!year || !month) {
        return res.status(400).json({
          error: "year and month are required",
        });
      }

      // シート設定を取得
      const [settings] = await pool.execute(
        "SELECT * FROM sheet_settings WHERE year = ? AND month = ?",
        [year, month]
      ) as any[];

      if (settings.length === 0) {
        return res.status(404).json({
          error: "Sheet settings not found for this year and month",
        });
      }

      const setting = settings[0];
      const spreadsheetId = setting.sheet_id;

      if (!spreadsheetId) {
        return res.status(400).json({
          error: "Sheet ID not found",
        });
      }

      // シート名を決定
      const sheetName = await determineSheetName(
        spreadsheetId,
        setting.sheet_name
      );

      // 範囲を決定
      const range = setting.range_a1 || "A2:G500";
      const fullRange = `${sheetName}!${range}`;

      // Google Sheetsからデータを取得
      const values = await getValues(spreadsheetId, fullRange);

      if (values.length === 0) {
        return res.status(400).json({
          error: "No data found in sheet",
        });
      }

      // トランザクション開始
      const connection = await pool.getConnection();
      await connection.beginTransaction();

      try {
        // 既存のデータを削除
        await connection.execute(
          "DELETE FROM site_master WHERE year = ? AND month = ?",
          [year, month]
        );

        // 新しいデータを挿入
        // シートの形式: [site_code, site_name, ...]
        const insertPromises = values.map((row) => {
          const siteCode = row[0]?.toString().trim() || "";
          const siteName = row[1]?.toString().trim() || "";

          if (!siteCode || !siteName) {
            return null;
          }

          return connection.execute(
            "INSERT INTO site_master (year, month, site_code, site_name) VALUES (?, ?, ?, ?)",
            [year, month, siteCode, siteName]
          );
        });

        await Promise.all(insertPromises.filter((p) => p !== null));

        // 最終インポート時刻を更新
        await connection.execute(
          "UPDATE sheet_settings SET last_imported_at = CURRENT_TIMESTAMP WHERE year = ? AND month = ?",
          [year, month]
        );

        await connection.commit();

        // Socket.IOで通知
        io.emit("master:siteImported", { year, month });

        res.json({
          success: true,
          message: "Sites imported successfully",
          count: values.length,
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error: any) {
      console.error("Error importing sites:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // シート設定を取得
  router.get("/sheet-settings", async (req, res) => {
    try {
      const { year, month } = req.query;

      let query = "SELECT * FROM sheet_settings";
      const params: any[] = [];

      if (year && month) {
        query += " WHERE year = ? AND month = ?";
        params.push(year, month);
      }

      query += " ORDER BY year DESC, month DESC";

      const [rows] = await pool.execute(query, params);

      res.json({ success: true, data: rows });
    } catch (error: any) {
      console.error("Error fetching sheet settings:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // サイトマスタ一覧を取得
  router.get("/sites", async (req, res) => {
    try {
      const { year, month } = req.query;

      if (!year || !month) {
        return res.status(400).json({
          error: "year and month are required",
        });
      }

      const [rows] = await pool.execute(
        "SELECT * FROM site_master WHERE year = ? AND month = ? ORDER BY site_code",
        [year, month]
      );

      res.json({ success: true, data: rows });
    } catch (error: any) {
      console.error("Error fetching sites:", error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

