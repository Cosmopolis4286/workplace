import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ConversationThreadType, Role } from '@prisma/client';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import {
  RateLimit,
  RateLimitGuard,
} from '../../../common/guards/rate-limit.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ConversationsService } from './conversations.service';
import { SendConversationMessageDto } from './dto/send-conversation-message.dto';

// /conversations/CATALOG_ORDER/:id/messages · /conversations/REPORT/:id/messages
@Controller('conversations/:type/:id')
@UseGuards(JwtAuthGuard, RateLimitGuard)
export class ConversationsController {
  constructor(private readonly conversations: ConversationsService) {}

  @Get('messages')
  list(
    @Param('type', new ParseEnumPipe(ConversationThreadType))
    type: ConversationThreadType,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; role: Role }
  ) {
    return this.conversations.list(type, id, user);
  }

  @Post('messages')
  @RateLimit({
    windowMs: 60_000,
    maxRequests: 30,
    keyGenerator: (req) => `conversation:send:${(req as any).user?.id}`,
  })
  send(
    @Param('type', new ParseEnumPipe(ConversationThreadType))
    type: ConversationThreadType,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; role: Role },
    @Body() dto: SendConversationMessageDto
  ) {
    return this.conversations.send(type, id, user, dto.body);
  }

  @Patch('read')
  markRead(
    @Param('type', new ParseEnumPipe(ConversationThreadType))
    type: ConversationThreadType,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; role: Role }
  ) {
    return this.conversations.markRead(type, id, user);
  }
}
