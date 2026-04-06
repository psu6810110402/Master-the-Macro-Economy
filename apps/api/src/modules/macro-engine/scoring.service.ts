import { Injectable, Logger } from '@nestjs/common';

export interface ScoreComponents {
  sharpeRatio: number;        // (Return - RF) / Volatility
  maxDrawdown: number;        // Maximum peak-to-trough decline
  assetDiversity: number;     // HHI Index (1 - sum of squares of weights)
  blackSwanSurvival: number;  // Tier survival score (0, 1, 2, 3)
}

@Injectable()
export class ScoringService {
  private readonly logger = new Logger(ScoringService.name);

  /**
   * Diversity uses Herfindahl-Hirschman Index
   * 0 = perfectly concentrated (1 asset), 1 = perfectly diversified
   */
  calculateDiversity(holdings: Record<string, number>, totalValue: number): number {
    if (totalValue <= 0) return 0;
    
    let sumSquares = 0;
    for (const value of Object.values(holdings)) {
      const weight = value / totalValue;
      sumSquares += weight ** 2;
    }
    
    return 1 - sumSquares;
  }

  /**
   * Sharpe Ratio (simplified)
   */
  calculateSharpe(returns: number[], riskFreeRate: number = 0.00): number {
    if (returns.length < 2) return 0;
    
    const avg = returns.reduce((a, b) => a + b, 0) / returns.length;
    const diffs = returns.map(ret => (ret - avg) ** 2);
    const stdDev = Math.sqrt(diffs.reduce((a, b) => a + b, 0) / returns.length);
    
    if (stdDev === 0) return 0;
    return (avg - riskFreeRate) / stdDev;
  }

  /**
   * Final 0-1000 Score
   */
  calculateFinalScore(components: ScoreComponents): number {
    // Normalize each component based on expected ranges
    const sharpeScore = Math.min(400, Math.max(0, components.sharpeRatio * 100)); // Sharpe 4.0 = 400 pts
    const drawdownScore = Math.min(200, Math.max(0, (1 - components.maxDrawdown) * 200)); 
    const diversityScore = Math.min(200, Math.max(0, components.assetDiversity * 200));
    const survivalScore = Math.min(200, Math.max(0, components.blackSwanSurvival * 66.6)); // Tier 3 = 200 pts

    return Math.round(sharpeScore + drawdownScore + diversityScore + survivalScore);
  }

  /**
   * Max Drawdown: peak-to-trough decline across portfolio values over time.
   */
  calculateMaxDrawdown(portfolioValues: number[]): number {
    if (portfolioValues.length < 2) return 0;
    
    let peak = portfolioValues[0];
    let maxDrawdown = 0;
    
    for (const value of portfolioValues) {
      if (value > peak) peak = value;
      const drawdown = (peak - value) / peak;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }
    
    return maxDrawdown;
  }

  /**
   * Grade mapping: score → A/B/C/F
   */
  calculateGrade(normalizedScore: number, maxPoints: number): string {
    const pct = normalizedScore / maxPoints;
    if (pct >= 0.85) return 'A';
    if (pct >= 0.65) return 'B';
    if (pct >= 0.40) return 'C';
    return 'F';
  }

  /**
   * Black Swan Survival: how well did portfolio survive crash
   * Returns 0-3 based on loss severity during black swan rounds
   */
  calculateBlackSwanSurvival(returnPct: number): number {
    if (returnPct >= -0.05) return 3;    // Barely affected
    if (returnPct >= -0.15) return 2;    // Survived
    if (returnPct >= -0.30) return 1;    // Damaged
    return 0;                            // Catastrophic
  }
}

