import { Injectable, ConflictException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import * as bcrypt from 'bcrypt'

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    email: string
    password: string
    firstName: string
    lastName: string
    phone?: string
    restaurantName: string
  }) {
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } })
    if (existing) throw new ConflictException('El correo ya está registrado')

    const hashedPassword = await bcrypt.hash(data.password, 12)

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        restaurant: {
          create: { name: data.restaurantName },
        },
      },
      include: { restaurant: true },
    })

    const { password, ...result } = user
    return result
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: { restaurant: true },
    })
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { restaurant: true },
    })
    if (!user) throw new NotFoundException('Usuario no encontrado')
    const { password, ...result } = user
    return result
  }

  async validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword)
  }
}
