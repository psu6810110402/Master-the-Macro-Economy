import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ASSETS = [
  // TECH_STALWART (r: -1.8, pi: -0.5, g: 1.8)
  { symbol: 'AAPL', name: 'Apple Inc.', type: 'STOCK', price: 185.0 },
  { symbol: 'MSFT', name: 'Microsoft Corp.', type: 'STOCK', price: 420.0 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'STOCK', price: 155.0 },
  { symbol: 'META', name: 'Meta Platforms', type: 'STOCK', price: 485.0 },
  { symbol: 'ORCL', name: 'Oracle Corp.', type: 'STOCK', price: 125.0 },
  { symbol: 'CSCO', name: 'Cisco Systems', type: 'STOCK', price: 48.0 },
  { symbol: 'IBM', name: 'IBM Corp.', type: 'STOCK', price: 190.0 },
  
  // TECH_GROWTH (r: -3.2, pi: -1.8, g: 3.5)
  { symbol: 'NVDA', name: 'NVIDIA Corp.', type: 'STOCK', price: 880.0 },
  { symbol: 'TSLA', name: 'Tesla, Inc.', type: 'STOCK', price: 175.0 },
  { symbol: 'AMD', name: 'Advanced Micro Devices', type: 'STOCK', price: 160.0 },
  { symbol: 'CRM', name: 'Salesforce', type: 'STOCK', price: 300.0 },
  { symbol: 'ADBE', name: 'Adobe Inc.', type: 'STOCK', price: 500.0 },
  { symbol: 'NFLX', name: 'Netflix, Inc.', type: 'STOCK', price: 620.0 },
  { symbol: 'SQ', name: 'Block, Inc.', type: 'STOCK', price: 80.0 },
  { symbol: 'SHOP', name: 'Shopify Inc.', type: 'STOCK', price: 75.0 },
  { symbol: 'SNOW', name: 'Snowflake Inc.', type: 'STOCK', price: 160.0 },
  { symbol: 'PLTR', name: 'Palantir Technologies', type: 'STOCK', price: 23.0 },

  // FINANCE (r: 2.5, pi: 0.5, g: 1.2)
  { symbol: 'JPM', name: 'JPMorgan Chase', type: 'STOCK', price: 195.0 },
  { symbol: 'BAC', name: 'Bank of America', type: 'STOCK', price: 37.0 },
  { symbol: 'GS', name: 'Goldman Sachs', type: 'STOCK', price: 410.0 },
  { symbol: 'MS', name: 'Morgan Stanley', type: 'STOCK', price: 90.0 },
  { symbol: 'V', name: 'Visa Inc.', type: 'STOCK', price: 275.0 },
  { symbol: 'MA', name: 'Mastercard Inc.', type: 'STOCK', price: 460.0 },
  { symbol: 'AXP', name: 'American Express', type: 'STOCK', price: 220.0 },
  { symbol: 'PYPL', name: 'PayPal Holdings', type: 'STOCK', price: 65.0 },

  // ENERGY (r: -0.5, pi: 3.5, g: 1.0)
  { symbol: 'XOM', name: 'Exxon Mobil', type: 'STOCK', price: 115.0 },
  { symbol: 'CVX', name: 'Chevron Corp.', type: 'STOCK', price: 155.0 },
  { symbol: 'SHEL', name: 'Shell PLC', type: 'STOCK', price: 70.0 },
  { symbol: 'TTE', name: 'TotalEnergies', type: 'STOCK', price: 68.0 },
  { symbol: 'COP', name: 'ConocoPhillips', type: 'STOCK', price: 125.0 },
  { symbol: 'OIL', name: 'Crude Oil', type: 'COMMODITY', price: 82.0 },

  // HEALTHCARE (r: -0.8, pi: -0.2, g: 0.5)
  { symbol: 'JNJ', name: 'Johnson & Johnson', type: 'STOCK', price: 155.0 },
  { symbol: 'UNH', name: 'UnitedHealth Group', type: 'STOCK', price: 490.0 },
  { symbol: 'PFE', name: 'Pfizer Inc.', type: 'STOCK', price: 28.0 },
  { symbol: 'ABBV', name: 'AbbVie Inc.', type: 'STOCK', price: 175.0 },
  { symbol: 'LLY', name: 'Eli Lilly & Co.', type: 'STOCK', price: 780.0 },
  { symbol: 'MRK', name: 'Merck & Co.', type: 'STOCK', price: 125.0 },
  { symbol: 'TMO', name: 'Thermo Fisher Scientific', type: 'STOCK', price: 580.0 },

  // CONSUMER_STAP (r: -0.5, pi: 1.2, g: 0.3)
  { symbol: 'PG', name: 'Procter & Gamble', type: 'STOCK', price: 160.0 },
  { symbol: 'KO', name: 'Coca-Cola Co.', type: 'STOCK', price: 60.0 },
  { symbol: 'PEP', name: 'PepsiCo, Inc.', type: 'STOCK', price: 175.0 },
  { symbol: 'WMT', name: 'Walmart Inc.', type: 'STOCK', price: 60.0 },
  { symbol: 'COST', name: 'Costco Wholesale', type: 'STOCK', price: 720.0 },
  { symbol: 'PM', name: 'Philip Morris', type: 'STOCK', price: 92.0 },

  // CONSUMER_DISC (r: -2.0, pi: -1.0, g: 2.5)
  { symbol: 'AMZN', name: 'Amazon.com, Inc.', type: 'STOCK', price: 180.0 },
  { symbol: 'HD', name: 'Home Depot', type: 'STOCK', price: 350.0 },
  { symbol: 'MCD', name: 'McDonalds Corp.', type: 'STOCK', price: 280.0 },
  { symbol: 'NKE', name: 'Nike, Inc.', type: 'STOCK', price: 95.0 },
  { symbol: 'SBUX', name: 'Starbucks Corp.', type: 'STOCK', price: 88.0 },
  { symbol: 'LOW', name: 'Lowes Companies', type: 'STOCK', price: 240.0 },

  // INDUSTRIAL (r: -1.5, pi: 1.0, g: 2.2)
  { symbol: 'CAT', name: 'Caterpillar Inc.', type: 'STOCK', price: 350.0 },
  { symbol: 'GE', name: 'General Electric', type: 'STOCK', price: 155.0 },
  { symbol: 'HON', name: 'Honeywell', type: 'STOCK', price: 200.0 },
  { symbol: 'BA', name: 'Boeing Co.', type: 'STOCK', price: 180.0 },
  { symbol: 'UPS', name: 'United Parcel Service', type: 'STOCK', price: 150.0 },
  { symbol: 'MMM', name: '3M Company', type: 'STOCK', price: 95.0 },

  // UTILITIES (r: -2.5, pi: 0.8, g: 0.2)
  { symbol: 'NEE', name: 'NextEra Energy', type: 'STOCK', price: 65.0 },
  { symbol: 'DUK', name: 'Duke Energy', type: 'STOCK', price: 95.0 },
  { symbol: 'SO', name: 'Southern Company', type: 'STOCK', price: 72.0 },
  { symbol: 'D', name: 'Dominion Energy', type: 'STOCK', price: 48.0 },

  // REIT_RES (r: -3.5, pi: 2.5, g: 1.5)
  { symbol: 'AMT', name: 'American Tower', type: 'STOCK', price: 190.0 },
  { symbol: 'PLD', name: 'Prologis, Inc.', type: 'STOCK', price: 120.0 },
  { symbol: 'CCI', name: 'Crown Castle', type: 'STOCK', price: 105.0 },
  { symbol: 'VNQ', name: 'Vanguard Real Estate ETF', type: 'REAL_ESTATE', price: 88.0 },

  // CRYPTO (r: -5.0, pi: 1.5, g: 2.0)
  { symbol: 'BTC', name: 'Bitcoin', type: 'CRYPTO', price: 68000.0 },
  { symbol: 'ETH', name: 'Ethereum', type: 'CRYPTO', price: 3500.0 },
  { symbol: 'SOL', name: 'Solana', type: 'CRYPTO', price: 170.0 },
  { symbol: 'BNB', name: 'Binance Coin', type: 'CRYPTO', price: 580.0 },
  { symbol: 'XRP', name: 'XRP', type: 'CRYPTO', price: 0.62 },
  { symbol: 'ADA', name: 'Cardano', type: 'CRYPTO', price: 0.58 },
  { symbol: 'DOT', name: 'Polkadot', type: 'CRYPTO', price: 9.50 },

  // COMMODITY (r: -1.0, pi: 2.8, g: -0.5)
  { symbol: 'GOLD', name: 'Gold Bullion', type: 'COMMODITY', price: 2350.0 },
  { symbol: 'SILVER', name: 'Silver', type: 'COMMODITY', price: 28.0 },
  { symbol: 'PLAT', name: 'Platinum', type: 'COMMODITY', price: 1000.0 },
  { symbol: 'COPP', name: 'Copper', type: 'COMMODITY', price: 4.80 },

  // BONDS (r: 4.5, pi: -3.0, g: -1.0)
  { symbol: 'TLT', name: 'iShares 20+ Yr Treasury', type: 'BOND', price: 92.0 },
  { symbol: 'IEF', name: 'iShares 7-10 Yr Treasury', type: 'BOND', price: 95.0 },
  { symbol: 'SHY', name: 'iShares 1-3 Yr Treasury', type: 'BOND', price: 82.0 },
  { symbol: 'LQD', name: 'iShares Corp Bond', type: 'BOND', price: 108.0 },
  { symbol: 'HYG', name: 'iShares High Yield Bond', type: 'BOND', price: 77.0 },
];

