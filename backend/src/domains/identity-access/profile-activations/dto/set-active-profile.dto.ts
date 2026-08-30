import { IsUUID } from 'class-validator';

export class SetActiveProfileDto {
  @IsUUID('4', { message: 'profileId inválido' })
  profileId: string;
}
