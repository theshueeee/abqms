CREATE TYPE "AppointmentStatus" AS ENUM ('pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show');
CREATE TYPE "BookingChannel" AS ENUM ('online', 'walk_in');

CREATE TABLE "AppointmentType" (
    "appointment_type_id" UUID NOT NULL,
    "appointment_type" TEXT NOT NULL,
    "default_duration_minutes" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "AppointmentType_pkey" PRIMARY KEY ("appointment_type_id")
);

CREATE TABLE "Appointment" (
    "appointment_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "appointment_type_id" UUID NOT NULL,
    "doctor_staff_id" UUID NOT NULL,
    "scheduled_datetime" TIMESTAMP(3) NOT NULL,
    "booking_channel" "BookingChannel" NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'confirmed',
    "is_follow_up" BOOLEAN NOT NULL DEFAULT false,
    "parent_appointment_id" UUID,
    "reschedule_count" INTEGER NOT NULL DEFAULT 0,
    "cancellation_reason_id" UUID,
    "cancelled_by_patient_id" UUID,
    "cancelled_by_staff_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("appointment_id")
);

ALTER TABLE "Appointment"
ADD CONSTRAINT "Appointment_patient_id_fkey"
FOREIGN KEY ("patient_id") REFERENCES "Patient"("patient_id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "Appointment_appointment_type_id_fkey"
FOREIGN KEY ("appointment_type_id") REFERENCES "AppointmentType"("appointment_type_id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "Appointment_doctor_staff_id_fkey"
FOREIGN KEY ("doctor_staff_id") REFERENCES "Staff"("staff_id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "Appointment_parent_appointment_id_fkey"
FOREIGN KEY ("parent_appointment_id") REFERENCES "Appointment"("appointment_id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Appointment_doctor_staff_id_scheduled_datetime_status_idx"
ON "Appointment"("doctor_staff_id", "scheduled_datetime", "status");
CREATE INDEX "Appointment_patient_id_scheduled_datetime_idx"
ON "Appointment"("patient_id", "scheduled_datetime");
CREATE INDEX "Appointment_appointment_type_id_idx"
ON "Appointment"("appointment_type_id");
