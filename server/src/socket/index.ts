import { Server, Socket } from "socket.io";

export function setupSocketIO(io: Server) {
  io.on("connection", (socket: Socket) => {
    console.log("Client connected:", socket.id);

    // 報告書の購読（特定の報告書IDを監視）
    socket.on("subscribe:report", (reportId: number) => {
      socket.join(`report:${reportId}`);
      console.log(`Client ${socket.id} subscribed to report:${reportId}`);
    });

    // 報告書の購読解除
    socket.on("unsubscribe:report", (reportId: number) => {
      socket.leave(`report:${reportId}`);
      console.log(`Client ${socket.id} unsubscribed from report:${reportId}`);
    });

    // ロール別の購読（例：営業は営業向けの更新を監視）
    socket.on("subscribe:role", (role: string) => {
      socket.join(`role:${role}`);
      console.log(`Client ${socket.id} subscribed to role:${role}`);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  // Socket.IOインスタンスをエクスポート（他のモジュールから使用可能にする）
  // 注意: この関数は既にioを受け取っているので、そのまま使用可能
}

// リアルタイム更新用のヘルパー関数
export function emitReportUpdated(io: Server, reportId: number, data?: any) {
  io.to(`report:${reportId}`).emit("report:updated", { report_id: reportId, ...data });
}

export function emitReportStatusChanged(io: Server, reportId: number, status: string, data?: any) {
  io.to(`report:${reportId}`).emit("report:statusChanged", {
    report_id: reportId,
    status,
    ...data,
  });
  // ロール別にも通知
  io.to("role:sales").emit("report:statusChanged", { report_id: reportId, status, ...data });
  io.to("role:accounting").emit("report:statusChanged", {
    report_id: reportId,
    status,
    ...data,
  });
}

export function emitReportStaffUpdated(io: Server, reportId: number, data?: any) {
  io.to(`report:${reportId}`).emit("report:staffUpdated", { report_id: reportId, ...data });
}

export function emitReportCreated(io: Server, reportId: number, data?: any) {
  io.emit("report:created", { report_id: reportId, ...data });
  // チーフ向けにも通知
  io.to("role:chief").emit("report:created", { report_id: reportId, ...data });
}

