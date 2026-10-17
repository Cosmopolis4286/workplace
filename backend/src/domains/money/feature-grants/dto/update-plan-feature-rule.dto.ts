import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsBoolean } from 'class-validator';
import { CreatePlanFeatureRuleDto } from './create-plan-feature-rule.dto';

export class UpdatePlanFeatureRuleDto extends PartialType(
  CreatePlanFeatureRuleDto
) {
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
