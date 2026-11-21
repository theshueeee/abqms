-- F-06 reschedule & cancellation.
-- Adds CancellationReason, RescheduleLog, SuspensionRecord; drops the two
-- retired reschedule-count columns; enforces the cancel contract via CHECK
-- constraints. RescheduleLog is the authoritative store for BR-02 (OQ-03).

-- Enums
CREATE TYPE "SuspensionTrigger" AS ENUM ('system', 'staff');
CREATE TYPE "SuspensionOutcome" AS ENUM ('pending', 'suspended', 'reinstated');

-- CancellationReason
CREATE TABLE "CancellationReason" (
    "reason_id" UUID NOT NULL,
    "reason_text" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "CancellationReason_pkey" PRIMARY KEY ("reason_id")
);

-- RescheduleLog
CREATE TABLE "RescheduleLog" (
    "reschedule_id" UUID NOT NULL,
    "appointment_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "old_scheduled_datetime" TIMESTAMP(3) NOT NULL,
    "new_scheduled_datetime" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "rescheduled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RescheduleLog_pkey" PRIMARY KEY ("reschedule_id")
);

-- SuspensionRecord
CREATE TABLE "SuspensionRecord" (
    "suspension_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "flagging_reason" TEXT NOT NULL,
    "triggered_by" "SuspensionTrigger" NOT NULL,
    "flagged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_by_staff_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "outcome" "SuspensionOutcome" NOT NULL DEFAULT 'pending',
    "admin_notes" TEXT,
    CONSTRAINT "SuspensionRecord_pkey" PRIMARY KEY ("suspension_id")
);

-- FKs on existing Appointment columns (columns exist; relations are new)
ALTER TABLE "Appointment"
    ADD CONSTRAINT "Appointment_cancellation_reason_id_fkey"
    FOREIGN KEY ("cancellation_reason_id") REFERENCES "CancellationReason"("reason_id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Appointment"
    ADD CONSTRAINT "Appointment_cancelled_by_patient_id_fkey"
    FOREIGN KEY ("cancelled_by_patient_id") REFERENCES "Patient"("patient_id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Appointment"
    ADD CONSTRAINT "Appointment_cancelled_by_staff_id_fkey"
    FOREIGN KEY ("cancelled_by_staff_id") REFERENCES "Staff"("staff_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- FKs on new tables
ALTER TABLE "RescheduleLog"
    ADD CONSTRAINT "RescheduleLog_appointment_id_fkey"
    FOREIGN KEY ("appointment_id") REFERENCES "Appointment"("appointment_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RescheduleLog"
    ADD CONSTRAINT "RescheduleLog_patient_id_fkey"
    FOREIGN KEY ("patient_id") REFERENCES "Patient"("patient_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SuspensionRecord"
    ADD CONSTRAINT "SuspensionRecord_patient_id_fkey"
    FOREIGN KEY ("patient_id") REFERENCES "Patient"("patient_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SuspensionRecord"
    ADD CONSTRAINT "SuspensionRecord_reviewed_by_staff_id_fkey"
    FOREIGN KEY ("reviewed_by_staff_id") REFERENCES "Staff"("staff_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Drop retired reschedule-count columns (OQ-03 decision)
ALTER TABLE "Appointment" DROP COLUMN "reschedule_count";
ALTER TABLE "Patient" DROP COLUMN "reschedule_credits";

-- CHECK constraints (OQ-09: cancel contract enforced at DB level)
ALTER TABLE "Appointment"
    ADD CONSTRAINT "Appointment_cancel_reason_required"
    CHECK ("status" <> 'cancelled' OR "cancellation_reason_id" IS NOT NULL);

ALTER TABLE "Appointment"
    ADD CONSTRAINT "Appointment_cancel_actor_exclusive"
    CHECK ("status" <> 'cancelled' OR num_nonnulls("cancelled_by_patient_id", "cancelled_by_staff_id") = 1);

-- Indexes
CREATE INDEX "RescheduleLog_patient_id_rescheduled_at_idx"
    ON "RescheduleLog"("patient_id", "rescheduled_at");
CREATE INDEX "RescheduleLog_appointment_id_idx"
    ON "RescheduleLog"("appointment_id");
CREATE INDEX "CancellationReason_is_active_is_system_idx"
    ON "CancellationReason"("is_active", "is_system");
CREATE INDEX "SuspensionRecord_patient_id_outcome_idx"
    ON "SuspensionRecord"("patient_id", "outcome");

-- Seeds
INSERT INTO "CancellationReason" ("reason_id", "reason_text", "is_active", "is_system")
VALUES
    ('30000000-0000-4000-8000-000000000001', 'Schedule conflict', true, false),
    ('30000000-0000-4000-8000-000000000002', 'Feeling unwell', true, false),
    ('30000000-0000-4000-8000-000000000003', 'No longer needed', true, false),
    ('30000000-0000-4000-8000-000000000004', 'Other', true, false),
    ('30000000-0000-4000-8000-000000000099', 'Appointment declined after no-show', true, true)
ON CONFLICT ("reason_id") DO NOTHING;