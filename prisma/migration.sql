-- Add updatedAt to User (existing rows get current timestamp)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();

-- Email verification fields
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verifyToken"   TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "User_verifyToken_key" ON "User"("verifyToken") WHERE "verifyToken" IS NOT NULL;

-- Add image to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "image" TEXT;

-- Change default balance to 10000 for new registrations
ALTER TABLE "User" ALTER COLUMN "balance" SET DEFAULT 10000;

-- Create Withdrawal table (idempotent)
CREATE TABLE IF NOT EXISTS "Withdrawal" (
  "id"        TEXT                     NOT NULL,
  "userId"    TEXT                     NOT NULL,
  "amount"    DOUBLE PRECISION         NOT NULL,
  "method"    TEXT                     NOT NULL,
  "details"   TEXT                     NOT NULL,
  "status"    TEXT                     NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT "Withdrawal_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Withdrawal_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Withdrawal_userId_idx"  ON "Withdrawal"("userId");
CREATE INDEX IF NOT EXISTS "Withdrawal_status_idx"  ON "Withdrawal"("status");
