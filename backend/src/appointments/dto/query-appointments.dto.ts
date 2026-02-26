import { IsOptional, IsEnum, IsDateString, IsInt, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { AppointmentStatus } from '@prisma/client'

export class QueryAppointmentsDto {
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus

  @IsOptional()
  @IsDateString()
  dateFrom?: string

  @IsOptional()
  @IsDateString()
  dateTo?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number
}
