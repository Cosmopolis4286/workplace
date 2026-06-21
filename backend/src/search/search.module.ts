import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { CatalogModule } from '../catalog/catalog.module';
import { ServicesModule } from '../services/services.module';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [CatalogModule, ServicesModule, JobsModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
