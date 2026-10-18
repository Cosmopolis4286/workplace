export interface BnplProviderCredentials {
  publicApiKey?: string;
  privateApiKey?: string;
  storeId?: string;
  storeName?: string;
  externalClientId?: string;
  extraConfig?: Record<string, unknown>;
}

export interface BnplInitiateParams {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
}

export interface BnplInitiateResult {
  externalReference: string;
  checkoutUrl: string;
  expiresAt: Date | null;
  rawResponse: unknown;
}

export type BnplRemoteStatus =
  'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';

export interface BnplStatusResult {
  status: BnplRemoteStatus;
  installments?: number;
  rawResponse: unknown;
}

export interface BnplProviderAdapter {
  initiate(
    creds: BnplProviderCredentials,
    params: BnplInitiateParams
  ): Promise<BnplInitiateResult>;
  checkStatus(
    creds: BnplProviderCredentials,
    externalReference: string
  ): Promise<BnplStatusResult>;
  cancel(
    creds: BnplProviderCredentials,
    externalReference: string
  ): Promise<void>;
}
