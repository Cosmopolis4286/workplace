-- CreateEnum
CREATE TYPE "EmployeeRole" AS ENUM ('GERENTE', 'SUPERVISOR', 'COCINERO', 'MESERO', 'CAJERO', 'REPARTIDOR', 'LIMPIEZA', 'SEGURIDAD', 'OTRO');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVO', 'INACTIVO', 'VACACIONES', 'LICENCIA', 'SUSPENDIDO');

-- CreateEnum
CREATE TYPE "BranchStatus" AS ENUM ('ACTIVA', 'INACTIVA', 'EN_CONSTRUCCION', 'CERRADA');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatar" TEXT;

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "role" "EmployeeRole" NOT NULL DEFAULT 'OTRO',
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVO',
    "salary" DOUBLE PRECISION,
    "hireDate" TIMESTAMP(3),
    "birthDate" TIMESTAMP(3),
    "address" TEXT,
    "emergencyContact" TEXT,
    "emergencyPhone" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "restaurantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "type" TEXT,
    "managerName" TEXT,
    "managerPhone" TEXT,
    "status" "BranchStatus" NOT NULL DEFAULT 'ACTIVA',
    "color" TEXT NOT NULL DEFAULT '#6b7280',
    "notes" TEXT,
    "restaurantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employees_email_restaurantId_key" ON "employees"("email", "restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "branches_name_restaurantId_key" ON "branches"("name", "restaurantId");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
