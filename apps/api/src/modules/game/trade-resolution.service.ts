import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@hackanomics/database';

const prisma = new PrismaClient();

export interface PortfolioAllocation {
  [assetClass: string]: number; // Percentage (e.g., TECH: 30, BOND: 20)
}

@Injectable()
export class TradeResolutionService {
  private readonly logger = new Logger(TradeResolutionService.name);

  async commitPortfolio(
    sessionId: string,
    playerId: string,
    round: number,
    allocation: PortfolioAllocation,
    currentAssetPrices: Record<string, number>,
    isAutoLock: boolean = false
  ) {
    // 1. Validation: Sum must be 100%
    const totalAlloc = Object.values(allocation).reduce((sum, val) => sum + val, 0);
    if (Math.abs(totalAlloc - 100) > 0.01) {
      throw new BadRequestException(`Invalid allocation: Total must be 100%, got ${totalAlloc}%`);
    }

    // 2. Get the player's current portfolio to find total value
    const playerPortfolio = await prisma.portfolio.findFirst({
      where: { sessionPlayer: { sessionId, userId: playerId } },
    });

    if (!playerPortfolio) {
      throw new BadRequestException('Portfolio not found for player in this session');
    }

    const totalValue = Number(playerPortfolio.totalValue);

    // 3. Atomic Transaction: Save record + Update Holdings
    return await prisma.$transaction(async (tx: any) => {
      // Create permanent Record
      const record = await tx.tradeRecord.create({
        data: {
          sessionId,
          playerId,
          round,
          portfolio: JSON.stringify(allocation),
          totalValue,
          isAutoLock,
        },
      });

      // Update actual Holdings in the DB for persistence
      // We first clear existing holdings for this portfolio
      await tx.holding.deleteMany({
        where: { portfolioId: playerPortfolio.id },
      });

      // note: The 7 Macro Categories map to underlying asset types/sectors
      const categoryMapping: Record<string, string[]> = {
        'TECH': ['STOCK'], // Will filter for TECH sectors in logic
        'BOND': ['BOND'],
        'GOLD': ['COMMODITY'],
        'CRYPTO': ['CRYPTO'],
        'INDUSTRIAL': ['STOCK'],
        'REAL_ESTATE': ['REAL_ESTATE', 'STOCK'],
        'CASH': [],
      };

      const allAssets = await tx.asset.findMany({ where: { isActive: true } });
      
      let remainingCash = totalValue;

      for (const [category, percent] of Object.entries(allocation)) {
        if (percent <= 0 || category === 'CASH') continue;

        // Find assets belonging to this category
        let categoryAssets = allAssets.filter((a: any) => {
            if (category === 'TECH') return a.type === 'STOCK' && (a.symbol.startsWith('STK') || ['AAPL','MSFT','GOOGL','NVDA','TSLA','AMD'].includes(a.symbol));
            if (category === 'INDUSTRIAL') return a.type === 'STOCK' && ['CAT','GE','HON','BA','XOM','CVX'].includes(a.symbol);
            if (category === 'BOND') return a.type === 'BOND';
            if (category === 'GOLD') return a.type === 'COMMODITY';
            if (category === 'CRYPTO') return a.type === 'CRYPTO';
            if (category === 'REAL_ESTATE') return a.type === 'REAL_ESTATE' || a.symbol === 'VNQ';
            return false;
        });

        if (categoryAssets.length === 0) continue;

        const targetCategoryValue = (percent / 100) * totalValue;
        const valuePerAsset = targetCategoryValue / categoryAssets.length;

        for (const asset of categoryAssets) {
          const price = currentAssetPrices[asset.symbol] || 100;
          const quantity = valuePerAsset / price;

          await tx.holding.create({
            data: {
              portfolioId: playerPortfolio.id,
              assetId: asset.id,
              quantity,
              avgCost: price,
            },
          });
        }

        remainingCash -= targetCategoryValue;
      }

      // Update portfolio cash balance (should be close to 0 if 100% allocated)
      await tx.portfolio.update({
        where: { id: playerPortfolio.id },
        data: {
          cashBalance: Math.max(0, remainingCash),
          updatedAt: new Date(),
        },
      });

      return record;
    });
  }
}
