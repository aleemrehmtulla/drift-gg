import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { registerHandlers } from "./handlers.js";
import { logger } from "@repo/shared/logger";

export function initializeSocket(httpServer: HttpServer, corsOrigin: string): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: corsOrigin,
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    logger.debug(`Client connected: ${socket.id}`);
    registerHandlers(io, socket);

    socket.on("disconnect", () => {
      logger.debug(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
}
