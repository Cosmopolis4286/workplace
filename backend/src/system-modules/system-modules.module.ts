import { Global, Module } from '@nestjs/common';
import { SystemModulesController } from './system-modules.controller';
import { SystemModulesService } from './system-modules.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';

@Global()
@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [SystemModulesController],
  providers: [SystemModulesService],
  exports: [SystemModulesService],
})
export class SystemModulesModule {}
