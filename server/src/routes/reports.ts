import { Router } from "express";
import { Server } from "socket.io";
import { pool } from "../database/connection";
import {
  Report,
  ReportStatus,
  ReportWithDetails,
  ReportFilter,
  ReportTime,
  ReportStaffEntry,
} from "../types/reports";

const router = Router();

export default function reportRoutes(io: Server) {
  // 報告書一覧取得（ロール別フィルタ対応）
  router.get("/", async (req, res) => {
    try {
      const {
        role,
        date_from,
        date_to,
        site_code,
        site_name,
        location,
        chief_name,
        status,
      } = req.query as any;

      let query = `
        SELECT r.*, s.location as site_location
        FROM reports r
        LEFT JOIN sites s ON r.site_id = s.id
        WHERE 1=1
      `;
      const params: any[] = [];

      // ロール別フィルタ
      if (role === "staff") {
        // スタッフは自分の報告書のみ
        query += ` AND r.created_by = ?`;
        params.push(req.query.staff_name || "");
      } else if (role === "chief") {
        // チーフは担当現場のみ
        if (chief_name) {
          query += ` AND r.chief_name = ?`;
          params.push(chief_name);
        }
      } else if (role === "sales") {
        // 営業は提出済みのみ
        query += ` AND r.status IN ('chief_submitted_to_sales', 'returned_by_sales', 'submitted_to_accounting')`;
      } else if (role === "accounting") {
        // 経理は営業から提出されたもののみ
        query += ` AND r.status IN ('submitted_to_accounting', 'returned_by_accounting')`;
      }

      // 日付フィルタ
      if (date_from) {
        query += ` AND r.report_date >= ?`;
        params.push(date_from);
      }
      if (date_to) {
        query += ` AND r.report_date <= ?`;
        params.push(date_to);
      }

      // 現場フィルタ
      if (site_code) {
        query += ` AND r.site_code LIKE ?`;
        params.push(`%${site_code}%`);
      }
      if (site_name) {
        query += ` AND r.site_name LIKE ?`;
        params.push(`%${site_name}%`);
      }
      if (location) {
        query += ` AND (r.location LIKE ? OR s.location LIKE ?)`;
        params.push(`%${location}%`, `%${location}%`);
      }
      if (chief_name) {
        query += ` AND r.chief_name = ?`;
        params.push(chief_name);
      }

      // ステータスフィルタ
      if (status) {
        query += ` AND r.status = ?`;
        params.push(status);
      }

      query += ` ORDER BY r.report_date DESC, r.created_at DESC`;

      const [rows] = await pool.execute(query, params);

      res.json({ success: true, data: rows });
    } catch (error: any) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // 報告書詳細取得（スタッフエントリ・時間記録含む）
  router.get("/:id", async (req, res) => {
    try {
      const { id } = req.params;

      // メインデータ取得
      const [reports] = await pool.execute(
        `SELECT r.*, s.location as site_location
         FROM reports r
         LEFT JOIN sites s ON r.site_id = s.id
         WHERE r.id = ?`,
        [id]
      ) as any[];

      if (reports.length === 0) {
        return res.status(404).json({ error: "Report not found" });
      }

      const report = reports[0];

      // 時間記録取得
      const [times] = await pool.execute(
        "SELECT * FROM report_times WHERE report_id = ?",
        [id]
      ) as any[];

      // スタッフエントリ取得
      const [staffEntries] = await pool.execute(
        "SELECT * FROM report_staff_entries WHERE report_id = ? ORDER BY id",
        [id]
      ) as any[];

      const result: ReportWithDetails = {
        ...report,
        times: times[0] || null,
        staff_entries: staffEntries,
      };

      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error("Error fetching report:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // 報告書作成
  router.post("/", async (req, res) => {
    try {
      const {
        report_date,
        site_id,
        site_code,
        site_name,
        location,
        staff_name,
        report_content,
        created_by,
      } = req.body;

      if (!report_date || !site_id || !site_code || !site_name) {
        return res.status(400).json({
          error: "report_date, site_id, site_code, and site_name are required",
        });
      }

      const connection = await pool.getConnection();
      await connection.beginTransaction();

      try {
        // 報告書作成
        const [result] = await connection.execute(
          `INSERT INTO reports (
            report_date, site_id, site_code, site_name, location,
            staff_report_content, status, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, 'staff_draft', ?)`,
          [
            report_date,
            site_id,
            site_code,
            site_name,
            location || null,
            report_content || null,
            created_by || staff_name || null,
          ]
        ) as any;

        const reportId = result.insertId;

        // スタッフエントリ作成
        if (staff_name && report_content) {
          await connection.execute(
            `INSERT INTO report_staff_entries (
              report_id, staff_name, report_content
            ) VALUES (?, ?, ?)`,
            [reportId, staff_name, report_content]
          );
        }

        await connection.commit();

        // Socket.IOで通知
        io.emit("report:created", { report_id: reportId });

        res.json({
          success: true,
          message: "Report created",
          data: { id: reportId },
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error: any) {
      console.error("Error creating report:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // 報告書更新
  router.put("/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const updated_by = updateData.updated_by || updateData.role;

      // 更新可能なフィールドを抽出
      const allowedFields = [
        "site_id",
        "site_code",
        "site_name",
        "location",
        "chief_name",
        "staff_report_content",
        "chief_report_content",
        "sales_comment",
        "accounting_comment",
        "return_reason",
      ];

      const updateFields: string[] = [];
      const updateValues: any[] = [];

      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          updateFields.push(`${field} = ?`);
          updateValues.push(updateData[field]);
        }
      }

      if (updated_by) {
        updateFields.push("updated_by = ?");
        updateValues.push(updated_by);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ error: "No fields to update" });
      }

      updateValues.push(id);

      await pool.execute(
        `UPDATE reports SET ${updateFields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        updateValues
      );

      // Socket.IOで通知
      io.emit("report:updated", { report_id: id });

      res.json({ success: true, message: "Report updated" });
    } catch (error: any) {
      console.error("Error updating report:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ステータス更新
  router.post("/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status, return_reason, updated_by } = req.body;

      if (!status) {
        return res.status(400).json({ error: "status is required" });
      }

      const validStatuses: ReportStatus[] = [
        "staff_draft",
        "staff_submitted",
        "chief_submitted_to_sales",
        "returned_by_sales",
        "submitted_to_accounting",
        "returned_by_accounting",
        "completed",
      ];

      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const connection = await pool.getConnection();
      await connection.beginTransaction();

      try {
        // ステータス更新
        await connection.execute(
          `UPDATE reports 
           SET status = ?, return_reason = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [status, return_reason || null, updated_by || null, id]
        );

        // コメント履歴に記録
        if (return_reason) {
          await connection.execute(
            `INSERT INTO report_comments (report_id, comment_type, comment_text, created_by)
             VALUES (?, 'return_reason', ?, ?)`,
            [id, return_reason, updated_by || "system"]
          );
        }

        await connection.execute(
          `INSERT INTO report_comments (report_id, comment_type, comment_text, created_by)
           VALUES (?, 'status_change', ?, ?)`,
          [id, `Status changed to ${status}`, updated_by || "system"]
        );

        await connection.commit();

        // Socket.IOで通知
        io.emit("report:statusChanged", { report_id: id, status });

        res.json({ success: true, message: "Status updated" });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error: any) {
      console.error("Error updating status:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // 時間記録更新
  router.put("/:id/times", async (req, res) => {
    try {
      const { id } = req.params;
      const { meeting_time, arrival_time, finish_time, departure_time } =
        req.body;

      // 既存レコード確認
      const [existing] = await pool.execute(
        "SELECT id FROM report_times WHERE report_id = ?",
        [id]
      ) as any[];

      if (existing.length > 0) {
        // 更新
        await pool.execute(
          `UPDATE report_times 
           SET meeting_time = ?, arrival_time = ?, finish_time = ?, departure_time = ?,
               updated_at = CURRENT_TIMESTAMP
           WHERE report_id = ?`,
          [
            meeting_time || null,
            arrival_time || null,
            finish_time || null,
            departure_time || null,
            id,
          ]
        );
      } else {
        // 新規作成
        await pool.execute(
          `INSERT INTO report_times (report_id, meeting_time, arrival_time, finish_time, departure_time)
           VALUES (?, ?, ?, ?, ?)`,
          [
            id,
            meeting_time || null,
            arrival_time || null,
            finish_time || null,
            departure_time || null,
          ]
        );
      }

      res.json({ success: true, message: "Times updated" });
    } catch (error: any) {
      console.error("Error updating times:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // スタッフエントリ追加・更新
  router.post("/:id/staff-entries", async (req, res) => {
    try {
      const { id } = req.params;
      const { staff_name, report_content, is_warehouse, is_selection, is_driving } =
        req.body;

      if (!staff_name) {
        return res.status(400).json({ error: "staff_name is required" });
      }

      // 既存エントリ確認
      const [existing] = await pool.execute(
        "SELECT id FROM report_staff_entries WHERE report_id = ? AND staff_name = ?",
        [id, staff_name]
      ) as any[];

      if (existing.length > 0) {
        // 更新
        await pool.execute(
          `UPDATE report_staff_entries 
           SET report_content = ?, is_warehouse = ?, is_selection = ?, is_driving = ?,
               updated_at = CURRENT_TIMESTAMP
           WHERE report_id = ? AND staff_name = ?`,
          [
            report_content || null,
            is_warehouse || false,
            is_selection || false,
            is_driving || false,
            id,
            staff_name,
          ]
        );
      } else {
        // 新規作成
        await pool.execute(
          `INSERT INTO report_staff_entries 
           (report_id, staff_name, report_content, is_warehouse, is_selection, is_driving)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            id,
            staff_name,
            report_content || null,
            is_warehouse || false,
            is_selection || false,
            is_driving || false,
          ]
        );
      }

      // Socket.IOで通知
      io.emit("report:staffUpdated", { report_id: id });

      res.json({ success: true, message: "Staff entry updated" });
    } catch (error: any) {
      console.error("Error updating staff entry:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // スタッフエントリ削除
  router.delete("/:id/staff-entries/:entryId", async (req, res) => {
    try {
      const { id, entryId } = req.params;

      await pool.execute(
        "DELETE FROM report_staff_entries WHERE id = ? AND report_id = ?",
        [entryId, id]
      );

      res.json({ success: true, message: "Staff entry deleted" });
    } catch (error: any) {
      console.error("Error deleting staff entry:", error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

