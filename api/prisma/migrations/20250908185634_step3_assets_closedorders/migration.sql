-- CreateEnum
CREATE TYPE "public"."OrderSide" AS ENUM ('LONG', 'SHORT');

-- CreateTable
CREATE TABLE "public"."Asset" (
    "id" SERIAL NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "decimals" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ClosedOrder" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "assetId" INTEGER NOT NULL,
    "side" "public"."OrderSide" NOT NULL,
    "margin" BIGINT NOT NULL,
    "leverage" INTEGER NOT NULL,
    "entryPrice" BIGINT NOT NULL,
    "exitPrice" BIGINT NOT NULL,
    "pnl" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClosedOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Asset_symbol_key" ON "public"."Asset"("symbol");

-- CreateIndex
CREATE INDEX "ClosedOrder_userId_idx" ON "public"."ClosedOrder"("userId");

-- CreateIndex
CREATE INDEX "ClosedOrder_assetId_idx" ON "public"."ClosedOrder"("assetId");

-- AddForeignKey
ALTER TABLE "public"."ClosedOrder" ADD CONSTRAINT "ClosedOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ClosedOrder" ADD CONSTRAINT "ClosedOrder_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "public"."Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
