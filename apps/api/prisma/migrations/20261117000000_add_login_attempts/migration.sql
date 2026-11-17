-- CreateTable
CREATE TABLE "LoginAttempt" (
    "attempt_key" TEXT NOT NULL,
    "failures" INTEGER NOT NULL DEFAULT 0,
    "blocked_until" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("attempt_key")
);
