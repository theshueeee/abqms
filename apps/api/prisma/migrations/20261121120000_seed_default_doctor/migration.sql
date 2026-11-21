-- F-04 server-side booking defaults.
--
-- The patient booking flow no longer exposes a service or doctor control, so the
-- API resolves the clinic's default appointment type and doctor resource.
-- General Checkup is seeded by 20261120110000_seed_appointment_types.
--
-- StaffRole has no `doctor` value (tracked by OQ-02), so the doctor resource is
-- stored as a staff-linked placeholder with a password hash that corresponds to
-- no known password. It cannot be used to sign in.
INSERT INTO "Staff" (
    "staff_id",
    "full_name",
    "email",
    "password_hash",
    "phone_number",
    "role",
    "is_active",
    "created_at",
    "updated_at"
)
VALUES (
    '20000000-0000-4000-8000-000000000001',
    'General Clinic Doctor',
    'doctor.resource@dentaqueue.local',
    '$argon2id$v=19$m=65536,t=3,p=4$T3+ipGzeRt4lfWAq8mlyLw$X8ULYISZlPNGVGisMIRqL0KJMv6otdEEkFT7PKstPlQ',
    '0000000000',
    'dental_assistant',
    true,
    NOW(),
    NOW()
)
ON CONFLICT DO NOTHING;
