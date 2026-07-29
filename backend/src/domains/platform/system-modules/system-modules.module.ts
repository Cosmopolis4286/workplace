import { Global, Module } from '@nestjs/common';
import { SystemModulesController } from './system-modules.controller';
import { SystemModulesService } from './system-modules.service';
import { SYSTEM_MODULES_FACADE } from './system-modules.facade';
import { PrismaModule } from '../../../prisma/prisma.module';
import { RedisModule } from '../../../redis/redis.module';

@Global()
@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [SystemModulesController],
  providers: [
    SystemModulesService,
    { provide: SYSTEM_MODULES_FACADE, useExisting: SystemModulesService },
  ],
  // SystemModulesService se sigue exportando (SystemModulesController es
  // intra-módulo, administración SUPERADMIN/ADMIN). Consumidores de OTROS
  // dominios deben inyectar SYSTEM_MODULES_FACADE — ver Fase 4/deuda
  // resuelta del refactor arquitectónico.
  exports: [SystemModulesService, SYSTEM_MODULES_FACADE],
})
export class SystemModulesModule {}
