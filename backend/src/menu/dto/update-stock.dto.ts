import { IsInt, IsEnum, Min } from 'class-validator'

export enum StockUpdateType {
  SET = 'set',
  ADD = 'add',
  SUBTRACT = 'subtract',
}

export class UpdateStockDto {
  @IsInt()
  @Min(0)
  quantity: number

  @IsEnum(StockUpdateType)
  type: StockUpdateType
}
