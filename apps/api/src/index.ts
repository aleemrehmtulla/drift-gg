import "dotenv/config";
import express from "express";
import { createServer } from "http";
import cors from "cors";
import { validateEnv } from "@repo/shared/env";
import { logger } from "@repo/shared/logger";
import { initializeSocket } from "./socket/index.js";
import { createAbuseProtection } from "./middleware/rate-limit.js";
import healthRouter from "./routes/health.js";
import gamesRouter from "./routes/games.js";
import dailyRouter from "./routes/daily.js";

const env = validateEnv(
  {
    DATABASE_URL: { required: true },
    CORS_ORIGIN: { required: false, default: "http://localhost:3000" },
    PORT: { required: false, default: "5001" },
  },
  process.env,
);

const app = express();
const server = createServer(app);

app.set("trust proxy", 1);

initializeSocket(server, env.CORS_ORIGIN);

app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());
app.use(createAbuseProtection({ windowMs: 60_000, maxRequests: 500 }));

app.use("/api", healthRouter);
app.use("/api", gamesRouter);
app.use("/api", dailyRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error("Unhandled error", err);
  res.status(500).json({ error: "Internal server error" });
});

const port = parseInt(env.PORT, 10);
server.listen(port, () => {
  logger.info(`API running on http://localhost:${port}`);
});
