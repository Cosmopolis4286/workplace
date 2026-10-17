import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  BnplInitiateParams,
  BnplInitiateResult,
  BnplProviderAdapter,
  BnplProviderCredentials,
  BnplStatusResult,
} from './bnpl-provider.interface';

// Adapter compartido por Cashea y Krece mientras no hay credenciales reales
// verificadas para un comercio (BnplSettings.isSimulated = true). No llama a
// ningún servicio externo: genera una referencia local y un link a la página
// de resolución simulada del propio frontend, para poder probar el flujo
// completo (checkout -> aprobación -> Order.paymentStatus = PAID) sin
// depender del proveedor real.
@Injectable()
export class SimulatedAdapter implements BnplProviderAdapter {
  async initiate(
    _creds: BnplProviderCredentials,
    params: BnplInitiateParams
  ): Promise<BnplInitiateResult> {
    const externalReference = `SIM-${randomUUID()}`;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // ventana de 1h estilo Cashea

    return {
      externalReference,
      checkoutUrl: `${frontendUrl}/bnpl/simulated/${externalReference}`,
      expiresAt,
      rawResponse: {
        simulated: true,
        orderId: params.orderId,
        amount: params.amount,
      },
    };
  }

  async checkStatus(
    _creds: BnplProviderCredentials,
    externalReference: string
  ): Promise<BnplStatusResult> {
    // En modo simulado no hay nada que "consultar": el estado solo avanza
    // cuando alguien llama al endpoint de desarrollo /bnpl/simulate/:id/resolve.
    return {
      status: 'PENDING',
      rawResponse: { simulated: true, externalReference },
    };
  }

  async cancel(
    _creds: BnplProviderCredentials,
    _externalReference: string
  ): Promise<void> {
    // no-op: no hay nada externo que cancelar en modo simulado.
  }
}
