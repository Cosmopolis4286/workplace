import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { AccountTypeGuard } from '../../../common/guards/account-type.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { RequireAccountType } from '../../../common/decorators/require-account-type.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { InviteDriverDto } from './dto/invite-driver.dto';

// Separado de DeliveryController porque `accept/:token` lo llama el
// repartidor invitado (cualquier cuenta con userId propio), no un comercio —
// DeliveryController exige @RequireAccountType('COMMERCE') a nivel de clase.
@Controller('delivery/driver-invitations')
export class DriverInvitationsController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard, AccountTypeGuard)
  @RequireAccountType('COMMERCE')
  @RequirePermission('delivery:manage_drivers')
  list(@CurrentUser() user: { id: string }) {
    return this.deliveryService.listInvitations(user.id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard, AccountTypeGuard)
  @RequireAccountType('COMMERCE')
  @RequirePermission('delivery:manage_drivers')
  invite(
    @CurrentUser() user: { id: string },
    @Body() dto: InviteDriverDto
  ) {
    return this.deliveryService.inviteDriver(user.id, dto);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AccountTypeGuard)
  @RequireAccountType('COMMERCE')
  @RequirePermission('delivery:manage_drivers')
  cancel(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.deliveryService.cancelInvitation(user.id, id);
  }

  // Público: permite mostrar contexto (comercio, si expiró) antes de pedir
  // login/registro en la página de aceptación.
  @Get(':token')
  preview(@Param('token') token: string) {
    return this.deliveryService.previewInvitation(token);
  }

  // El repartidor invitado acepta con su propia cuenta — cualquier usuario
  // autenticado, sin restricción de AccountType.
  @Post(':token/accept')
  @UseGuards(JwtAuthGuard)
  accept(@CurrentUser() user: { id: string }, @Param('token') token: string) {
    return this.deliveryService.acceptInvitation(token, user.id);
  }
}
