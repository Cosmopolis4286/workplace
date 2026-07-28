import { Module } from '@nestjs/common';
import { CorridasController } from './corridas.controller';
import { CorridasService } from './corridas.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PlatformFeesModule } from '../domains/money/platform-fees/platform-fees.module';

@Module({
  imports: [PrismaModule, PlatformFeesModule],
  controllers: [CorridasController],
  providers: [CorridasService],
})
export class CorridasModule {}
