import { ArrayMinSize, ArrayMaxSize, IsArray, IsString, IsUUID } from 'class-validator';

// Límite de 200 a propósito: evita que un bulk masivo bloquee el event loop
// (cada item hace su propio UPDATE) o un payload abusivo desde un cliente
// malicioso — el catálogo de un menú real rara vez supera unos cientos de
// productos (ver menu.vue, carga completa con limit:1000).
const MAX_BULK_SIZE = 200;

export class BulkProductIdsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_BULK_SIZE)
  @IsUUID('4', { each: true })
  productIds: string[];
}

export class BulkMoveCategoryDto extends BulkProductIdsDto {
  @IsString()
  @IsUUID('4')
  categoryId: string;
}

// Reorder (drag-and-drop en /menu): el array completo en el orden deseado —
// el índice de cada id en el array se convierte en su nuevo sortOrder (ver
// MenuService.reorderCategories/reorderProducts), mismo patrón que
// SearchTabsService.reorder.
export class ReorderCategoriesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_BULK_SIZE)
  @IsUUID('4', { each: true })
  categoryIds: string[];
}

export class ReorderProductsDto extends BulkProductIdsDto {}
