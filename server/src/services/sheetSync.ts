import axios from "axios";
import { pool } from "../database/connection";
import { Sheet } from "../types/sheets";
import { extractSheetId, getValues, determineSheetName } from "./googleSheets";

/**
 * 列名（A, B, C...）を数値インデックスに変換
 */
function columnToIndex(column: string): number {
  let index = 0;
  for (let i = 0; i < column.length; i++) {
    index = index * 26 + (column.charCodeAt(i) - 64);
  }
  return index - 1; // A=0, B=1, C=2...
}

/**
 * 数値インデックスを列名（A, B, C...）に変換
 */
function indexToColumn(index: number): string {
  let column = "";
  index++;
  while (index > 0) {
    const remainder = (index - 1) % 26;
    column = String.fromCharCode(65 + remainder) + column;
    index = Math.floor((index - 1) / 26);
  }
  return column;
}

/**
 * Googleスプレッドシートからデータを取得（Google Sheets API優先、フォールバックでCSV）
 */
async function fetchSheetData(url: string, dateCol: string, siteNameCol: string, locationCol: string | null, staffCol: string, startRow: number): Promise<string[][]> {
  const spreadsheetId = extractSheetId(url);
  if (!spreadsheetId) {
    throw new Error("Invalid Google Sheets URL");
  }

  // Google Sheets APIが使えるか確認（環境変数が設定されているか）
  const hasGoogleSheetsKey = process.env.GOOGLE_SHEETS_KEY_FILE && process.env.GOOGLE_SHEETS_KEY_FILE.trim() !== "";
  const hasApiKey = process.env.GOOGLE_SHEETS_API_KEY && process.env.GOOGLE_SHEETS_API_KEY.trim() !== "";

  let serviceAccountError: any = null;

  // サービスアカウントを試す
  if (hasGoogleSheetsKey) {
    try {
      // Google Sheets APIを使用（非公開シートにもアクセス可能）
      // サービスアカウントで認証するため、zatgenba@gmail.comで共有されているスプレッドシートにもアクセス可能
      const sheetName = await determineSheetName(spreadsheetId, null);
      
      // 最大列を計算
      const colIndices = [
        columnToIndex(dateCol),
        columnToIndex(siteNameCol),
        locationCol ? columnToIndex(locationCol) : -1,
        columnToIndex(staffCol),
      ].filter((idx) => idx >= 0);
      
      const maxColIdx = Math.max(...colIndices);
      const endCol = indexToColumn(maxColIdx);
      
      // 範囲を指定（開始列から最大列まで、開始行から1000行まで）
      const range = `${sheetName}!${dateCol}${startRow}:${endCol}1000`;
      
      const values = await getValues(spreadsheetId, range);
      return values;
    } catch (error: any) {
      serviceAccountError = error;
      console.warn("Google Sheets API (service account) failed:", error.message);
    }
  }

  // APIキーを試す（サービスアカウントが失敗した場合、またはAPIキーのみが設定されている場合）
  if (hasApiKey) {
    try {
      // APIキーを使用（公開シートのみ）
      const sheetName = await determineSheetName(spreadsheetId, null);
      
      // 最大列を計算
      const colIndices = [
        columnToIndex(dateCol),
        columnToIndex(siteNameCol),
        locationCol ? columnToIndex(locationCol) : -1,
        columnToIndex(staffCol),
      ].filter((idx) => idx >= 0);
      
      const maxColIdx = Math.max(...colIndices);
      const endCol = indexToColumn(maxColIdx);
      
      // 範囲を指定（開始列から最大列まで、開始行から1000行まで）
      const range = `${sheetName}!${dateCol}${startRow}:${endCol}1000`;
      
      const values = await getValues(spreadsheetId, range);
      return values;
    } catch (error: any) {
      console.warn("Google Sheets API (API key) failed:", error.message);
      // フォールバック: CSVエクスポートURLを使用
    }
  }

  // CSVエクスポートURLを使用（公開シートのみ）
  try {
    // URLからgidを抽出（シートID）、なければ0（最初のシート）
    const gidMatch = url.match(/[#&]gid=(\d+)/);
    const gid = gidMatch ? gidMatch[1] : "0";

    // CSVエクスポートURLを構築
    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;

    // CSVを取得
    const response = await axios.get(csvUrl, {
      responseType: "text",
      headers: {
        Accept: "text/csv",
        "User-Agent": "Mozilla/5.0",
      },
      validateStatus: (status) => status < 500,
    });

    // 401エラーの場合は、スプレッドシートが非公開の可能性がある
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        "スプレッドシートが非公開です。スプレッドシートを「リンクを知っている全員」に公開するか、Google Sheets APIの認証情報を設定してください。"
      );
    }

    if (response.status !== 200) {
      throw new Error(`CSV取得に失敗しました: HTTP ${response.status}`);
    }

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
    // エラーメッセージをそのまま伝播
    if (error.message) {
      throw error;
    }
    throw new Error(`Failed to fetch sheet data: ${error.message || "Unknown error"}`);
  }
}

