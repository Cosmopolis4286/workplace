export const DatabasePool = () => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Importar PrismaService dinámicamente para evitar circular dependency
      const { PrismaService } = await import('../prisma/prisma.service');

      // Verificar disponibilidad del pool
      const poolStatus = PrismaService.getPoolStatus();

      if (!poolStatus.available) {
        console.warn(
          `🚫 DB Pool Decorator: Rejecting ${propertyKey} - Pool saturated`
        );
        throw new Error(
          `Database pool temporarily unavailable for ${propertyKey}`
        );
      }

      // Incrementar conexión
      PrismaService.incrementConnection();

      try {
        console.log(
          `🔗 DB Pool Decorator: Executing ${propertyKey} - ${poolStatus.active + 1}/15`
        );
        const result = await originalMethod.apply(this, args);
        return result;
      } finally {
        // Siempre liberar conexión
        PrismaService.decrementConnection();
        console.log(
          `🔌 DB Pool Decorator: Completed ${propertyKey} - ${poolStatus.active}/15`
        );
      }
    };

    return descriptor;
  };
};
