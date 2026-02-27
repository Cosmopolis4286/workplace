import { PrismaClient, Role } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

interface DemoUser {
  role: Role
  email: string
  password: string
  firstName: string
  lastName: string
  restaurantName?: string
}

const DEMO_USERS: DemoUser[] = [
  {
    role: Role.SUPERADMIN,
    email: 'superadmin@demo.com',
    password: 'SuperAdmin123',
    firstName: 'Super',
    lastName: 'Admin',
  },
  {
    role: Role.ADMIN,
    email: 'admin@demo.com',
    password: 'Admin1234',
    firstName: 'Admin',
    lastName: 'Demo',
  },
  {
    role: Role.COMMERCE,
    email: 'commerce@demo.com',
    password: 'Commerce123',
    firstName: 'Comercio',
    lastName: 'Demo',
    restaurantName: 'Restaurante Demo',
  },
  {
    role: Role.FREELANCER,
    email: 'freelancer@demo.com',
    password: 'Freelancer1',
    firstName: 'Freelancer',
    lastName: 'Demo',
  },
  {
    role: Role.NORMAL,
    email: 'normal@demo.com',
    password: 'Normal1234',
    firstName: 'Usuario',
    lastName: 'Normal',
  },
]

async function main() {
  console.log('🌱 Seeding demo users...\n')

  for (const demo of DEMO_USERS) {
    const existing = await prisma.user.findUnique({ where: { email: demo.email } })

    if (existing) {
      await prisma.user.update({
        where: { email: demo.email },
        data: { role: demo.role },
      })
      console.log(`✅ [${demo.role}] Already exists (role refreshed): ${demo.email}`)
      continue
    }

    const hashedPassword = await bcrypt.hash(demo.password, 12)

    const user = await prisma.user.create({
      data: {
        email: demo.email,
        password: hashedPassword,
        firstName: demo.firstName,
        lastName: demo.lastName,
        role: demo.role,
        ...(demo.restaurantName
          ? { restaurant: { create: { name: demo.restaurantName } } }
          : {}),
      },
      include: { restaurant: true },
    })

    console.log(`✅ [${demo.role}] Created: ${user.email}${user.restaurant ? ` | Restaurant: ${user.restaurant.name}` : ''}`)
    console.log(`   Password: ${demo.password}`)
  }

  console.log('\n✨ Seed complete.')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
