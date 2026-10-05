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
