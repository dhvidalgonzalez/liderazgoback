BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[User] (
    [id] NVARCHAR(1000) NOT NULL,
    [rut] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [password] NVARCHAR(1000) NOT NULL,
    [role] NVARCHAR(1000) NOT NULL CONSTRAINT [User_role_df] DEFAULT 'USER',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [User_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [User_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [User_rut_key] UNIQUE NONCLUSTERED ([rut]),
    CONSTRAINT [User_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[EmployeeProfile] (
    [id] NVARCHAR(1000) NOT NULL,
    [rut] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000),
    [sapCode] NVARCHAR(1000),
    [gerencia] NVARCHAR(1000),
    [empresa] NVARCHAR(1000),
    [position] NVARCHAR(1000),
    [startDate] DATETIME2 NOT NULL,
    [endDate] DATETIME2 NOT NULL,
    [isActive] BIT NOT NULL CONSTRAINT [EmployeeProfile_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [EmployeeProfile_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [EmployeeProfile_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [EmployeeProfile_rut_key] UNIQUE NONCLUSTERED ([rut])
);

-- CreateTable
CREATE TABLE [dbo].[Justification] (
    [id] NVARCHAR(1000) NOT NULL,
    [employeeNombre] NVARCHAR(1000) NOT NULL,
    [employeeRut] NVARCHAR(1000) NOT NULL,
    [employeeEmail] NVARCHAR(1000) NOT NULL,
    [employeeSapCode] NVARCHAR(1000),
    [employeeGerencia] NVARCHAR(1000),
    [employeeEmpresa] NVARCHAR(1000),
    [employeePosition] NVARCHAR(1000),
    [employeeProfileId] NVARCHAR(1000) NOT NULL,
    [startDate] DATETIME2 NOT NULL,
    [endDate] DATETIME2 NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    [documentUrl] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [Justification_status_df] DEFAULT 'PENDING',
    [reviewedAt] DATETIME2,
    [creatorId] NVARCHAR(1000) NOT NULL,
    [reviewerId] NVARCHAR(1000),
    [reviewerCause] NVARCHAR(1000),
    [reviewerComment] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Justification_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Justification_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[Justification] ADD CONSTRAINT [Justification_employeeProfileId_fkey] FOREIGN KEY ([employeeProfileId]) REFERENCES [dbo].[EmployeeProfile]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Justification] ADD CONSTRAINT [Justification_creatorId_fkey] FOREIGN KEY ([creatorId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Justification] ADD CONSTRAINT [Justification_reviewerId_fkey] FOREIGN KEY ([reviewerId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
