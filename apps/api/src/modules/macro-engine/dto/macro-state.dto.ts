export class MacroStateDto {
  interestRate: number = 2.5;
  inflation: number = 3.0;
  gdpGrowth: number = 2.8;
  volatility: number = 0.3;
  blackSwanActive?: boolean;
  blackSwanTier?: number;
  blackSwanEvent?: string;
}

export class OverrideMacroDto {
  interestRate?: number;
  inflation?: number;
  gdpGrowth?: number;
  volatility?: number;
  blackSwanActive?: boolean;
  blackSwanTier?: number;
  blackSwanEvent?: string;
}
