import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';
import { ServiceRequestStatus } from '@prisma/client';
import { NoContactInfo } from '../../../../common/validators/no-contact-info.validator';

export class UpdateServiceRequestDto {
  @IsOptional()
  @IsEnum(ServiceRequestStatus, { message: 'Estado inválido' })
  status?: ServiceRequestStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @NoContactInfo()
  providerNotes?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  priceUnit?: string;
}
