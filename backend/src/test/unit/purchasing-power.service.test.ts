import { Test, TestingModule } from '@nestjs/testing'
import { PurchasingPowerService } from '../../domains/money/purchasing-power/purchasing-power.service'
import { PrismaService } from '../../prisma/prisma.service'

describe('PurchasingPowerService', () => {
  let service: PurchasingPowerService

  const mockPrismaService = {
    purchase: { findMany: jest.fn() },
  }

  const commerceId = 'commerce-1'

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchasingPowerService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile()

    service = module.get<PurchasingPowerService>(PurchasingPowerService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('reports hasData=false when there are no purchases in the current window', async () => {
    mockPrismaService.purchase.findMany.mockResolvedValue([])

    const result = await service.getPurchasingPower(commerceId)

    expect(result.hasData).toBe(false)
    expect(result.purchasingPowerChangePct).toBeNull()
  })

  it('reports hasData=false when none of the current products were also bought in the previous window', async () => {
    mockPrismaService.purchase.findMany
      .mockResolvedValueOnce([{ productId: 'prod-1', quantity: 10, unitCostUsd: 12, product: { name: 'Aceite' } }])
      .mockResolvedValueOnce([]) // sin compras en la ventana anterior

    const result = await service.getPurchasingPower(commerceId)

    expect(result.hasData).toBe(false)
    expect(result.basketSize).toBe(0)
  })

  it('matches the audit example: same basket costs more to replace today than 30-60 days ago', async () => {
    // Cesta: 100 unidades de un producto. Hace 30-60 días costaba $10 c/u
    // (=$1000 la cesta). Hoy cuesta $11.80 c/u (=$1180) -> +18%.
    mockPrismaService.purchase.findMany
      .mockResolvedValueOnce([
        { productId: 'prod-1', quantity: 100, unitCostUsd: 11.8, product: { name: 'Harina' } },
      ])
      .mockResolvedValueOnce([
        { productId: 'prod-1', quantity: 100, unitCostUsd: 10, product: { name: 'Harina' } },
      ])

    const result = await service.getPurchasingPower(commerceId)

    expect(result.hasData).toBe(true)
    expect(result.basketSize).toBe(1)
    expect(result.valueAtPreviousPrices).toBe(1000)
    expect(result.valueAtCurrentPrices).toBe(1180)
    expect(result.purchasingPowerChangePct).toBeCloseTo(18, 1)
  })

  it('fixes the basket to CURRENT quantities so a quantity change does not distort the price signal', async () => {
    // Compró 200 unidades ahora (antes solo compraba 50) al mismo precio ->
    // el cambio de poder adquisitivo debe ser 0%, no reflejar el aumento de volumen.
    mockPrismaService.purchase.findMany
      .mockResolvedValueOnce([{ productId: 'prod-1', quantity: 200, unitCostUsd: 10, product: { name: 'Harina' } }])
      .mockResolvedValueOnce([{ productId: 'prod-1', quantity: 50, unitCostUsd: 10, product: { name: 'Harina' } }])

    const result = await service.getPurchasingPower(commerceId)

    expect(result.purchasingPowerChangePct).toBe(0)
    // La cesta usa la cantidad ACTUAL (200) valuada a ambos precios.
    expect(result.valueAtPreviousPrices).toBe(2000)
    expect(result.valueAtCurrentPrices).toBe(2000)
  })

  it('excludes products with no comparable purchase in the previous window from the basket', async () => {
    mockPrismaService.purchase.findMany
      .mockResolvedValueOnce([
        { productId: 'prod-1', quantity: 100, unitCostUsd: 11, product: { name: 'Harina' } },
        { productId: 'prod-2', quantity: 50, unitCostUsd: 20, product: { name: 'Producto nuevo' } },
      ])
      .mockResolvedValueOnce([
        { productId: 'prod-1', quantity: 100, unitCostUsd: 10, product: { name: 'Harina' } },
        // prod-2 no aparece en la ventana anterior -> se excluye de la cesta comparable.
      ])

    const result = await service.getPurchasingPower(commerceId)

    expect(result.basketSize).toBe(1)
    expect(result.basket[0].productId).toBe('prod-1')
  })

  it('computes a weighted average when a product has multiple purchases within the same window', async () => {
    mockPrismaService.purchase.findMany
      .mockResolvedValueOnce([
        { productId: 'prod-1', quantity: 60, unitCostUsd: 12, product: { name: 'Harina' } },
        { productId: 'prod-1', quantity: 40, unitCostUsd: 13, product: { name: 'Harina' } },
      ])
      .mockResolvedValueOnce([
        { productId: 'prod-1', quantity: 100, unitCostUsd: 10, product: { name: 'Harina' } },
      ])

    const result = await service.getPurchasingPower(commerceId)

    // Promedio ponderado: (60*12 + 40*13) / 100 = 12.4
    expect(result.basket[0].currentUnitCostUsd).toBeCloseTo(12.4, 2)
  })

  it('sorts the basket by change% descending, worst first', async () => {
    mockPrismaService.purchase.findMany
      .mockResolvedValueOnce([
        { productId: 'prod-1', quantity: 10, unitCostUsd: 11, product: { name: 'Sube poco' } },
        { productId: 'prod-2', quantity: 10, unitCostUsd: 15, product: { name: 'Sube mucho' } },
      ])
      .mockResolvedValueOnce([
        { productId: 'prod-1', quantity: 10, unitCostUsd: 10, product: { name: 'Sube poco' } },
        { productId: 'prod-2', quantity: 10, unitCostUsd: 10, product: { name: 'Sube mucho' } },
      ])

    const result = await service.getPurchasingPower(commerceId)

    expect(result.basket[0].productId).toBe('prod-2')
    expect(result.basket[1].productId).toBe('prod-1')
  })
})
