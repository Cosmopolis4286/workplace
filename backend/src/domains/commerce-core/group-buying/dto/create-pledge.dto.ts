import { IsInt, Min } from 'class-validator';

export class CreatePledgeDto {
  @IsInt()
  @Min(1)
  quantity: number;
}
