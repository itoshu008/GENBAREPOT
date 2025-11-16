import { useEffect, useCallback } from "react";
import { getSocket } from "../services/socket";
import { ReportWithDetails } from "../services/reportsApi";

/**
 * 報告書のリアルタイム更新用カスタムフック
 * Socket.IOイベントを購読して、報告書の更新を自動反映
 */
export function useRealtimeReport(
  reportId: number | null | undefined,
  onUpdate: (data: any) => void,
  onStatusChange?: (status: string, data: any) => void
) {
  useEffect(() => {
    if (!reportId) return;

    const socket = getSocket();

    // 報告書の購読
    socket.emit("subscribe:report", reportId);

    // 報告書更新イベント
    const handleReportUpdated = (data: { report_id: number }) => {
      if (data.report_id === reportId) {
        onUpdate(data);
      }
    };

    // ステータス変更イベント
    const handleStatusChanged = (data: { report_id: number; status: string }) => {
      if (data.report_id === reportId && onStatusChange) {
        onStatusChange(data.status, data);
      }
    };

    // スタッフ更新イベント
    const handleStaffUpdated = (data: { report_id: number }) => {
      if (data.report_id === reportId) {
        onUpdate(data);
      }
    };

    socket.on("report:updated", handleReportUpdated);
    socket.on("report:statusChanged", handleStatusChanged);
    socket.on("report:staffUpdated", handleStaffUpdated);

    return () => {
      socket.off("report:updated", handleReportUpdated);
      socket.off("report:statusChanged", handleStatusChanged);
      socket.off("report:staffUpdated", handleStaffUpdated);
      socket.emit("unsubscribe:report", reportId);
    };
  }, [reportId, onUpdate, onStatusChange]);
}

/**
 * ロール別のリアルタイム更新用カスタムフック
 * 特定のロール（営業、経理など）向けの更新を監視
 */
export function useRealtimeRole(
  role: string | null | undefined,
  onUpdate: (data: any) => void
) {
  useEffect(() => {
    if (!role) return;

    const socket = getSocket();

    // ロールの購読
    socket.emit("subscribe:role", role);

    // ステータス変更イベント（ロール別）
    const handleStatusChanged = (data: { report_id: number; status: string }) => {
      onUpdate(data);
    };

    socket.on("report:statusChanged", handleStatusChanged);

    return () => {
      socket.off("report:statusChanged", handleStatusChanged);
    };
  }, [role, onUpdate]);
}

