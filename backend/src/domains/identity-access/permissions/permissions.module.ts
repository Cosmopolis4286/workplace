import { Global, Module } from '@nestjs/common';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';
import { PERMISSIONS_FACADE } from './permissions.facade';
import { PrismaModule } from '../../../prisma/prisma.module';
import { RedisModule } from '../../../redis/redis.module';
import { UsersModule } from '../users/users.module';

@Global()
@Module({
  imports: [PrismaModule, RedisModule, UsersModule],
  controllers: [PermissionsController],
  providers: [
    PermissionsService,
    { provide: PERMISSIONS_FACADE, useExisting: PermissionsService },
  ],
  // PermissionsService se sigue exportando (permissions.guard.ts en common/ y
  // permissions.controller.ts son intra-módulo/borde). Consumidores de OTROS
  // dominios deben inyectar PERMISSIONS_FACADE — ver deuda documentada en
  // scripts/known-cross-domain-edges.json.
  exports: [PermissionsService, PERMISSIONS_FACADE],
})
export class PermissionsModule {}
