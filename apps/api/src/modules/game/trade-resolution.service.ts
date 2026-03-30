import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { prisma } from '../../prisma';

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

    // 2. Get the player's current holdings to calculate LIVE total value
    const playerPortfolio = await prisma.portfolio.findFirst({
      where: { sessionPlayer: { sessionId, userId: playerId } },
      include: {
        holdings: { include: { asset: true } }
      }
    });

    if (!playerPortfolio) {
      throw new BadRequestException('Portfolio not found for player in this session');
    }

    // Use current asset prices provided to calculate a live portfolio value
    let holdingsValue = 0;
    for (const h of playerPortfolio.holdings) {
      const price = currentAssetPrices[h.asset.symbol] || Number(h.avgCost) || 100;
      holdingsValue += Number(h.quantity) * price;
    }
    const liveTotalValue = Number(playerPortfolio.cashBalance) + holdingsValue;

    const maxTries = 5;

    for (let attempt = 1; attempt <= maxTries; attempt++) {
      try {
        return await prisma.$transaction(async (tx: any) => {
          // Create permanent Record
          const record = await tx.tradeRecord.create({
            data: {
              sessionId,
              playerId,
              round,
              portfolio: JSON.stringify(allocation),
              totalValue: liveTotalValue,
              isAutoLock,
            },
          });

          // Update actual Holdings in the DB for persistence
          // We first clear existing holdings for this portfolio
          await tx.holding.deleteMany({
            where: { portfolioId: playerPortfolio.id },
          });

          const allAssets = await tx.asset.findMany({ where: { isActive: true } });

          let remainingCash = liveTotalValue;
          const holdingInserts: any[] = [];

          for (const [category, percent] of Object.entries(allocation)) {
            if (percent <= 0 || category === 'CASH') continue;

            const categoryAssets = allAssets.filter((a: any) => {
              const sym = a.symbol.toUpperCase();
              if (category === 'TECH') return a.type === 'STOCK' && (sym.startsWith('STK') || ['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'TSLA', 'AMD', 'ORCL', 'CSCO', 'IBM', 'ADBE', 'NFLX', 'CRM', 'SNOW', 'PLTR'].includes(sym));
              if (category === 'INDUSTRIAL') return a.type === 'STOCK' && ['CAT', 'GE', 'HON', 'BA', 'XOM', 'CVX', 'JPM', 'BAC'].includes(sym);
              if (category === 'BOND') return a.type === 'BOND' || sym === 'US10Y';
              if (category === 'GOLD') return a.type === 'COMMODITY' || sym === 'GLD' || sym === 'GOLD';
              if (category === 'CRYPTO') return a.type === 'CRYPTO' || sym === 'BTC' || sym === 'ETH' || sym === 'SOL';
              if (category === 'REAL_ESTATE') return a.type === 'REAL_ESTATE' || sym === 'VNQ';
              return false;
            });

            if (categoryAssets.length === 0) continue;

            const targetCategoryValue = (percent / 100) * liveTotalValue;
            const valuePerAsset = targetCategoryValue / categoryAssets.length;

            for (const asset of categoryAssets) {
              const price = currentAssetPrices[asset.symbol] || 100;
              const quantity = valuePerAsset / price;

              holdingInserts.push({
                portfolioId: playerPortfolio.id,
                assetId: asset.id,
                quantity,
                avgCost: price,
              });
            }

            remainingCash -= targetCategoryValue;
          }

          if (holdingInserts.length > 0) {
            await tx.holding.createMany({ data: holdingInserts });
          }

          // Update portfolio cash balance and the cached totalValue (to reflect current reality at end of commit)
          await tx.portfolio.update({
            where: { id: playerPortfolio.id },
            data: {
              cashBalance: Math.max(0, remainingCash),
              totalValue: liveTotalValue,
              updatedAt: new Date(),
            },
          });

          return record;
        });
      } catch (err: any) {
        const shouldRetry = err.message?.includes('Unable to start a transaction');
        if (attempt < maxTries && shouldRetry) {
          await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
          continue;
        }
        throw err;
      }
    }

    throw new Error('Unable to commit portfolio after multiple retries');
  }
}

