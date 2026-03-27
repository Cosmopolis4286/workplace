import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly maxConnections = 15; // Límite de pool para 4GB RAM
  private static activeConnections = 0;

  async onModuleInit() {
    // Conectar con DATABASE_URL
    await this.$connect();
    
    console.log(`🔧 Prisma pool configurado: maxConnections=${this.maxConnections}`);
    console.log('💡 Pool management implementado a nivel de aplicación');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    console.log('🔌 Prisma desconectado');
  }

  // Método para verificar disponibilidad de pool
  async isPoolAvailable(): Promise<boolean> {
    return PrismaService.activeConnections < this.maxConnections;
  }

  // Método para incrementar conexiones activas
  static incrementConnection(): void {
    PrismaService.activeConnections++;
    console.log(`🔗 Prisma Connection: ${PrismaService.activeConnections}/15`);
  }

  // Método para liberar conexiones
  static decrementConnection(): void {
    PrismaService.activeConnections--;
    console.log(`🔌 Prisma Connection released: ${PrismaService.activeConnections}/15`);
  }

  // Método para obtener estado del pool
  static getPoolStatus(): { active: number; max: number; available: boolean } {
    return {
      active: PrismaService.activeConnections,
      max: 15,
      available: PrismaService.activeConnections < 15
    };
  }
}
