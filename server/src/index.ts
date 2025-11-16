import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
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

const PORT = process.env.PORT || 3001;

// ミドルウェア
app.use(cors());
app.use(express.json());

// データベース初期化
initDatabase();

// ルーティング
setupRoutes(app, io);

// Socket.IO設定
setupSocketIO(io);

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

