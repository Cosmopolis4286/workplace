import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateVeLocationDto } from './create-ve-location.dto';

// type y parentId no se editan tras crear el nodo — para mover/recategorizar
// un nodo se borra y se crea de nuevo (evita inconsistencias de jerarquía).
export class UpdateVeLocationDto extends PartialType(
  OmitType(CreateVeLocationDto, ['type', 'parentId'] as const)
) {}