async function main() {
  console.log('--- Hackanomics: Seeding High-Fidelity Market ---');
  
  for (const asset of ASSETS) {
    const createdAsset = await prisma.asset.upsert({
      where: { symbol: asset.symbol },
      update: { type: asset.type, isActive: true },
      create: {
        symbol: asset.symbol,
        name: asset.name,
        type: asset.type,
      },
    });

    // Create a baseline price record
    await prisma.assetPrice.create({
      data: {
        assetId: createdAsset.id,
        price: asset.price,
        sessionId: null, // Baseline
        roundNumber: null,
      },
    });
  }

  // Generate filler stocks to reach exactly 100 if needed
  const count = await prisma.asset.count();
  if (count < 100) {
    console.log(`Adding ${100 - count} filler stocks...`);
    for (let i = count; i < 100; i++) {
      const sym = `SYM${i+1}`;
      const createdAsset = await prisma.asset.upsert({
        where: { symbol: sym },
        update: {},
        create: {
          symbol: sym,
          name: `Sector Asset ${i+1}`,
          type: 'STOCK',
        },
      });
      await prisma.assetPrice.create({
        data: { assetId: createdAsset.id, price: 100.0, sessionId: null },
      });
    }
  }

  console.log('Market seeding complete! [100 Assets Loaded] ✅');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
