import { IsEnum, IsOptional, IsString } from 'class-validator'
import { NotificationType } from '@prisma/client'

export class CreateNotificationDto {
  @IsEnum(NotificationType)
  type: NotificationType

  @IsString()
  title: string

  @IsString()
  message: string

  @IsOptional()
  @IsString()
  icon?: string

  @IsOptional()
  @IsString()
  color?: string

  @IsOptional()
  @IsString()
  link?: string

  @IsOptional()
  metadata?: Record<string, any>
}
