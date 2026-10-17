import { Injectable } from '@nestjs/common';
import { SimulatedAdapter } from './simulated.adapter';
import {
  BnplInitiateParams,
  BnplInitiateResult,
  BnplProviderAdapter,
  BnplProviderCredentials,
  BnplStatusResult,
} from './bnpl-provider.interface';

// Esqueleto de integración real con Cashea. BnplService decide si usar este
// adapter o SimulatedAdapter según BnplSettings.isSimulated, así que estos
// métodos solo se invocan una vez que un comercio tiene credenciales reales
// verificadas (Public/Private API Key, Store ID, External Client ID).
//
// TODO: reemplazar por llamada real al SDK/API de Cashea
// (cashea-web-checkout-sdk o el contrato HTTP que entregue el gestor de
// cuenta tras la afiliación) cuando lleguen las credenciales reales. Hasta
// entonces delega al SimulatedAdapter para no romper el flujo si isSimulated
// quedara mal configurado.
@Injectable()
export class CasheaAdapter implements BnplProviderAdapter {
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

  async cancel(
    creds: BnplProviderCredentials,
    externalReference: string
  ): Promise<void> {
    return this.fallback.cancel(creds, externalReference);
  }
}
