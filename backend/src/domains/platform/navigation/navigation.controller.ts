import { Controller, Get, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { NavigationService } from './navigation.service';

@Controller('navigation')
@UseGuards(JwtAuthGuard)
export class NavigationController {
  constructor(private readonly navigationService: NavigationService) {}

  /** Árbol de navegación del usuario autenticado (fuente única del sidebar) */
  @Get()
  getNavigation(@CurrentUser() user: { id: string; role: Role }) {
    return this.navigationService.buildNavigationForUser(user);
  }
}
