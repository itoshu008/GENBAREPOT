/**
 * 自動同期サービス
 * 定期的にアクティブなスプレッドシートを自動同期します
 */

import { pool } from "../database/connection";
import { syncSheetDataWithCoordinates } from "./sheetSync";
import { syncSheetData } from "./csvSync";
import { Server } from "socket.io";
import { Sheet } from "../types/sheets";
import { extractSheetId, getSheetModifiedTime } from "./googleSheets";

/**
 * すべてのアクティブなスプレッドシートを同期
 */
async function syncAllActiveSheets(io: Server): Promise<void> {
  try {
    // アクティブなスプレッドシートを取得
    const [sheets] = await pool.execute(
      "SELECT * FROM sheets WHERE is_active = TRUE ORDER BY target_year DESC, target_month DESC"
    ) as any;

    if (sheets.length === 0) {
      console.log("[AutoSync] No active sheets to sync");
      return;
    }

    console.log(`[AutoSync] Starting sync for ${sheets.length} active sheet(s)...`);

    for (const sheet of sheets) {
      try {
        // 変更検知: スプレッドシートの最終更新日時を確認
        const spreadsheetId = extractSheetId(sheet.url);
        let shouldSync = true;
        
        if (spreadsheetId && sheet.last_synced_at) {
          try {
            const modifiedTime = await getSheetModifiedTime(spreadsheetId);
            if (modifiedTime) {
              const lastSynced = new Date(sheet.last_synced_at);
              // スプレッドシートの更新日時が前回同期時より新しい場合のみ同期
              if (modifiedTime <= lastSynced) {
                console.log(`[AutoSync] Sheet ID ${sheet.id} has no changes (last modified: ${modifiedTime.toISOString()}, last synced: ${lastSynced.toISOString()})`);
                shouldSync = false;
              } else {
                console.log(`[AutoSync] Sheet ID ${sheet.id} has changes (last modified: ${modifiedTime.toISOString()}, last synced: ${lastSynced.toISOString()})`);
              }
            }
          } catch (error: any) {
            console.warn(`[AutoSync] Could not check modification time for sheet ID ${sheet.id}, will sync anyway:`, error.message);
            // 変更検知に失敗した場合は同期を実行（安全側に倒す）
          }
        }

        if (!shouldSync) {
          continue; // 変更がない場合はスキップ
        }

        console.log(`[AutoSync] Syncing sheet ID ${sheet.id} (${sheet.target_year}/${sheet.target_month})...`);

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
          [sheet.id]
        );

        // Socket.IOで通知
        io.emit("sheet:synced", {
          sheet_id: sheet.id,
          type: sheet.type,
          count: result.count,
        });

        console.log(`[AutoSync] Successfully synced sheet ID ${sheet.id}: ${result.count} records`);
      } catch (error: any) {
        console.error(`[AutoSync] Error syncing sheet ID ${sheet.id}:`, error.message);
        // エラーが発生しても次のシートの同期を続行
      }
    }

    console.log("[AutoSync] Auto sync completed");
  } catch (error: any) {
    console.error("[AutoSync] Fatal error during auto sync:", error.message);
  }
}

/**
 * 自動同期を開始
 * @param io Socket.IOサーバーインスタンス
 * @param intervalMinutes 同期間隔（分）。デフォルトは60分（1時間）
 */
export function startAutoSync(io: Server, intervalMinutes: number = 60): NodeJS.Timeout {
  const intervalMs = intervalMinutes * 60 * 1000;

  console.log(`[AutoSync] Starting auto sync service (interval: ${intervalMinutes} minutes)`);

  // 初回は即座に実行
  syncAllActiveSheets(io);

  // 定期的に実行
  const intervalId = setInterval(() => {
    syncAllActiveSheets(io);
  }, intervalMs);

  return intervalId;
}

/**
 * 自動同期を停止
 */
export function stopAutoSync(intervalId: NodeJS.Timeout): void {
  clearInterval(intervalId);
  console.log("[AutoSync] Auto sync service stopped");
}

