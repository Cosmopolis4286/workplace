-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('MASCULINO', 'FEMENINO', 'OTRO');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "birthDate" TIMESTAMP(3),
ADD COLUMN     "sex" "Sex";
