-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EmployeeProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rut" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "sapCode" TEXT,
    "gerencia" TEXT,
    "empresa" TEXT,
    "position" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_EmployeeProfile" ("createdAt", "email", "empresa", "endDate", "gerencia", "id", "isActive", "name", "position", "rut", "sapCode", "startDate", "updatedAt") SELECT "createdAt", "email", "empresa", "endDate", "gerencia", "id", "isActive", "name", "position", "rut", "sapCode", "startDate", "updatedAt" FROM "EmployeeProfile";
DROP TABLE "EmployeeProfile";
ALTER TABLE "new_EmployeeProfile" RENAME TO "EmployeeProfile";
CREATE UNIQUE INDEX "EmployeeProfile_rut_key" ON "EmployeeProfile"("rut");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
