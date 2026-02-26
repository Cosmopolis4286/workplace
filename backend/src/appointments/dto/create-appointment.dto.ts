import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  IsDateString,
  Min,
  Max,
  MaxLength,
} from 'class-validator'
import { AppointmentStatus } from '@prisma/client'

export class CreateAppointmentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  customerName: string

  @IsOptional()
  @IsString()
  @MaxLength(30)
  customerPhone?: string

  @IsOptional()
  @IsString()
  customerId?: string

  @IsDateString()
  date: string

  @IsInt()
  @Min(1)
  @Max(100)
  partySize: number

  @IsOptional()
  @IsInt()
  @Min(1)
  tableNumber?: number

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string

  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus
}
