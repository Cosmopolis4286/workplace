import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
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

  @Patch('disputes/:id/resolve')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  resolveDispute(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: ResolveDisputeDto
  ) {
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
