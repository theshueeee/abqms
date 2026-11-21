const defaultAppointmentType = {
  appointment_type_id: "10000000-0000-4000-8000-000000000001",
  appointment_type: "General Checkup",
  default_duration_minutes: 30,
};

const defaultDoctor = {
  staff_id: "20000000-0000-4000-8000-000000000001",
  full_name: "General Clinic Doctor",
};

const upcomingAppointments = [
  {
    appointment_id: "40000000-0000-4000-8000-000000000001",
    scheduled_datetime: "2030-05-15T06:00:00.000Z",
    status: "confirmed",
    appointment_type: defaultAppointmentType,
    doctor: defaultDoctor,
  },
  {
    appointment_id: "40000000-0000-4000-8000-000000000002",
    scheduled_datetime: "2030-05-26T06:30:00.000Z",
    status: "pending",
    appointment_type: { ...defaultAppointmentType, appointment_type: "Scaling", default_duration_minutes: 60 },
    doctor: defaultDoctor,
  },
  {
    appointment_id: "40000000-0000-4000-8000-000000000003",
    scheduled_datetime: "2030-05-20T06:30:00.000Z",
    status: "cancelled",
    appointment_type: { ...defaultAppointmentType, appointment_type: "Consultation" },
    doctor: defaultDoctor,
  },
  {
    appointment_id: "40000000-0000-4000-8000-000000000004",
    scheduled_datetime: "2020-01-01T04:00:00.000Z",
    status: "confirmed",
    appointment_type: { ...defaultAppointmentType, appointment_type: "Past Visit" },
    doctor: defaultDoctor,
  },
];

function interceptAvailability(slotHour = "04:30") {
  cy.intercept("GET", "/api/appointments/availability*", (request) => {
    const url = new URL(request.url);
    const date = url.searchParams.get("date")!;
    request.reply({
      statusCode: 200,
      body: {
        slots: [{ scheduled_datetime: `${date}T${slotHour}:00.000Z` }],
        appointment_type: defaultAppointmentType,
        doctor: defaultDoctor,
      },
    });
  }).as("availability");
}

describe("F-04 patient booking", () => {
  beforeEach(() => {
    cy.intercept("GET", "/api/appointments", {
      statusCode: 200,
      body: { appointments: [] },
    }).as("appointmentsGuard");
  });

  it("redirects unauthenticated dashboard and booking routes", () => {
    cy.intercept("GET", "/api/appointments", {
      statusCode: 401,
      body: { error: "Authentication required" },
    }).as("unauthenticated");
    cy.visit("http://localhost:3000/patient/dashboard");
    cy.location("pathname").should("eq", "/login");

    cy.visit("http://localhost:3000/patient/book");
    cy.location("pathname").should("eq", "/login");
  });

  it("navigates from the patient dashboard to booking", () => {
    cy.visit("http://localhost:3000/patient/dashboard");
    cy.contains("a", "Book an appointment").click();
    cy.location("pathname").should("eq", "/patient/book");
  });

  it("lists upcoming appointments and hides past or cancelled ones", () => {
    cy.intercept("GET", "/api/appointments", {
      statusCode: 200,
      body: { appointments: upcomingAppointments },
    }).as("appointmentList");

    cy.visit("http://localhost:3000/patient/dashboard");
    cy.contains("h2", "Upcoming Appointments").should("be.visible");
    cy.contains("h3", "General Checkup").should("be.visible");
    cy.contains("Confirmed").should("be.visible");
    cy.contains("Wed, 2:00 PM").should("be.visible");
    cy.contains("General Clinic Doctor").should("be.visible");
    cy.contains("h3", "Scaling").should("be.visible");
    cy.contains("Pending").should("be.visible");
    cy.contains("Consultation").should("not.exist");
    cy.contains("Past Visit").should("not.exist");
  });

  it("shows an empty upcoming state when there are no appointments", () => {
    cy.visit("http://localhost:3000/patient/dashboard");
    cy.contains("No upcoming appointments.").should("be.visible");
  });

  it("uses server-side service and doctor defaults and submits an available slot once", () => {
    interceptAvailability();
    cy.intercept("POST", "/api/appointments", {
      statusCode: 201,
      body: {
        appointment: {
          appointment_id: "30000000-0000-4000-8000-000000000001",
          scheduled_datetime: "2030-01-11T04:30:00.000Z",
          appointment_type: defaultAppointmentType,
          doctor: defaultDoctor,
        },
      },
    }).as("booking");

    cy.visit("http://localhost:3000/patient/book");
    cy.wait(["@appointmentsGuard", "@availability"]);

    cy.get("#appointment-type").should("not.exist");
    cy.get("#doctor").should("not.exist");
    cy.contains("General Checkup - General Outpatient Clinic").should("be.visible");

    cy.get("button").filter(':contains("Available")').first().click();
    cy.wait("@booking").its("request.body").then((body: Record<string, unknown>) => {
      expect(body).to.have.property("scheduled_datetime");
      expect(body).to.not.have.property("appointment_type_id");
      expect(body).to.not.have.property("doctor_staff_id");
    });
    cy.contains("Appointment booked").should("be.visible");
    cy.contains("General Checkup · General Clinic Doctor").should("be.visible");

    cy.intercept("GET", "/api/appointments", {
      statusCode: 200,
      body: {
        appointments: [
          {
            appointment_id: "30000000-0000-4000-8000-000000000001",
            scheduled_datetime: "2030-01-11T04:30:00.000Z",
            status: "confirmed",
            appointment_type: defaultAppointmentType,
            doctor: defaultDoctor,
          },
        ],
      },
    }).as("appointmentsAfterBooking");
    cy.contains("a", "Return to dashboard").click();
    cy.location("pathname").should("eq", "/patient/dashboard");
    cy.contains("h3", "General Checkup").should("be.visible");
    cy.contains("Confirmed").should("be.visible");
  });

  it("shows conflict errors without leaving the booking page", () => {
    interceptAvailability();
    cy.intercept("POST", "/api/appointments", {
      statusCode: 409,
      body: { error: "Time slot is already taken" },
    });

    cy.visit("http://localhost:3000/patient/book");
    cy.get("button").filter(':contains("Available")').first().click();
    cy.contains("Time slot is already taken").should("be.visible");
    cy.location("pathname").should("eq", "/patient/book");
  });
});

