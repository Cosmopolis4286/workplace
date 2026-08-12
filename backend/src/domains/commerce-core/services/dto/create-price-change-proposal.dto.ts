import {
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateServiceRequestItemDto } from './create-service-request-item.dto';

export class CreatePriceChangeProposalDto {
  @IsNumber()
  @Min(0.01)
  proposedPrice: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CreateServiceRequestItemDto)
  items: CreateServiceRequestItemDto[];
}
