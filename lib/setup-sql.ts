// SQL que cria as tabelas do sistema de várias rifas. Tudo com IF NOT EXISTS,
// então pode rodar quantas vezes quiser sem estragar nada.
export const SETUP_SQL: string[] = [
  `CREATE TABLE IF NOT EXISTS "Raffle" (
    "id" SERIAL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "prize" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "rules" TEXT NOT NULL DEFAULT '',
    "priceCents" INTEGER NOT NULL,
    "totalNumbers" INTEGER NOT NULL,
    "drawDate" TIMESTAMP(3),
    "drawMethod" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "winnerNumber" INTEGER,
    "winnerName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3)
  );`,
  `CREATE TABLE IF NOT EXISTS "Ticket" (
    "id" SERIAL PRIMARY KEY,
    "raffleId" INTEGER NOT NULL REFERENCES "Raffle"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "number" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'available',
    "buyerName" TEXT,
    "buyerPhone" TEXT,
    "buyerEmail" TEXT,
    "purchaseId" TEXT,
    "reservedAt" TIMESTAMP(3),
    "soldAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Ticket_raffleId_number_key" ON "Ticket" ("raffleId", "number");`,
  `CREATE INDEX IF NOT EXISTS "Ticket_raffleId_status_idx" ON "Ticket" ("raffleId", "status");`,
  `CREATE INDEX IF NOT EXISTS "Ticket_purchaseId_idx" ON "Ticket" ("purchaseId");`,
  `CREATE INDEX IF NOT EXISTS "Ticket_buyerPhone_idx" ON "Ticket" ("buyerPhone");`,
  `CREATE INDEX IF NOT EXISTS "Ticket_buyerEmail_idx" ON "Ticket" ("buyerEmail");`,
  `CREATE TABLE IF NOT EXISTS "Purchase" (
    "id" TEXT PRIMARY KEY,
    "raffleId" INTEGER NOT NULL REFERENCES "Raffle"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "numbers" INTEGER[] NOT NULL DEFAULT '{}',
    "buyerName" TEXT NOT NULL,
    "buyerPhone" TEXT NOT NULL,
    "buyerEmail" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "mpOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3)
  );`,
  `CREATE INDEX IF NOT EXISTS "Purchase_mpOrderId_idx" ON "Purchase" ("mpOrderId");`,
  `CREATE INDEX IF NOT EXISTS "Purchase_raffleId_idx" ON "Purchase" ("raffleId");`,
  `CREATE INDEX IF NOT EXISTS "Purchase_buyerPhone_idx" ON "Purchase" ("buyerPhone");`,
  `CREATE TABLE IF NOT EXISTS "RaffleImage" (
    "id" TEXT PRIMARY KEY,
    "raffleId" INTEGER NOT NULL REFERENCES "Raffle"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "mime" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE INDEX IF NOT EXISTS "RaffleImage_raffleId_idx" ON "RaffleImage" ("raffleId");`,
  `CREATE TABLE IF NOT EXISTS "Setting" (
    "key" TEXT PRIMARY KEY,
    "value" TEXT NOT NULL
  );`,
];
