import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VeLocationType } from '@prisma/client';
import { CreateVeLocationDto } from './dto/create-ve-location.dto';
import { UpdateVeLocationDto } from './dto/update-ve-location.dto';

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Lectura pública (cualquier usuario autenticado) ─────────────────────────

  async getStates(): Promise<string[]> {
    const rows = await this.prisma.veLocation.findMany({
      where: { type: VeLocationType.MUNICIPIO, stateName: { not: null } },
      select: { stateName: true },
      distinct: ['stateName'],
      orderBy: { stateName: 'asc' },
    });
    return rows.map((r) => r.stateName as string);
  }

  async getMunicipios(stateName: string) {
    return this.prisma.veLocation.findMany({
      where: { type: VeLocationType.MUNICIPIO, stateName },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
  }

  async getCiudades(municipioId: string) {
    await this.assertExists(municipioId, VeLocationType.MUNICIPIO);
    return this.prisma.veLocation.findMany({
      where: { type: VeLocationType.CIUDAD, parentId: municipioId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
  }

  async getParroquias(ciudadId: string) {
    await this.assertExists(ciudadId, VeLocationType.CIUDAD);
    return this.prisma.veLocation.findMany({
      where: { type: VeLocationType.PARROQUIA, parentId: ciudadId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, postalCode: true },
    });
  }

  // ─── Admin ────────────────────────────────────────────────────────────────

  // Árbol completo, opcionalmente acotado a un estado para no traer las ~24
  // ramas completas de una sola vez en la UI de gestión.
  async getTree(stateName?: string) {
    const municipios = await this.prisma.veLocation.findMany({
      where: {
        type: VeLocationType.MUNICIPIO,
        ...(stateName ? { stateName } : {}),
      },
      orderBy: { name: 'asc' },
      include: {
        children: {
          orderBy: { name: 'asc' },
          include: {
            children: {
              orderBy: { name: 'asc' },
              select: { id: true, name: true, postalCode: true, type: true },
            },
          },
        },
      },
    });
    return municipios;
  }

  async create(dto: CreateVeLocationDto) {
    if (dto.type === VeLocationType.MUNICIPIO) {
      if (!dto.stateName) {
        throw new BadRequestException(
          'stateName es requerido para un Municipio'
        );
      }
      if (dto.parentId) {
        throw new BadRequestException('Un Municipio no tiene padre');
      }
    } else {
      if (!dto.parentId) {
        throw new BadRequestException(
          `parentId es requerido para ${dto.type}`
        );
      }
      const expectedParentType =
        dto.type === VeLocationType.CIUDAD
          ? VeLocationType.MUNICIPIO
          : VeLocationType.CIUDAD;
      await this.assertExists(dto.parentId, expectedParentType);
    }

    // findUnique con la clave compuesta no admite null en sus campos
    // (parentId/stateName son null para Ciudad/Parroquia y Municipio
    // respectivamente) — se usa findFirst, equivalente para este chequeo.
    const exists = await this.prisma.veLocation.findFirst({
      where: {
        name: dto.name,
        parentId: dto.parentId ?? null,
        type: dto.type,
        stateName: dto.type === VeLocationType.MUNICIPIO ? dto.stateName : null,
      },
    });
    if (exists) {
      throw new ConflictException('Ya existe un nodo con ese nombre aquí');
    }

    return this.prisma.veLocation.create({
      data: {
        type: dto.type,
        name: dto.name,
        parentId: dto.parentId ?? null,
        stateName: dto.type === VeLocationType.MUNICIPIO ? dto.stateName : null,
        postalCode:
          dto.type === VeLocationType.PARROQUIA ? dto.postalCode : null,
      },
    });
  }

  async update(id: string, dto: UpdateVeLocationDto) {
    const node = await this.prisma.veLocation.findUnique({ where: { id } });
    if (!node) throw new NotFoundException('Ubicación no encontrada');

    if (dto.name) {
      const exists = await this.prisma.veLocation.findFirst({
        where: {
          name: dto.name,
          parentId: node.parentId,
          type: node.type,
          stateName: node.stateName,
        },
      });
      if (exists && exists.id !== id) {
        throw new ConflictException('Ya existe un nodo con ese nombre aquí');
      }
    }

    return this.prisma.veLocation.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(node.type === VeLocationType.MUNICIPIO && dto.stateName
          ? { stateName: dto.stateName }
          : {}),
        ...(node.type === VeLocationType.PARROQUIA &&
        dto.postalCode !== undefined
          ? { postalCode: dto.postalCode }
          : {}),
      },
    });
  }

  async remove(id: string) {
    const node = await this.prisma.veLocation.findUnique({ where: { id } });
    if (!node) throw new NotFoundException('Ubicación no encontrada');
    // onDelete: Cascade en el schema elimina hijos automáticamente.
    await this.prisma.veLocation.delete({ where: { id } });
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async assertExists(id: string, type: VeLocationType) {
    const node = await this.prisma.veLocation.findUnique({ where: { id } });
    if (!node || node.type !== type) {
      throw new NotFoundException(`${type} no encontrado`);
    }
    return node;
  }
}
