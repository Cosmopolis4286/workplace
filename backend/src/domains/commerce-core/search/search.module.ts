import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { CatalogModule } from '../catalog/catalog.module';
import { ServicesModule } from '../services/services.module';
import { JobsModule } from '../../platform/jobs/jobs.module';
import { MatchingModule } from '../matching/matching.module';

@Module({
  imports: [CatalogModule, ServicesModule, JobsModule, MatchingModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
