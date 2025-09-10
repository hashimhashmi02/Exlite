import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Decimals as per docs/examples: BTC=4, SOL=6; ETH commonly 4 in our stack.
  const assets = [
    {
      symbol: 'BTC',
      name: 'Bitcoin',
      imageUrl: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
      decimals: 4, // :contentReference[oaicite:9]{index=9}
    },
    {
      symbol: 'ETH',
      name: 'Ethereum',
      imageUrl: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
      decimals: 4,
    },
    {
      symbol: 'SOL',
      name: 'Solana',
      imageUrl: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
      decimals: 6, // :contentReference[oaicite:10]{index=10}
    },
  ];

  for (const a of assets) {
    await prisma.asset.upsert({
      where: { symbol: a.symbol },
      update: { name: a.name, imageUrl: a.imageUrl, decimals: a.decimals },
      create: a,
    });
  }
  console.log('✅ Seeded assets:', assets.map(a => a.symbol).join(', '));
}

main().finally(() => prisma.$disconnect());
