import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  const email = process.env.DEMO_EMAIL || 'demo@ifoodmanager.com'
  const password = process.env.DEMO_PASSWORD || 'demo123456'
  const restaurantName = process.env.DEMO_RESTAURANT || 'Restaurante Demo'

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log(`✅ Demo user already exists: ${email}`)
    return
  }

  const hashedPassword = await bcrypt.hash(password, 12)

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName: 'Demo',
      lastName: 'Usuario',
      restaurant: {
        create: { name: restaurantName },
      },
    },
    include: { restaurant: true },
  })

  console.log(`✅ Demo user created: ${user.email} | Restaurant: ${user.restaurant?.name}`)
  console.log(`   Password (plaintext): ${password}`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
