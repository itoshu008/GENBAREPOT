import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import path from "path";
import { initDatabase } from "./database/connection";
import { setupRoutes } from "./routes";
import { setupSocketIO } from "./socket";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 4100;

// ミドルウェア
app.use(cors());
app.use(express.json());

// データベース初期化
initDatabase();

// ルーティング
setupRoutes(app, io);

// 静的ファイル配信（本番環境）
if (process.env.NODE_ENV === "production") {
  // __dirname は CommonJS で利用可能（TypeScriptコンパイル後）
  // server/dist/index.js から client/dist への相対パス
  const clientDistPath = path.join(__dirname, "../../client/dist");
  
  app.use(express.static(clientDistPath));
  
  // SPAフォールバック: すべてのルートを index.html にリダイレクト
  app.get("*", (req, res) => {
    // APIエンドポイントは除外
    if (req.path.startsWith("/api") || req.path.startsWith("/socket.io")) {
      return res.status(404).json({ error: "Not found" });
    }
    res.sendFile(path.join(clientDistPath, "index.html"));
  });
}

// Socket.IO設定
setupSocketIO(io);

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  if (process.env.NODE_ENV === "production") {
    const clientDistPath = path.join(__dirname, "../../client/dist");
    console.log(`Serving static files from: ${path.resolve(clientDistPath)}`);
  }
});

