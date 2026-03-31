import { Router } from "express";
import { getDailyLeaderboard } from "../game/daily.js";
import { logger } from "@repo/shared/logger";

const router = Router();

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

router.get("/daily", async (req, res) => {
  try {
    const raw = typeof req.query.date === "string" ? req.query.date : undefined;
    const dateStr = raw && DATE_REGEX.test(raw) ? raw : undefined;
    const page = typeof req.query.page === "string" ? parseInt(req.query.page, 10) || 1 : 1;
    const pageSize = typeof req.query.pageSize === "string" ? parseInt(req.query.pageSize, 10) || 20 : 20;
    const leaderboard = await getDailyLeaderboard(dateStr, page, pageSize);
    res.json(leaderboard);
  } catch (err) {
    logger.error("Failed to fetch daily leaderboard", err);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

export default router;
