import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RideDriverProfileStatus, Role } from '@prisma/client';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../../common/decorators/require-permission.decorator';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../../common/guards/permissions.guard';
import { RolesGuard } from '../../../../common/guards/roles.guard';
import {
  ReviewRideDriverProfileDto,
  SubmitRideDriverProfileDto,
} from './ride-driver-profile.dto';
import { RideDriverProfilesService } from './ride-driver-profiles.service';

@Controller('ride-drivers')
@UseGuards(JwtAuthGuard, PermissionsGuard, RolesGuard)
export class RideDriverProfilesController {
  constructor(private readonly profiles: RideDriverProfilesService) {}

  @Get('me')
  @RequirePermission('corridas:manage')
  mine(@CurrentUser() user: { id: string }) {
    return this.profiles.getMine(user.id);
  }

  @Post('me')
  @RequirePermission('corridas:manage')
  submit(
    @CurrentUser() user: { id: string },
    @Body() dto: SubmitRideDriverProfileDto
  ) {
    return this.profiles.submit(user.id, dto);
  }

  @Get('admin')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  list(@Query('status') status?: string) {
    const valid = Object.values(RideDriverProfileStatus).includes(
      status as RideDriverProfileStatus
    );
    return this.profiles.list(
      valid ? (status as RideDriverProfileStatus) : undefined
    );
  }

  @Patch('admin/:id/review')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  review(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewRideDriverProfileDto
  ) {
    return this.profiles.review(user.id, id, dto);
  }
}
