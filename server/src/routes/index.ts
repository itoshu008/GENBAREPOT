import { Express } from "express";
import { Server } from "socket.io";
import masterRoutes from "./master";
import reportRoutes from "./reports";
import sheetRoutes from "./sheets";
import mastersRoutes from "./masters";
import availabilityRoutes from "./availability";

export function setupRoutes(app: Express, io: Server) {
  app.use("/api/master", masterRoutes(io));
  app.use("/api/reports", reportRoutes(io));
  app.use("/api/sheets", sheetRoutes(io));
  app.use("/api/masters", mastersRoutes());
  app.use("/api/availability", availabilityRoutes());
}

