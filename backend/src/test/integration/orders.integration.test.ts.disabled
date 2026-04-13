import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import * as request from 'supertest'
import { AppModule } from '../../app.module'
import { PrismaService } from '../../prisma/prisma.service'
import { JwtService } from '@nestjs/jwt'

describe('Orders Integration Tests', () => {
  let app: INestApplication
  let prismaService: PrismaService
  let jwtService: JwtService
  let authToken: string
  let testCommerceId: string

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    app.useGlobalPipes(new ValidationPipe())
    await app.init()

    prismaService = moduleFixture.get<PrismaService>(PrismaService)
    jwtService = moduleFixture.get<JwtService>(JwtService)

    // Create test user and get token
    const testUser = await prismaService.user.create({
      data: {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        password: 'hashedPassword',
        role: 'USER',
        isActive: true,
      },
    })

    testCommerceId = testUser.id

    authToken = jwtService.sign({
      sub: testUser.id,
      email: testUser.email,
      role: testUser.role,
    })
  })

  afterAll(async () => {
    // Clean up test data
    await prismaService.order.deleteMany({
      where: { commerceId: testCommerceId },
    })
    await prismaService.user.delete({
      where: { id: testCommerceId },
    })
    await app.close()
  })

  describe('POST /api/orders', () => {
    it('should create a new order', async () => {
      const createOrderDto = {
        customerName: 'John Doe',
        customerPhone: '+1234567890',
        items: [
          { productId: 'product-1', quantity: 2, price: 10.99 },
          { productId: 'product-2', quantity: 1, price: 5.99 },
        ],
        notes: 'Test order',
      }

      const response = await request(app.getHttpServer())
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createOrderDto)
        .expect(201)

      expect(response.body).toHaveProperty('id')
      expect(response.body.customerName).toBe(createOrderDto.customerName)
      expect(response.body.status).toBe('PENDIENTE')
      expect(response.body.total).toBe(27.97)
    })

    it('should validate required fields', async () => {
      const invalidOrderDto = {
        customerName: '',
        items: [],
      }

      await request(app.getHttpServer())
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidOrderDto)
        .expect(400)
    })

    it('should require authentication', async () => {
      const createOrderDto = {
        customerName: 'John Doe',
        items: [{ productId: 'product-1', quantity: 1, price: 10 }],
      }

      await request(app.getHttpServer())
        .post('/api/orders')
        .send(createOrderDto)
        .expect(401)
    })
  })

  describe('GET /api/orders', () => {
    it('should return paginated orders', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/orders?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('orders')
      expect(response.body).toHaveProperty('total')
      expect(response.body).toHaveProperty('page')
      expect(response.body).toHaveProperty('totalPages')
      expect(Array.isArray(response.body.orders)).toBe(true)
    })

    it('should filter by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/orders?status=PENDIENTE')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(Array.isArray(response.body.orders)).toBe(true)
    })

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/orders')
        .expect(401)
    })
  })

  describe('GET /api/orders/:id', () => {
    it('should return order by id', async () => {
      // First create an order
      const createOrderDto = {
        customerName: 'Test Customer',
        items: [{ productId: 'product-1', quantity: 1, price: 10 }],
      }

      const createResponse = await request(app.getHttpServer())
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createOrderDto)
        .expect(201)

      const orderId = createResponse.body.id

      // Then get the order
      const response = await request(app.getHttpServer())
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.id).toBe(orderId)
      expect(response.body.customerName).toBe(createOrderDto.customerName)
    })

    it('should return 404 for non-existent order', async () => {
      await request(app.getHttpServer())
        .get('/api/orders/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
    })

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/orders/some-id')
        .expect(401)
    })
  })

  describe('PATCH /api/orders/:id/status', () => {
    it('should update order status', async () => {
      // First create an order
      const createOrderDto = {
        customerName: 'Test Customer',
        items: [{ productId: 'product-1', quantity: 1, price: 10 }],
      }

      const createResponse = await request(app.getHttpServer())
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createOrderDto)
        .expect(201)

      const orderId = createResponse.body.id

      // Then update status
      const response = await request(app.getHttpServer())
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'CONFIRMADO' })
        .expect(200)

      expect(response.body.status).toBe('CONFIRMADO')
    })

    it('should reject invalid status transitions', async () => {
      // First create an order
      const createOrderDto = {
        customerName: 'Test Customer',
        items: [{ productId: 'product-1', quantity: 1, price: 10 }],
      }

      const createResponse = await request(app.getHttpServer())
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createOrderDto)
        .expect(201)

      const orderId = createResponse.body.id

      // Try invalid transition (PENDIENTE -> ENTREGADO)
      await request(app.getHttpServer())
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'ENTREGADO' })
        .expect(400)
    })

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .patch('/api/orders/some-id/status')
        .send({ status: 'CONFIRMADO' })
        .expect(401)
    })
  })

  describe('GET /api/orders/stats', () => {
    it('should return order statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/orders/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('total')
      expect(response.body).toHaveProperty('byStatus')
      expect(response.body).toHaveProperty('monthlyRevenue')
      expect(response.body).toHaveProperty('avgTicket')
    })

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/orders/stats')
        .expect(401)
    })
  })

  describe('DELETE /api/orders/:id', () => {
    it('should delete order (soft delete)', async () => {
      // First create an order
      const createOrderDto = {
        customerName: 'Test Customer',
        items: [{ productId: 'product-1', quantity: 1, price: 10 }],
      }

      const createResponse = await request(app.getHttpServer())
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createOrderDto)
        .expect(201)

      const orderId = createResponse.body.id

      // Then delete it
      await request(app.getHttpServer())
        .delete(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
    })

    it('should not allow deletion of confirmed orders', async () => {
      // First create and confirm an order
      const createOrderDto = {
        customerName: 'Test Customer',
        items: [{ productId: 'product-1', quantity: 1, price: 10 }],
      }

      const createResponse = await request(app.getHttpServer())
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createOrderDto)
        .expect(201)

      const orderId = createResponse.body.id

      // Confirm the order
      await request(app.getHttpServer())
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'CONFIRMADO' })
        .expect(200)

      // Try to delete it
      await request(app.getHttpServer())
        .delete(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400)
    })

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .delete('/api/orders/some-id')
        .expect(401)
    })
  })
})
