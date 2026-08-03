-- CreateTable
CREATE TABLE "freelancer_applications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "subcategoryId" TEXT,
    "message" TEXT,
    "status" "ProposalStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "freelancer_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "freelancer_applications_status_idx" ON "freelancer_applications"("status");

-- CreateIndex
CREATE INDEX "freelancer_applications_userId_status_idx" ON "freelancer_applications"("userId", "status");

-- AddForeignKey
ALTER TABLE "freelancer_applications" ADD CONSTRAINT "freelancer_applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "freelancer_applications" ADD CONSTRAINT "freelancer_applications_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "user_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "freelancer_applications" ADD CONSTRAINT "freelancer_applications_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "user_subcategories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "freelancer_applications" ADD CONSTRAINT "freelancer_applications_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
