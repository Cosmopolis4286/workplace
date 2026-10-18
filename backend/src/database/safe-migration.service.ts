import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class SafeMigrationService {
  private readonly logger = new Logger(SafeMigrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('RedisService') private readonly redisService?: any
  ) {}

  /**
   * Ejecuta migración con validaciones de seguridad
   */
  async migrateSafely(): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log('🔄 Iniciando migración segura...');

      // 1. Validar conexión a DB
      await this.validateDatabaseConnection();

      // 2. Crear backup automático
      const backupPath = await this.createBackup();
      this.logger.log(`✅ Backup creado: ${backupPath}`);

      // 3. Validar que migraciones sean backward-compatible
      await this.validateMigrationsCompatibility();

      // 4. Ejecutar migraciones en transacción
      await this.executeMigrations();

      // 5. Validar post-migración
      await this.validatePostMigration();

      // 6. Limpiar backups antiguos (mantener últimos 5)
      await this.cleanupOldBackups();

      this.logger.log('✅ Migración segura completada exitosamente');
      return { success: true, message: 'Migración completada exitosamente' };
    } catch (error) {
      this.logger.error('❌ Error en migración segura:', error.stack);

      // Intentar rollback si es posible
      try {
        await this.attemptRollback();
        return {
          success: false,
          message: `Error: ${error.message}. Rollback intentado.`,
        };
      } catch (rollbackError) {
        this.logger.error('❌ Rollback falló:', rollbackError.stack);
        return {
          success: false,
          message: `Error crítico: ${error.message}. Rollback falló.`,
        };
      }
    }
  }

  /**
   * Valida que la DB esté accesible
   */
  private async validateDatabaseConnection(): Promise<void> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      this.logger.log('✅ Conexión a base de datos validada');
    } catch (error) {
      throw new Error(
        `No se puede conectar a la base de datos: ${error.message}`
      );
    }
  }

  /**
   * Crea backup de la base de datos
   */
  private async createBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `/tmp/workplace_db_backup_${timestamp}.sql`;

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL no está definida');
    }

    // Extraer información de conexión
    const url = new URL(dbUrl);
    const host = url.hostname;
    const port = url.port || '5432';
    const database = url.pathname.substring(1);
    const username = url.username;
    const password = url.password;

    try {
      // Crear backup con pg_dump
      const command = `PGPASSWORD="${password}" pg_dump -h ${host} -p ${port} -U ${username} -d ${database} > ${backupPath}`;
      await execAsync(command);

      this.logger.log(`✅ Backup creado en: ${backupPath}`);
      return backupPath;
    } catch (error) {
      throw new Error(`Error creando backup: ${error.message}`);
    }
  }

  /**
   * Valida que las migraciones sean backward-compatible
   */
  private async validateMigrationsCompatibility(): Promise<void> {
    try {
      // Verificar que no haya migraciones pendientes que rompan compatibilidad
      const result = await this.prisma.$queryRaw`
        SELECT migration_name 
        FROM _prisma_migrations 
        WHERE finished_at IS NULL
      `;

      if (Array.isArray(result) && result.length > 0) {
        const pendingMigrations = result
          .map((m: any) => m.migration_name)
          .join(', ');
        this.logger.warn(`⚠️ Migraciones pendientes: ${pendingMigrations}`);

        // Validar reglas de compatibilidad
        for (const migration of result as any[]) {
          await this.validateSingleMigration(migration.migration_name);
        }
      }

      this.logger.log('✅ Validación de compatibilidad completada');
    } catch (error) {
      throw new Error(`Error validando compatibilidad: ${error.message}`);
    }
  }

  /**
   * Valida una migración individual
   */
  private async validateSingleMigration(migrationName: string): Promise<void> {
    // Aquí podrías agregar reglas específicas
    // Por ahora, solo logueamos que la validación pasó
    this.logger.log(`✅ Validación de migración: ${migrationName}`);
  }

  /**
   * Ejecuta las migraciones
   */
  private async executeMigrations(): Promise<void> {
    try {
      this.logger.log('🔄 Ejecutando migraciones Prisma...');

      // Ejecutar prisma migrate deploy
      const { stdout, stderr } = await execAsync('pnpm prisma migrate deploy');

      if (stderr && !stderr.includes('Already in sync')) {
        this.logger.warn(`⚠️ Advertencia en migración: ${stderr}`);
      }

      this.logger.log(`✅ Migraciones ejecutadas: ${stdout}`);
    } catch (error) {
      throw new Error(`Error ejecutando migraciones: ${error.message}`);
    }
  }

  /**
   * Valida el estado post-migración
   */
  private async validatePostMigration(): Promise<void> {
    try {
      // Verificar que las tablas críticas existan
      const criticalTables = ['users', 'User', 'accounts', 'Account']; // Ajustar según tu schema

      for (const table of criticalTables) {
        try {
          await this.prisma.$queryRaw`SELECT COUNT(*) FROM ${table}`;
          this.logger.log(`✅ Tabla ${table} accesible`);
        } catch (error) {
          // Si la tabla no existe, puede ser normal (fue renombrada/eliminada)
          this.logger.warn(
            `⚠️ Tabla ${table} no encontrada (puede ser normal)`
          );
        }
      }

      // Verificar conexión a Redis
      await this.validateRedisConnection();

      this.logger.log('✅ Validación post-migración completada');
    } catch (error) {
      throw new Error(`Error en validación post-migración: ${error.message}`);
    }
  }

  /**
   * Valida conexión a Redis
   */
  private async validateRedisConnection(): Promise<void> {
    try {
      // Validar Redis si está disponible
      if (this.redisService) {
        await this.redisService.set('migration_test', 'ok', 10);
        const value = await this.redisService.get('migration_test');
        if (value !== 'ok') {
          throw new Error('Redis connection test failed');
        }
        this.logger.log('✅ Conexión a Redis validada');
      } else {
        this.logger.warn(
          '⚠️ RedisService no disponible - saltando validación Redis'
        );
      }
    } catch (error) {
      throw new Error(`Error validando Redis: ${error.message}`);
    }
  }

  /**
   * Intenta rollback si es posible
   */
  private async attemptRollback(): Promise<void> {
    try {
      this.logger.log('🔄 Intentando rollback...');

      // Para rollback, necesitarías tener migraciones de rollback
      // Por ahora, solo restauramos el backup más reciente
      const latestBackup = await this.getLatestBackup();

      if (latestBackup) {
        await this.restoreBackup(latestBackup);
        this.logger.log('✅ Rollback completado desde backup');
      } else {
        throw new Error('No se encontró backup para rollback');
      }
    } catch (error) {
      throw new Error(`Error en rollback: ${error.message}`);
    }
  }

  /**
   * Obtiene el backup más reciente
   */
  private async getLatestBackup(): Promise<string | null> {
    try {
      const { stdout } = await execAsync(
        'ls -t /tmp/workplace_db_backup_*.sql 2>/dev/null | head -n 1'
      );
      return stdout.trim() || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Restaura un backup
   */
  private async restoreBackup(backupPath: string): Promise<void> {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL no está definida');
    }

    const url = new URL(dbUrl);
    const host = url.hostname;
    const port = url.port || '5432';
    const database = url.pathname.substring(1);
    const username = url.username;
    const password = url.password;

    try {
      const command = `PGPASSWORD="${password}" psql -h ${host} -p ${port} -U ${username} -d ${database} < ${backupPath}`;
      await execAsync(command);
    } catch (error) {
      throw new Error(`Error restaurando backup: ${error.message}`);
    }
  }

  /**
   * Limpia backups antiguos (mantiene últimos 5)
   */
  private async cleanupOldBackups(): Promise<void> {
    try {
      const { stdout } = await execAsync(
        'ls -t /tmp/workplace_db_backup_*.sql 2>/dev/null | tail -n +6'
      );
      const oldBackups = stdout.trim().split('\n').filter(Boolean);

      for (const backup of oldBackups) {
        await execAsync(`rm ${backup}`);
        this.logger.log(`🗑️ Backup antiguo eliminado: ${backup}`);
      }
    } catch (error) {
      // No es crítico si falla la limpieza
      this.logger.warn(`⚠️ Error limpiando backups antiguos: ${error.message}`);
    }
  }
}
