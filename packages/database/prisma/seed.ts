import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const assets = [
    { symbol: 'AAPL', name: 'Apple Inc.', type: 'STOCK', initialPrice: 180 },
    { symbol: 'MSFT', name: 'Microsoft Corp.', type: 'STOCK', initialPrice: 415 },
    { symbol: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF', type: 'BOND', initialPrice: 95 },
    { symbol: 'BTC', name: 'Bitcoin', type: 'CRYPTO', initialPrice: 65000 },
    { symbol: 'ETH', name: 'Ethereum', type: 'CRYPTO', initialPrice: 3200 },
    { symbol: 'GOLD', name: 'Gold Bullion', type: 'COMMODITY', initialPrice: 2300 },
    { symbol: 'OIL', name: 'Crude Oil', type: 'COMMODITY', initialPrice: 85 },
    { symbol: 'VNQ', name: 'Vanguard Real Estate ETF', type: 'REAL_ESTATE', initialPrice: 85 },
  ];

  console.log('Seeding assets and initial prices...');

  for (const assetData of assets) {
    const { initialPrice, ...asset } = assetData;
    
    const createdAsset = await prisma.asset.upsert({
      where: { symbol: asset.symbol },
      update: { type: asset.type, isActive: true },
      create: asset,
    });

    // Create a baseline price record
    await prisma.assetPrice.create({
      data: {
        assetId: createdAsset.id,
        price: initialPrice,
        sessionId: null, // Baseline
        roundNumber: null,
      },
    });
  }

  console.log('Seed complete! ✅');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
