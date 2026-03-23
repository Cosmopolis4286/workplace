import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MigrationStrategyService {
  private readonly logger = new Logger(MigrationStrategyService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Estrategia para agregar columnas (backward compatible)
   */
  async addColumnSafely(
    tableName: string,
    columnName: string,
    columnType: string,
    defaultValue?: any
  ): Promise<void> {
    this.logger.log(`➕ Agregando columna ${columnName} a ${tableName}`);
    
    try {
      // 1. Agregar columna como nullable (siempre safe)
      const nullableColumn = `${columnName}_new`;
      await this.prisma.$executeRawUnsafe(
        `ALTER TABLE "${tableName}" ADD COLUMN "${nullableColumn}" ${columnType}`
      );

      // 2. Si hay default value, poblar datos existentes
      if (defaultValue !== undefined) {
        await this.prisma.$executeRawUnsafe(
          `UPDATE "${tableName}" SET "${nullableColumn}" = $1 WHERE "${nullableColumn}" IS NULL`,
          defaultValue
        );
      }

      // 3. Marcar columna como NOT NULL si es necesario
      if (defaultValue !== undefined) {
        await this.prisma.$executeRawUnsafe(
          `ALTER TABLE "${tableName}" ALTER COLUMN "${nullableColumn}" SET NOT NULL`
        );
      }

      this.logger.log(`✅ Columna ${nullableColumn} agregada exitosamente`);
    } catch (error) {
      this.logger.error(`❌ Error agregando columna: ${error.message}`);
      throw error;
    }
  }

  /**
   * Estrategia para renombrar columnas (backward compatible)
   */
  async renameColumnSafely(
    tableName: string,
    oldColumnName: string,
    newColumnName: string
  ): Promise<void> {
    this.logger.log(`🏷️ Renombrando columna ${oldColumnName} → ${newColumnName} en ${tableName}`);
    
    try {
      // Fase 1: Agregar nueva columna
      await this.addColumnSafely(tableName, newColumnName, 'TEXT');
      
      // Fase 2: Copiar datos de columna vieja a nueva
      await this.prisma.$executeRawUnsafe(
        `UPDATE "${tableName}" SET "${newColumnName}_new" = "${oldColumnName}"`
      );

      // Fase 3: Deploy backend que usa nueva columna
      this.logger.log(`⏳ Esperando deploy que use nueva columna...`);
      
      // Fase 4: Eliminar columna vieja (en siguiente deploy)
      this.logger.log(`📝 Lista para eliminar columna vieja en siguiente deploy`);
      
    } catch (error) {
      this.logger.error(`❌ Error renombrando columna: ${error.message}`);
      throw error;
    }
  }

  /**
   * Estrategia para modificar tipo de columna (backward compatible)
   */
  async changeColumnTypeSafely(
    tableName: string,
    columnName: string,
    newType: string
  ): Promise<void> {
    this.logger.log(`🔄 Cambiando tipo de columna ${columnName} en ${tableName} a ${newType}`);
    
    try {
      // 1. Agregar nueva columna con nuevo tipo
      const tempColumn = `${columnName}_typed`;
      await this.prisma.$executeRawUnsafe(
        `ALTER TABLE "${tableName}" ADD COLUMN "${tempColumn}" ${newType}`
      );

      // 2. Convertir y copiar datos
      await this.prisma.$executeRawUnsafe(
        `UPDATE "${tableName}" SET "${tempColumn}" = CAST("${columnName}" AS ${newType})`
      );

      // 3. Deploy backend que usa nueva columna
      this.logger.log(`⏳ Esperando deploy que use nueva columna tipada...`);
      
      // 4. Eliminar columna vieja y renombrar nueva (en siguiente deploy)
      this.logger.log(`📝 Lista para reemplazar columna en siguiente deploy`);
      
    } catch (error) {
      this.logger.error(`❌ Error cambiando tipo de columna: ${error.message}`);
      throw error;
    }
  }

  /**
   * Estrategia para eliminar tablas (backward compatible)
   */
  async dropTableSafely(tableName: string): Promise<void> {
    this.logger.log(`🗑️ Preparando eliminación de tabla ${tableName}`);
    
    try {
      // 1. Renombrar tabla con sufijo _deprecated
      const deprecatedName = `${tableName}_deprecated_${Date.now()}`;
      await this.prisma.$executeRawUnsafe(
        `ALTER TABLE "${tableName}" RENAME TO "${deprecatedName}"`
      );

      // 2. Deploy backend que ya no usa la tabla
      this.logger.log(`⏳ Esperando deploy que no use tabla ${tableName}...`);
      
      // 3. Eliminar tabla completamente (en siguiente deploy)
      this.logger.log(`📝 Lista para eliminar tabla completamente en siguiente deploy`);
      
    } catch (error) {
      this.logger.error(`❌ Error preparando eliminación de tabla: ${error.message}`);
      throw error;
    }
  }

  /**
   * Estrategia para agregar índices (backward compatible)
   */
  async addIndexSafely(
    tableName: string,
    indexName: string,
    columns: string[],
    unique = false
  ): Promise<void> {
    this.logger.log(`📊 Agregando índice ${indexName} a ${tableName}`);
    
    try {
      const uniqueClause = unique ? 'UNIQUE' : '';
      const columnsStr = columns.map(col => `"${col}"`).join(', ');
      
      await this.prisma.$executeRawUnsafe(
        `CREATE ${uniqueClause} INDEX CONCURRENTLY "${indexName}" ON "${tableName}" (${columnsStr})`
      );

      this.logger.log(`✅ Índice ${indexName} agregado exitosamente`);
    } catch (error) {
      this.logger.error(`❌ Error agregando índice: ${error.message}`);
      throw error;
    }
  }

  /**
   * Estrategia para migración de datos compleja (backward compatible)
   */
  async migrateDataSafely(
    tableName: string,
    migrationSQL: string,
    batchSize = 1000
  ): Promise<void> {
    this.logger.log(`🔄 Migrando datos en ${tableName} (batch size: ${batchSize})`);
    
    try {
      // 1. Contar registros a migrar
      const countResult = await this.prisma.$queryRawUnsafe(
        `SELECT COUNT(*) as total FROM "${tableName}"`
      );
      const totalRecords = Number(countResult[0]?.total || 0);
      
      if (totalRecords === 0) {
        this.logger.log(`✅ No hay registros para migrar en ${tableName}`);
        return;
      }

      this.logger.log(`📊 Migrando ${totalRecords} registros...`);

      // 2. Migrar en batches para evitar locks largos
      let offset = 0;
      let processed = 0;

      while (offset < totalRecords) {
        await this.prisma.$executeRawUnsafe(
          migrationSQL.replace('LIMIT_CLAUSE', `LIMIT ${batchSize} OFFSET ${offset}`)
        );

        processed += Math.min(batchSize, totalRecords - offset);
        offset += batchSize;

        this.logger.log(`📈 Progreso: ${processed}/${totalRecords} (${Math.round(processed/totalRecords*100)}%)`);

        // Pequeña pausa para no sobrecargar la DB
        if (processed % (batchSize * 10) === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      this.logger.log(`✅ Migración de datos completada: ${processed} registros`);
    } catch (error) {
      this.logger.error(`❌ Error en migración de datos: ${error.message}`);
      throw error;
    }
  }

  /**
   * Valida que una migración sea backward compatible
   */
  validateBackwardCompatibility(migrationSQL: string): { safe: boolean; reason?: string } {
    const dangerousPatterns = [
      /DROP\s+TABLE/i,
      /DROP\s+COLUMN/i,
      /ALTER\s+TABLE.*DROP/i,
      /ALTER\s+TABLE.*RENAME/i,
      /DELETE\s+FROM.*WHERE/i, // Solo si no es cleanup
      /TRUNCATE/i,
    ];

    const safePatterns = [
      /ALTER\s+TABLE.*ADD\s+COLUMN/i,
      /CREATE\s+INDEX/i,
      /CREATE\s+TABLE/i,
      /INSERT\s+INTO/i,
      /UPDATE.*SET/i,
    ];

    // Verificar patrones peligrosos
    for (const pattern of dangerousPatterns) {
      if (pattern.test(migrationSQL)) {
        return { 
          safe: false, 
          reason: `Contiene operación potencialmente destructiva: ${pattern.source}` 
        };
      }
    }

    // Verificar que tenga patrones seguros
    const hasSafePattern = safePatterns.some(pattern => pattern.test(migrationSQL));
    if (!hasSafePattern && migrationSQL.trim()) {
      return { 
        safe: false, 
        reason: 'No se reconoce como operación segura' 
      };
    }

    return { safe: true };
  }

  /**
   * Genera script de migración backward compatible
   */
  generateBackwardCompatibleMigration(
    operation: string,
    tableName: string,
    details: any
  ): string[] {
    const migrations: string[] = [];

    switch (operation) {
      case 'ADD_COLUMN':
        migrations.push(
          `-- Fase 1: Agregar columna nullable`,
          `ALTER TABLE "${tableName}" ADD COLUMN "${details.columnName}_new" ${details.columnType};`,
          '',
          `-- Fase 2: Poblar datos (si aplica)`,
          `UPDATE "${tableName}" SET "${details.columnName}_new" = ${details.defaultValue || 'NULL'};`,
          '',
          `-- Fase 3: Deploy backend que usa nueva columna`,
          `-- Fase 4: Eliminar columna vieja (siguiente deploy)`
        );
        break;

      case 'RENAME_COLUMN':
        migrations.push(
          `-- Fase 1: Agregar nueva columna`,
          `ALTER TABLE "${tableName}" ADD COLUMN "${details.newColumnName}_new" TEXT;`,
          '',
          `-- Fase 2: Copiar datos`,
          `UPDATE "${tableName}" SET "${details.newColumnName}_new" = "${details.oldColumnName}";`,
          '',
          `-- Fase 3: Deploy backend que usa nueva columna`,
          `-- Fase 4: Eliminar columna vieja (siguiente deploy)`
        );
        break;

      default:
        migrations.push(`-- Operación ${operation} no implementada`);
    }

    return migrations;
  }
}
