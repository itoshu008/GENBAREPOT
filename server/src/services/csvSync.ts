import axios from "axios";
import { pool } from "../database/connection";
import { Sheet } from "../types/sheets";

/**
 * Googleスプレッドシートの公開URLからCSVを取得
 */
async function fetchCSVFromSheet(url: string): Promise<string[][]> {
  try {
    // GoogleスプレッドシートのURLをCSVエクスポートURLに変換
    // 例: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit#gid=0
    // → https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/export?format=csv&gid=0

    let csvUrl = url;

    // スプレッドシートIDを抽出
    const sheetIdMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!sheetIdMatch) {
      throw new Error("Invalid Google Sheets URL");
    }

    const spreadsheetId = sheetIdMatch[1];

    // gidを抽出（シートID）
    const gidMatch = url.match(/[#&]gid=(\d+)/);
    const gid = gidMatch ? gidMatch[1] : "0";

    // CSVエクスポートURLを構築
    csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;

    // CSVを取得
    const response = await axios.get(csvUrl, {
      responseType: "text",
      headers: {
        Accept: "text/csv",
      },
    });

    // CSVをパース（簡易実装）
    const lines = response.data.split("\n");
    const rows: string[][] = [];

    for (const line of lines) {
      if (line.trim()) {
        // カンマ区切りで分割（簡易実装、引用符対応は省略）
        const cells = line.split(",").map((cell: string) => cell.trim());
        rows.push(cells);
      }
    }

    return rows;
  } catch (error: any) {
    console.error("Error fetching CSV:", error);
    throw new Error(`Failed to fetch CSV: ${error.message}`);
  }
}

/**
 * スプレッドシートデータを同期
 */
export async function syncSheetData(sheet: Sheet): Promise<{ count: number }> {
  try {
    // CSV取得
    const rows = await fetchCSVFromSheet(sheet.url);

    if (rows.length === 0) {
      throw new Error("No data found in sheet");
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      let count = 0;

      if (sheet.type === "sites") {
        // 現場マスタ同期
        // CSV形式: site_code, site_name, location (オプション)
        // ヘッダー行をスキップ（1行目）
        const dataRows = rows.slice(1);

        // 既存データ削除（同じ年月）
        await connection.execute(
          "DELETE FROM sites WHERE year = ? AND month = ?",
          [sheet.target_year, sheet.target_month]
        );

        // 新規データ挿入
        for (const row of dataRows) {
          const siteCode = row[0]?.toString().trim() || "";
          const siteName = row[1]?.toString().trim() || "";
          const location = row[2]?.toString().trim() || null;

          if (siteCode && siteName) {
            await connection.execute(
              `INSERT INTO sites (year, month, site_code, site_name, location)
               VALUES (?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE
                 site_name = VALUES(site_name),
                 location = VALUES(location),
                 updated_at = CURRENT_TIMESTAMP`,
              [sheet.target_year, sheet.target_month, siteCode, siteName, location]
            );
            count++;
          }
        }
      } else if (sheet.type === "staffs") {
        // スタッフマスタ同期
        // CSV形式: staff_code (オプション), staff_name, role (オプション)
        // ヘッダー行をスキップ（1行目）
        const dataRows = rows.slice(1);

        // 既存データ削除（同じ年月）
        await connection.execute(
          "DELETE FROM staffs WHERE year = ? AND month = ?",
          [sheet.target_year, sheet.target_month]
        );

        // 新規データ挿入
        for (const row of dataRows) {
          const staffCode = row[0]?.toString().trim() || null;
          const staffName = row[1]?.toString().trim() || "";
          const role = row[2]?.toString().trim() || null;

          if (staffName) {
            await connection.execute(
              `INSERT INTO staffs (year, month, staff_code, staff_name, role)
               VALUES (?, ?, ?, ?, ?)`,
              [sheet.target_year, sheet.target_month, staffCode, staffName, role]
            );
            count++;
          }
        }
      }

      await connection.commit();

      return { count };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error("Error syncing sheet data:", error);
    throw error;
  }
}

