import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { EscrowService } from './escrow.service';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';

// Solo el endpoint de resolución de disputas admin vive acá — abrir una
// disputa se hace desde el dominio dueño de la transacción (ver
// ServicesController.disputeRequest / CatalogController.disputeOrder), que
// ya valida que el caller sea parte real de esa transacción.
@Controller('escrow')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EscrowController {
  constructor(private readonly escrowService: EscrowService) {}

  @Get('disputes/open')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  listOpenDisputes() {
    return this.escrowService.listOpenDisputes();
  }

  // Mover dinero real: solo SUPERADMIN. Las disputas de solicitudes de
  // servicio se resuelven en PATCH /services/requests/disputes/:id/resolve,
  // que además cierra o cancela la solicitud y registra la comisión.
  @Patch('disputes/:id/resolve')
  @Roles(Role.SUPERADMIN)
  async resolveDispute(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: ResolveDisputeDto
  ) {
    if (await this.escrowService.isServiceRequestDispute(id)) {
      throw new BadRequestException(
        'Esta disputa es de una solicitud de servicio: resuélvela desde Disputas'
      );
    }
    return this.escrowService.resolveDispute({
      disputeId: id,
      resolvedById: user.id,
      resolution: dto.resolution,
      releaseAmount: dto.releaseAmount,
      refundAmount: dto.refundAmount,
      resolutionNote: dto.resolutionNote,
    });
  }
}
