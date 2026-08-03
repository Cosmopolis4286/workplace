import { IsString, IsOptional, IsUUID, MaxLength } from 'class-validator';

export class CreateFreelancerApplicationDto {
  @IsUUID()
  categoryId: string;

  @IsOptional()
  @IsUUID()
  subcategoryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;
}
