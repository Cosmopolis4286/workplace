import { RideVehicleType } from '@prisma/client';
import { RideDriverProfilesService } from './ride-driver-profiles.service';

describe('RideDriverProfilesService', () => {
  let prisma: any;
  let notifications: any;
  let service: RideDriverProfilesService;

  beforeEach(() => {
    prisma = {
      rideDriverProfile: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn(({ create }) => Promise.resolve(create)),
        update: jest.fn(({ data }) => Promise.resolve(data)),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ kycStatus: 'APPROVED' }),
      },
    };
    notifications = {
      notifyRideDriverProfileReviewed: jest.fn().mockResolvedValue(undefined),
    };
    service = new RideDriverProfilesService(prisma, notifications);
  });

  it('registra el vehículo normalizado y queda en revisión', async () => {
    const res = await service.submit('u1', {
      vehicleType: RideVehicleType.MOTORCYCLE,
      vehiclePlate: 'ab-12 3cd',
      vehicleModel: ' Bera SBR ',
      licenseNumber: 'v 12345678',
    });
    expect(res).toMatchObject({
      userId: 'u1',
      vehiclePlate: 'AB123CD',
      vehicleModel: 'Bera SBR',
      licenseNumber: 'V12345678',
      status: 'PENDING',
    });
  });

  it('sin perfil aprobado no puede aceptar corridas', async () => {
    prisma.rideDriverProfile.findUnique.mockResolvedValue({
      status: 'PENDING',
    });
    await expect(service.assertApprovedDriver('u1')).rejects.toThrow(
      'en revisión'
    );
    prisma.rideDriverProfile.findUnique.mockResolvedValue(null);
    await expect(service.assertApprovedDriver('u1')).rejects.toThrow(
      'Registra tu vehículo'
    );
  });

  it('aprobado pero sin KYC tampoco', async () => {
    prisma.rideDriverProfile.findUnique.mockResolvedValue({
      status: 'APPROVED',
    });
    prisma.user.findUnique.mockResolvedValue({ kycStatus: 'PENDING' });
    await expect(service.assertApprovedDriver('u1')).rejects.toThrow('KYC');
  });

  it('el admin no aprueba a alguien sin KYC y rechazar exige motivo', async () => {
    prisma.rideDriverProfile.findUnique.mockResolvedValue({
      id: 'p1',
      userId: 'u1',
      status: 'PENDING',
      user: { kycStatus: 'PENDING' },
    });
    await expect(
      service.review('admin', 'p1', { status: 'APPROVED' })
    ).rejects.toThrow('KYC');
    await expect(
      service.review('admin', 'p1', { status: 'REJECTED', reason: 'no' })
    ).rejects.toThrow('Explica');
    await service.review('admin', 'p1', {
      status: 'REJECTED',
      reason: 'La licencia está vencida',
    });
    expect(notifications.notifyRideDriverProfileReviewed).toHaveBeenCalledWith(
      'u1',
      'REJECTED',
      'La licencia está vencida'
    );
  });
});
