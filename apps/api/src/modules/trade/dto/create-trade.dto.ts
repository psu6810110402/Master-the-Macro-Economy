import { IsString, IsNotEmpty, IsEnum, IsNumber, Min } from 'class-validator';

export enum TradeAction {
  BUY = 'BUY',
  SELL = 'SELL',
}

export class CreateTradeDto {
  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  @IsString()
  @IsNotEmpty()
  symbol!: string;

  @IsNumber()
  @Min(0.000001)
  quantity!: number;

  @IsEnum(TradeAction)
  action!: TradeAction;
}
