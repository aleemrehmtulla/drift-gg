-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "code" TEXT,
    "shareCode" VARCHAR(7),
    "mode" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'hard',
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "targetBpm" INTEGER NOT NULL,
    "seed" INTEGER,
    "dailyDate" VARCHAR(10),
    "challengeSourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "name" VARCHAR(20) NOT NULL,
    "sessionId" TEXT NOT NULL,
    "isHost" BOOLEAN NOT NULL DEFAULT false,
    "score" INTEGER,
    "achievedBpmX100" INTEGER,
    "driftMs" INTEGER,
    "stdDevMsX100" INTEGER,
    "tapCount" INTEGER,
    "tapTimestamps" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Game_code_key" ON "Game"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Game_shareCode_key" ON "Game"("shareCode");

-- CreateIndex
CREATE INDEX "Game_dailyDate_idx" ON "Game"("dailyDate");

-- CreateIndex
CREATE INDEX "Game_createdAt_idx" ON "Game"("createdAt");

-- CreateIndex
CREATE INDEX "Game_challengeSourceId_idx" ON "Game"("challengeSourceId");

-- CreateIndex
CREATE INDEX "Player_gameId_idx" ON "Player"("gameId");

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_challengeSourceId_fkey" FOREIGN KEY ("challengeSourceId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
