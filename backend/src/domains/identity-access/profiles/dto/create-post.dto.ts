import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PostMediaTypeDto {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
}

export class PostMediaItemDto {
  @IsString()
  url: string;

  @IsEnum(PostMediaTypeDto)
  @IsOptional()
  type?: PostMediaTypeDto = PostMediaTypeDto.IMAGE;
}

export class CreatePostDto {
  @IsOptional()
  @IsString()
  @MaxLength(2200)
  caption?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PostMediaItemDto)
  media: PostMediaItemDto[];
}
