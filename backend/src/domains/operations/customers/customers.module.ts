import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { PlansModule } from '../../money/plans/plans.module';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

@Module({
  imports: [PrismaModule, PlansModule],
  controllers: [CustomersController],
  providers: [CustomersService],
})
export class CustomersModule {}
