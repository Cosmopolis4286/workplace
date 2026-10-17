import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import {
  RateLimitGuard,
  RateLimit,
} from '../../../../common/guards/rate-limit.guard';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { ServiceRequestMessagesService } from './service-request-messages.service';
import { CreateMessageDto } from './dto/create-message.dto';

@UseGuards(JwtAuthGuard, RateLimitGuard)
@Controller('services/requests')
export class ServiceRequestMessagesController {
  constructor(
    private readonly messagesService: ServiceRequestMessagesService
  ) {}

  @Get('messages/unread-count')
  getUnreadCount(@CurrentUser() user: any) {
    return this.messagesService.getUnreadCount(user.id);
  }

  // Debe declararse antes de ':id/messages' — igual que 'messages/unread-count'
  // arriba, para que Nest no la matchee como ':id/messages' con id="messages".
  @Get('messages/unread-count-by-request')
  getUnreadCountByRequest(@CurrentUser() user: any) {
    return this.messagesService.getUnreadCountByRequest(user.id);
  }

  @Get(':id/messages')
  list(@Param('id') id: string, @CurrentUser() user: any) {
    return this.messagesService.list(id, user.id);
  }

  @Post(':id/messages')
  @RateLimit({
    windowMs: 60_000,
    maxRequests: 30,
    keyGenerator: (req) => `svc-msg:send:${(req as any).user?.id}`,
  })
  send(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: CreateMessageDto
  ) {
    return this.messagesService.send(id, user.id, dto);
  }

  @Patch(':id/messages/read')
  markRead(@Param('id') id: string, @CurrentUser() user: any) {
    return this.messagesService.markRead(id, user.id);
  }
}
