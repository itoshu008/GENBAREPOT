import { Express } from "express";
import { Server } from "socket.io";
import masterRoutes from "./master";

export function setupRoutes(app: Express, io: Server) {
  app.use("/api/master", masterRoutes(io));
}

