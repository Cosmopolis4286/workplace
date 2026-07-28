import { Injectable } from '@nestjs/common';
import { SimulatedAdapter } from './simulated.adapter';
import {
  BnplInitiateParams,
  BnplInitiateResult,
  BnplProviderAdapter,
  BnplProviderCredentials,
  BnplStatusResult,
} from './bnpl-provider.interface';

// Esqueleto de integración real con Krece.
//
// TODO: Krece no tiene API pública documentada — confirmar el contrato
// (endpoints, payloads, autenticación, webhooks) directamente con el gestor
// de cuenta antes de implementar. Hasta entonces delega al SimulatedAdapter.
@Injectable()
export class KreceAdapter implements BnplProviderAdapter {
  constructor(private readonly fallback: SimulatedAdapter) {}

  async initiate(
    creds: BnplProviderCredentials,
    params: BnplInitiateParams
  ): Promise<BnplInitiateResult> {
    return this.fallback.initiate(creds, params);
  }

  async checkStatus(
    creds: BnplProviderCredentials,
    externalReference: string
  ): Promise<BnplStatusResult> {
    return this.fallback.checkStatus(creds, externalReference);
  }

  async cancel(creds: BnplProviderCredentials, externalReference: string): Promise<void> {
    return this.fallback.cancel(creds, externalReference);
  }
}
