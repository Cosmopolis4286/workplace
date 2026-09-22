import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';

export class MatchCandidateDto {
  @IsIn(['COMMERCE', 'PROFESSIONAL'])
  entityType: 'COMMERCE' | 'PROFESSIONAL';

  @IsString()
  entityId: string;

  @IsString()
  userId: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsBoolean()
  isAvailable: boolean;
}

export class MatchOriginDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;
}

export class RankCandidatesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MatchCandidateDto)
  candidates: MatchCandidateDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => MatchOriginDto)
  origin?: MatchOriginDto;
}
