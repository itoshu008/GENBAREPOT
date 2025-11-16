import { Server } from "socket.io";

export function setupSocketIO(io: Server) {
  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  // 報告書更新イベント（将来の実装用）
  // io.emit("report:updated", data);
  // io.emit("report:staffUpdated", data);
  // io.emit("report:statusChanged", data);
}

