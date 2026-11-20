-- CreateTable
CREATE TABLE "TimeBlock" (
    "block_id" UUID NOT NULL,
    "doctor_staff_id" UUID NOT NULL,
    "blocked_by_staff_id" UUID NOT NULL,
    "start_datetime" TIMESTAMP(3) NOT NULL,
    "end_datetime" TIMESTAMP(3) NOT NULL,
    "block_reason" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "TimeBlock_pkey" PRIMARY KEY ("block_id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "log_id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("log_id")
);

-- CreateIndex
CREATE INDEX "TimeBlock_doctor_staff_id_start_datetime_end_datetime_idx" ON "TimeBlock"("doctor_staff_id", "start_datetime", "end_datetime");

-- CreateIndex
CREATE INDEX "TimeBlock_doctor_staff_id_deleted_at_idx" ON "TimeBlock"("doctor_staff_id", "deleted_at");

-- CreateIndex
CREATE INDEX "AuditLog_resource_created_at_idx" ON "AuditLog"("resource", "created_at");

-- CreateIndex
CREATE INDEX "AuditLog_user_id_created_at_idx" ON "AuditLog"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "TimeBlock" ADD CONSTRAINT "TimeBlock_doctor_staff_id_fkey" FOREIGN KEY ("doctor_staff_id") REFERENCES "Staff"("staff_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeBlock" ADD CONSTRAINT "TimeBlock_blocked_by_staff_id_fkey" FOREIGN KEY ("blocked_by_staff_id") REFERENCES "Staff"("staff_id") ON DELETE RESTRICT ON UPDATE CASCADE;
