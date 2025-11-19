/**
 * 写真自動削除サービス
 * 有効期限が過ぎた写真を自動削除します
 */

import { pool } from "../database/connection";
import fs from "fs";
import path from "path";

/**
 * 有効期限が過ぎた写真を削除
 */
async function cleanupExpiredPhotos(): Promise<void> {
  try {
    console.log("[PhotoCleanup] Starting cleanup of expired photos...");

    // 有効期限が過ぎた写真を取得
    const [expiredPhotos] = await pool.execute(
      `SELECT id, file_path FROM report_photos 
       WHERE expires_at <= NOW()`,
      []
    ) as any[];

    if (expiredPhotos.length === 0) {
      console.log("[PhotoCleanup] No expired photos to delete");
      return;
    }

    console.log(`[PhotoCleanup] Found ${expiredPhotos.length} expired photo(s)`);

    let deletedCount = 0;
    let fileDeletedCount = 0;

    for (const photo of expiredPhotos) {
      try {
        // ファイルを削除
        if (photo.file_path && fs.existsSync(photo.file_path)) {
          fs.unlinkSync(photo.file_path);
          fileDeletedCount++;
        }

        // データベースから削除
        await pool.execute("DELETE FROM report_photos WHERE id = ?", [photo.id]);
        deletedCount++;
      } catch (error: any) {
        console.error(
          `[PhotoCleanup] Error deleting photo ID ${photo.id}:`,
          error.message
        );
        // エラーが発生しても続行
      }
    }

    console.log(
      `[PhotoCleanup] Cleanup completed: ${deletedCount} record(s) deleted, ${fileDeletedCount} file(s) deleted`
    );
  } catch (error: any) {
    console.error("[PhotoCleanup] Fatal error during cleanup:", error.message);
  }
}

/**
 * 自動削除を開始
 * @param intervalHours 削除チェック間隔（時間）。デフォルトは24時間（1日）
 */
export function startPhotoCleanup(
  intervalHours: number = 24
): NodeJS.Timeout {
  const intervalMs = intervalHours * 60 * 60 * 1000;

  console.log(
    `[PhotoCleanup] Starting photo cleanup service (interval: ${intervalHours} hours)`
  );

  // 初回は即座に実行
  cleanupExpiredPhotos();

  // 定期的に実行
  const intervalId = setInterval(() => {
    cleanupExpiredPhotos();
  }, intervalMs);

  return intervalId;
}

/**
 * 自動削除を停止
 */
export function stopPhotoCleanup(intervalId: NodeJS.Timeout): void {
  clearInterval(intervalId);
  console.log("[PhotoCleanup] Photo cleanup service stopped");
}