/**
 * 座標指定でスプレッドシートからデータを取得
 */
export async function syncSheetDataWithCoordinates(sheet: Sheet): Promise<{ count: number }> {
  try {
    if (!sheet.date_column || !sheet.site_name_column || !sheet.staff_column) {
      throw new Error("date_column, site_name_column, and staff_column are required");
    }

    const spreadsheetId = extractSheetId(sheet.url);
    if (!spreadsheetId) {
      throw new Error("Invalid Google Sheets URL");
    }

    // 座標から列インデックスを計算
    const startRow = sheet.start_row || 2;
    const dateCol = sheet.date_column.toUpperCase();
    const siteNameCol = sheet.site_name_column.toUpperCase();
    const locationCol = sheet.location_column?.toUpperCase() || null;
    const staffCol = sheet.staff_column.toUpperCase();

    // データを取得（Google Sheets API優先、フォールバックでCSV）
    const rows = await fetchSheetData(sheet.url, dateCol, siteNameCol, locationCol, staffCol, startRow);

    if (rows.length === 0) {
      throw new Error("No data found in sheet");
    }

    const dateColIdx = columnToIndex(dateCol);
    const siteNameColIdx = columnToIndex(siteNameCol);
    const locationColIdx = locationCol ? columnToIndex(locationCol) : -1;
    const staffColIdx = columnToIndex(staffCol);

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      let count = 0;

      // データ行を処理
      // Google Sheets APIの場合は、範囲指定で既にstart_rowから取得しているので、そのまま使用
      // CSVの場合は、start_rowから開始（0ベースなので-1）
      let dataRows = rows;
      // CSVの場合は、範囲指定ができないので、手動でスライス
      if (!process.env.GOOGLE_SHEETS_KEY_FILE || process.env.GOOGLE_SHEETS_KEY_FILE.trim() === "") {
        const dataStartRow = startRow - 1;
        dataRows = rows.slice(dataStartRow);
      }

      // 既存データ削除（同じ年月）
      // 注意: reportsテーブルとの外部キー制約があるため、報告書が存在するsitesは削除できない
      // そのため、既存のsitesを更新する方式に変更（ON DUPLICATE KEY UPDATEを使用）
      // DELETEは行わず、INSERT ... ON DUPLICATE KEY UPDATEで更新のみ行う

      // 新規データ挿入
      for (const row of dataRows) {
        // 座標から値を取得
        const dateValue = row[dateColIdx]?.toString().trim() || "";
        const siteNameValue = row[siteNameColIdx]?.toString().trim() || "";
        const locationValue = locationColIdx >= 0 ? (row[locationColIdx]?.toString().trim() || null) : null;
        const staffValue = row[staffColIdx]?.toString().trim() || "";

        // 空欄はスキップ（日付、現場名、担当者のいずれかが空ならスキップ）
        if (!dateValue || !siteNameValue || !staffValue) {
          continue;
        }

        // 日付をYYYY-MM-DD形式に変換
        let reportDate: string | null = null;
        
        // 日本語形式（YYYY年MM月DD日）を処理
        const japaneseDateMatch = dateValue.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
        if (japaneseDateMatch) {
          const [, year, month, day] = japaneseDateMatch;
          reportDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        } else if (dateValue.includes("/")) {
          // YYYY/MM/DD形式の場合
          const parts = dateValue.split("/");
          if (parts.length === 3) {
            reportDate = `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
          }
        } else if (dateValue.includes("-")) {
          // 既にYYYY-MM-DD形式の場合
          reportDate = dateValue;
        } else {
          // その他の形式を試す（Dateオブジェクトでパース）
          try {
            const parsedDate = new Date(dateValue);
            if (!isNaN(parsedDate.getTime())) {
              const year = parsedDate.getFullYear();
              const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
              const day = String(parsedDate.getDate()).padStart(2, "0");
              reportDate = `${year}-${month}-${day}`;
            }
          } catch (error) {
            console.warn(`Failed to parse date: ${dateValue}`, error);
          }
        }
        
        // 日付が変換できなかった場合はスキップ
        if (!reportDate) {
          console.warn(`Skipping row with invalid date format: ${dateValue}`);
          continue;
        }

        // サイトコードを生成（現場名から、または日付+現場名のハッシュ）
        const siteCode = `${sheet.target_year}${sheet.target_month.toString().padStart(2, "0")}_${siteNameValue.substring(0, 10)}`;

        // データベースに挿入（日付も保存）
        await connection.execute(
          `INSERT INTO sites (year, month, site_code, site_name, location, date)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             site_name = VALUES(site_name),
             location = VALUES(location),
             date = VALUES(date),
             updated_at = CURRENT_TIMESTAMP`,
          [sheet.target_year, sheet.target_month, siteCode, siteNameValue, locationValue, reportDate]
        );

        // スタッフマスタにも追加（存在しない場合）
        if (staffValue) {
          await connection.execute(
            `INSERT INTO staffs (year, month, staff_name, role)
             VALUES (?, ?, ?, 'staff')
             ON DUPLICATE KEY UPDATE
               updated_at = CURRENT_TIMESTAMP`,
            [sheet.target_year, sheet.target_month, staffValue]
          );
        }

        count++;
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
    console.error("Error syncing sheet data with coordinates:", error);
    throw error;
  }
}

/**
 * 日付でスプレッドシートからデータを取得（リアルタイム取得）
 */
export interface SheetRowData {
  date: string;
  site_name: string;
  location: string | null;
  staff_name: string;
}

/**
 * 日付をYYYY-MM-DD形式に変換
 */
function parseDate(dateValue: string): string | null {
  const trimmed = dateValue.trim();
  if (!trimmed) return null;

  // 日本語形式（YYYY年MM月DD日）を処理
  const japaneseDateMatch = trimmed.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (japaneseDateMatch) {
    const [, year, month, day] = japaneseDateMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // YYYY/MM/DD形式の場合
  if (trimmed.includes("/")) {
    const parts = trimmed.split("/");
    if (parts.length === 3) {
      return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
    }
  }

  // 既にYYYY-MM-DD形式の場合
  if (trimmed.includes("-")) {
    const parts = trimmed.split("-");
    if (parts.length === 3) {
      return trimmed;
    }
  }

  // その他の形式を試す（Dateオブジェクトでパース）
  try {
    const parsedDate = new Date(trimmed);
    if (!isNaN(parsedDate.getTime())) {
      const year = parsedDate.getFullYear();
      const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
      const day = String(parsedDate.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
  } catch (error) {
    console.warn(`Failed to parse date: ${trimmed}`, error);
  }

  return null;
}

/**
 * 指定された日付のスプレッドシートデータを取得
 */
export async function getSheetDataByDate(
  sheet: Sheet,
  targetDate: string
): Promise<SheetRowData[]> {
  if (!sheet.date_column || !sheet.site_name_column || !sheet.staff_column) {
    throw new Error("date_column, site_name_column, and staff_column are required");
  }

  const spreadsheetId = extractSheetId(sheet.url);
  if (!spreadsheetId) {
    throw new Error("Invalid Google Sheets URL");
  }

  // 座標から列インデックスを計算
  const startRow = sheet.start_row || 2;
  const dateCol = sheet.date_column.toUpperCase();
  const siteNameCol = sheet.site_name_column.toUpperCase();
  const locationCol = sheet.location_column?.toUpperCase() || null;
  const staffCol = sheet.staff_column.toUpperCase();

  // データを取得（Google Sheets API優先、フォールバックでCSV）
  const rows = await fetchSheetData(sheet.url, dateCol, siteNameCol, locationCol, staffCol, startRow);

  if (rows.length === 0) {
    return [];
  }

  const dateColIdx = columnToIndex(dateCol);
  const siteNameColIdx = columnToIndex(siteNameCol);
  const locationColIdx = locationCol ? columnToIndex(locationCol) : -1;
  const staffColIdx = columnToIndex(staffCol);

  // データ行を処理
  let dataRows = rows;
  // CSVの場合は、範囲指定ができないので、手動でスライス
  if (!process.env.GOOGLE_SHEETS_KEY_FILE || process.env.GOOGLE_SHEETS_KEY_FILE.trim() === "") {
    const dataStartRow = startRow - 1;
    dataRows = rows.slice(dataStartRow);
  }

  const result: SheetRowData[] = [];

  for (const row of dataRows) {
    // 座標から値を取得
    const dateValue = row[dateColIdx]?.toString().trim() || "";
    const siteNameValue = row[siteNameColIdx]?.toString().trim() || "";
    const locationValue = locationColIdx >= 0 ? (row[locationColIdx]?.toString().trim() || null) : null;
    const staffValue = row[staffColIdx]?.toString().trim() || "";

    // 空欄はスキップ
    if (!dateValue || !siteNameValue || !staffValue) {
      continue;
    }

    // 日付をYYYY-MM-DD形式に変換
    const reportDate = parseDate(dateValue);
    if (!reportDate) {
      continue;
    }

    // 指定された日付と一致する行のみを返す
    if (reportDate === targetDate) {
      result.push({
        date: reportDate,
        site_name: siteNameValue,
        location: locationValue,
        staff_name: staffValue,
      });
    }
  }

  return result;
}

