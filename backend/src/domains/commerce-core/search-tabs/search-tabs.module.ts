import { Module } from '@nestjs/common';
import { SearchTabsController } from './search-tabs.controller';
import { SearchTabsService } from './search-tabs.service';

@Module({
  controllers: [SearchTabsController],
  providers: [SearchTabsService],
  exports: [SearchTabsService],
})
export class SearchTabsModule {}
