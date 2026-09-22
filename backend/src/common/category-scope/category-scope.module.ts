import { Global, Module } from '@nestjs/common';
import { CategoryScopeService } from './category-scope.service';
import { CategoryScopeGuard } from '../guards/category-scope.guard';

@Global()
@Module({
  providers: [CategoryScopeService, CategoryScopeGuard],
  exports: [CategoryScopeService, CategoryScopeGuard],
})
export class CategoryScopeModule {}
