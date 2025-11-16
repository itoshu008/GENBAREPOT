import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

/**
 * URLからspreadsheetIdを抽出
 */
export function extractSheetId(url: string): string | null {
  const match = url.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

/**
 * Google Sheets APIで認証を取得
 */
async function getAuth() {
  // サービスアカウントのJSONキーファイルがある場合はそれを使用
  if (process.env.GOOGLE_SHEETS_KEY_FILE && process.env.GOOGLE_SHEETS_KEY_FILE.trim() !== "") {
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_SHEETS_KEY_FILE,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });
    return auth;
  }
  
  // APIキーがある場合はそれを使用（公開シートのみ）
  if (process.env.GOOGLE_SHEETS_API_KEY && process.env.GOOGLE_SHEETS_API_KEY.trim() !== "") {
    // APIキーの場合は認証オブジェクトを返す
    return process.env.GOOGLE_SHEETS_API_KEY;
  }
  
  throw new Error("GOOGLE_SHEETS_KEY_FILE or GOOGLE_SHEETS_API_KEY must be set");
}

/**
 * スプレッドシートのシート一覧を取得
 */
export async function getSheetNames(spreadsheetId: string): Promise<string[]> {
  try {
    const auth = await getAuth();
    const sheets = google.sheets({ 
      version: "v4", 
      auth: typeof auth === "string" ? undefined : auth,
      // APIキーの場合はクエリパラメータで指定
    });

    const requestParams: any = {
      spreadsheetId,
    };
    
    // APIキーの場合はクエリパラメータで指定
    if (typeof auth === "string") {
      requestParams.key = auth;
    }

    const response = await sheets.spreadsheets.get(requestParams);

    const sheetNames =
      response.data.sheets?.map((sheet) => sheet.properties?.title || "") || [];
    return sheetNames.filter((name) => name !== "");
  } catch (error) {
    console.error("Error getting sheet names:", error);
    throw error;
  }
}

/**
 * スプレッドシートから値を取得
 */
export async function getValues(
  spreadsheetId: string,
  range: string
): Promise<string[][]> {
  try {
    const auth = await getAuth();
    const sheets = google.sheets({ 
      version: "v4", 
      auth: typeof auth === "string" ? undefined : auth,
    });

    const requestParams: any = {
      spreadsheetId,
      range,
    };
    
    // APIキーの場合はクエリパラメータで指定
    if (typeof auth === "string") {
      requestParams.key = auth;
    }

    const response = await sheets.spreadsheets.values.get(requestParams);

    return response.data.values || [];
  } catch (error) {
    console.error("Error reading sheet:", error);
    throw error;
  }
}

/**
 * シート名を決定（指定がなければ最初のシートを使用）
 */
export async function determineSheetName(
  spreadsheetId: string,
  specifiedName?: string | null
): Promise<string> {
  if (specifiedName) {
    return specifiedName;
  }

  const sheetNames = await getSheetNames(spreadsheetId);
  if (sheetNames.length === 0) {
    throw new Error("No sheets found in spreadsheet");
  }

  return sheetNames[0];
}

/**
 * スプレッドシートの最終更新日時を取得
 * 注意: Google Sheets APIでは直接取得できないため、Drive APIを使用
 */
export async function getSheetModifiedTime(spreadsheetId: string): Promise<Date | null> {
  try {
    const auth = await getAuth();
    
    // サービスアカウントの場合のみDrive APIを使用
    if (typeof auth !== "string") {
      const drive = google.drive({ 
        version: "v3", 
        auth: auth,
      });

      const response = await drive.files.get({
        fileId: spreadsheetId,
        fields: "modifiedTime",
      });
      
      if (response.data.modifiedTime) {
        return new Date(response.data.modifiedTime);
      }
    }
    
    // APIキーの場合や取得に失敗した場合はnullを返す
    // （変更検知できない場合は同期を実行する）
    return null;
  } catch (error) {
    console.warn("Error getting sheet modified time:", error);
    // エラーが発生した場合はnullを返す（変更検知できない場合は同期を実行）
    return null;
  }
}

