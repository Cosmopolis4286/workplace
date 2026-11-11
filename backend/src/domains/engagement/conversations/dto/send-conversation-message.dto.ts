import { IsString, Length } from 'class-validator';

export class SendConversationMessageDto {
  @IsString()
  @Length(1, 2000)
  body: string;
}
