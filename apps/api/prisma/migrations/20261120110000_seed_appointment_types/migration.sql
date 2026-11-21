INSERT INTO "AppointmentType"
    ("appointment_type_id", "appointment_type", "default_duration_minutes", "is_active")
VALUES
    ('10000000-0000-4000-8000-000000000001', 'General Checkup', 30, true),
    ('10000000-0000-4000-8000-000000000002', 'Scaling', 60, true),
    ('10000000-0000-4000-8000-000000000003', 'Consultation', 30, true)
ON CONFLICT ("appointment_type_id") DO NOTHING;
