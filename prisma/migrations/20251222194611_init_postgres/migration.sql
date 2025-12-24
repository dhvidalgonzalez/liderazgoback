-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "rut" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeProfile" (
    "id" TEXT NOT NULL,
    "rut" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "sapCode" TEXT,
    "gerencia" TEXT,
    "empresa" TEXT,
    "position" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Justification" (
    "id" TEXT NOT NULL,
    "employeeNombre" TEXT NOT NULL,
    "employeeRut" TEXT NOT NULL,
    "employeeEmail" TEXT NOT NULL,
    "employeeSapCode" TEXT,
    "employeeGerencia" TEXT,
    "employeeEmpresa" TEXT,
    "employeePosition" TEXT,
    "employeeProfileId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "documentUrl" TEXT,
    "documentFilename" TEXT,
    "documentMime" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "creatorId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "reviewerCause" TEXT,
    "reviewerComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Justification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_rut_key" ON "User"("rut");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeProfile_rut_key" ON "EmployeeProfile"("rut");

-- AddForeignKey
ALTER TABLE "Justification" ADD CONSTRAINT "Justification_employeeProfileId_fkey" FOREIGN KEY ("employeeProfileId") REFERENCES "EmployeeProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Justification" ADD CONSTRAINT "Justification_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Justification" ADD CONSTRAINT "Justification_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
