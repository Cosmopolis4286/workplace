import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SellerPaymentMethod } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { CreateSellerPaymentAccountDto } from '../dto/seller-payment-account.dto';
import { VE_BANKS } from './ve-banks';

export const MAX_ACTIVE_SELLER_ACCOUNTS = 5;

const METHOD_CURRENCY: Record<SellerPaymentMethod, 'VES' | 'USD'> = {
  PAGO_MOVIL: 'VES',
  BANK_TRANSFER: 'VES',
  ZELLE: 'USD',
};

export type NormalizedSellerAccount = {
  method: SellerPaymentMethod;
  currency: 'VES' | 'USD';
  bankCode: string | null;
  bankName: string | null;
  holderName: string;
  holderDocument: string;
  phone: string | null;
  accountNumber: string | null;
  email: string | null;
};

const digits = (value?: string) => (value ?? '').replace(/\D/g, '');

/**
 * Cuentas propias del vendedor donde el comprador le paga directo. WorkPlace
 * solo guarda los datos para mostrarlos y conciliar: el dinero nunca pasa
 * por la plataforma.
 */
@Injectable()
export class SellerPaymentAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  listBanks() {
    return Object.entries(VE_BANKS).map(([code, name]) => ({ code, name }));
  }

  listMine(userId: string) {
    return this.prisma.sellerPaymentAccount.findMany({
      where: { userId },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
    });
  }

  listActiveForSeller(sellerUserId: string) {
    return this.prisma.sellerPaymentAccount.findMany({
      where: { userId: sellerUserId, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(userId: string, dto: CreateSellerPaymentAccountDto) {
    const data = this.normalize(dto);
    await this.assertActiveSlot(userId);
    return this.prisma.sellerPaymentAccount.create({
      data: { ...data, userId },
    });
  }

  async setActive(userId: string, id: string, isActive: boolean) {
    const account = await this.findOwned(userId, id);
    if (isActive && !account.isActive) await this.assertActiveSlot(userId);
    return this.prisma.sellerPaymentAccount.update({
      where: { id },
      data: { isActive },
    });
  }

  // Con reportes asociados se desactiva en vez de borrar: el historial de
  // pagos debe seguir mostrando a qué cuenta se pagó.
  async remove(userId: string, id: string) {
    await this.findOwned(userId, id);
    const used = await this.prisma.manualPaymentReport.count({
      where: { sellerPaymentAccountId: id },
    });
    if (used > 0) {
      await this.prisma.sellerPaymentAccount.update({
        where: { id },
        data: { isActive: false },
      });
      return { deleted: false, deactivated: true };
    }
    await this.prisma.sellerPaymentAccount.delete({ where: { id } });
    return { deleted: true, deactivated: false };
  }

  normalize(dto: CreateSellerPaymentAccountDto): NormalizedSellerAccount {
    const holderName = dto.holderName?.trim().replace(/\s+/g, ' ');
    if (!holderName || holderName.length < 3) {
      throw new BadRequestException('Indica el nombre del titular');
    }

    const doc = dto.holderDocument?.toUpperCase().replace(/[\s.]/g, '');
    const docMatch = doc?.match(/^([VEJGP])-?(\d{6,9})$/);
    if (!docMatch) {
      throw new BadRequestException(
        'Cédula o RIF inválido (ej. V-12345678 o J-123456789)'
      );
    }
    const holderDocument = `${docMatch[1]}-${docMatch[2]}`;

    const base = {
      method: dto.method,
      currency: METHOD_CURRENCY[dto.method],
      holderName,
      holderDocument,
      bankCode: null as string | null,
      bankName: null as string | null,
      phone: null as string | null,
      accountNumber: null as string | null,
      email: null as string | null,
    };

    if (dto.method === SellerPaymentMethod.ZELLE) {
      const email = dto.email?.trim().toLowerCase();
      if (!email) throw new BadRequestException('Indica el correo de Zelle');
      return { ...base, email };
    }

    const bankCode = digits(dto.bankCode);
    const bankName = VE_BANKS[bankCode];
    if (!bankName) throw new BadRequestException('Selecciona un banco válido');

    if (dto.method === SellerPaymentMethod.PAGO_MOVIL) {
      let phone = digits(dto.phone);
      if (phone.startsWith('58')) phone = `0${phone.slice(2)}`;
      if (!/^04\d{9}$/.test(phone)) {
        throw new BadRequestException(
          'Teléfono de pago móvil inválido (ej. 04141234567)'
        );
      }
      return { ...base, bankCode, bankName, phone };
    }

    const accountNumber = digits(dto.accountNumber);
    if (!/^\d{20}$/.test(accountNumber)) {
      throw new BadRequestException('La cuenta debe tener 20 dígitos');
    }
    if (!accountNumber.startsWith(bankCode)) {
      throw new BadRequestException(
        `La cuenta no corresponde a ${bankName} (debe empezar por ${bankCode})`
      );
    }
    return { ...base, bankCode, bankName, accountNumber };
  }

  private async findOwned(userId: string, id: string) {
    const account = await this.prisma.sellerPaymentAccount.findFirst({
      where: { id, userId },
    });
    if (!account) throw new NotFoundException('Cuenta de cobro no encontrada');
    return account;
  }

  private async assertActiveSlot(userId: string) {
    const active = await this.prisma.sellerPaymentAccount.count({
      where: { userId, isActive: true },
    });
    if (active >= MAX_ACTIVE_SELLER_ACCOUNTS) {
      throw new BadRequestException(
        `Puedes tener hasta ${MAX_ACTIVE_SELLER_ACCOUNTS} cuentas de cobro activas`
      );
    }
  }
}
