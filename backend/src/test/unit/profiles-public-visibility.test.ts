import { ProfilesService } from '../../domains/identity-access/profiles/profiles.service';

describe('Visibilidad de la tienda desde el perfil público', () => {
  let service: ProfilesService;
  let prisma: any;

  function publicUser(isPublic: boolean) {
    return {
      id: 'owner-1',
      username: 'ana',
      firstName: 'Ana',
      lastName: 'Pérez',
      avatar: null,
      coverImage: null,
      role: 'PROFESIONAL',
      commerce: {
        id: 'commerce-1',
        name: 'Tienda de Ana',
        type: 'Comercio',
        slug: 'tienda-ana',
        isPublic,
      },
      profileSettings: { showCatalog: true, showServices: true },
      _count: { followers: 0, following: 0, posts: 0 },
    };
  }

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn() },
      review: {
        aggregate: jest.fn().mockResolvedValue({
          _avg: { rating: null },
          _count: { rating: 0 },
        }),
      },
      serviceRequest: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const notifications = {} as any;
    const redis = {
      get: jest.fn().mockResolvedValue(null),
      setex: jest.fn().mockResolvedValue(undefined),
    };
    const accountTypeResolver = {
      resolve: jest.fn().mockResolvedValue('COMMERCE'),
    };

    service = new ProfilesService(
      prisma,
      notifications,
      redis as any,
      accountTypeResolver as any
    );
  });

  it('no expone el slug de una tienda privada a visitantes', async () => {
    prisma.user.findUnique.mockResolvedValue(publicUser(false));

    const profile = await service.getPublicProfile('ana');

    expect(profile.commerce).toEqual({
      id: 'commerce-1',
      name: 'Tienda de Ana',
      type: 'Comercio',
      slug: null,
    });
  });

  it('permite al dueño conservar el enlace para previsualizar su tienda privada', async () => {
    prisma.user.findUnique.mockResolvedValue(publicUser(false));

    const profile = await service.getPublicProfile('ana', 'owner-1');

    expect(profile.commerce?.slug).toBe('tienda-ana');
  });

  it('mantiene visible el enlace cuando la tienda está publicada', async () => {
    prisma.user.findUnique.mockResolvedValue(publicUser(true));

    const profile = await service.getPublicProfile('ana');

    expect(profile.commerce?.slug).toBe('tienda-ana');
  });
});
