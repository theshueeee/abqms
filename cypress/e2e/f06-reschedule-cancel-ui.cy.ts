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
];

const cancellationReasons = [
  { reason_id: "30000000-0000-4000-8000-000000000001", reason_text: "Schedule conflict" },
  { reason_id: "30000000-0000-4000-8000-000000000002", reason_text: "Feeling unwell" },
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

describe("F-06 reschedule and cancellation", () => {
  beforeEach(() => {
    cy.intercept("GET", "/api/appointments", {
      statusCode: 200,
      body: { appointments: upcomingAppointments },
    }).as("appointmentList");
    cy.intercept("GET", "/api/appointments/policy-limits", {
      statusCode: 200,
      body: { limit: 5, window_days: 30, used: 1, remaining: 4 },
    }).as("policyLimits");
    cy.intercept("GET", "/api/cancellation-reasons", {
      statusCode: 200,
      body: { cancellation_reasons: cancellationReasons },
    }).as("cancellationReasons");
  });

  it("renders the four quick actions and the policy limits panel", () => {
    cy.visit("http://localhost:3000/patient/dashboard");
    cy.contains("a", "Book Appt").should("be.visible");
    cy.contains("a", "Reschedule").should("be.visible");
    cy.contains("a", "Cancel Visit").should("be.visible");
    cy.contains("a", "My Records").should("be.visible");

    cy.contains("h2", "Policy Limits").should("be.visible");
    cy.contains("Reschedule allowance").should("be.visible");
    cy.contains("You have used 1 of 5 reschedules in the last 30 days.").should("be.visible");
    cy.contains("4").should("be.visible");
    cy.contains("remaining").should("be.visible");
  });

  it("navigates from the quick actions to the reschedule and cancel pages", () => {
    cy.visit("http://localhost:3000/patient/dashboard");
    cy.contains("a", "Reschedule").click();
    cy.location("pathname").should("eq", "/patient/reschedule");

    cy.visit("http://localhost:3000/patient/dashboard");
    cy.contains("a", "Cancel Visit").click();
    cy.location("pathname").should("eq", "/patient/cancel");
  });

  it("reschedules an upcoming appointment", () => {
    interceptAvailability();
    cy.intercept("PATCH", "/api/appointments/*/reschedule", {
      statusCode: 200,
      body: {
        appointment: {
          appointment_id: "40000000-0000-4000-8000-000000000001",
          scheduled_datetime: "2030-05-20T04:30:00.000Z",
          status: "confirmed",
          appointment_type: defaultAppointmentType,
          doctor: defaultDoctor,
        },
        reschedules_used: 2,
        reschedules_remaining: 3,
      },
    }).as("reschedule");

    cy.visit("http://localhost:3000/patient/reschedule");
    cy.wait("@appointmentList");
    cy.contains("General Checkup").should("be.visible");
    cy.contains("button", "Select").click();
    cy.wait("@availability");

    cy.get("button").filter(':contains("Available")').first().click();
    cy.wait("@reschedule").its("request.body").then((body: Record<string, unknown>) => {
      expect(body).to.have.property("scheduled_datetime");
    });
    cy.contains("Appointment rescheduled").should("be.visible");
  });

  it("cancels an upcoming appointment with a reason", () => {
    cy.intercept("PATCH", "/api/appointments/*/cancel", {
      statusCode: 200,
      body: { appointment: { appointment_id: "40000000-0000-4000-8000-000000000001" } },
    }).as("cancel");

    cy.visit("http://localhost:3000/patient/cancel");
    cy.wait(["@appointmentList", "@cancellationReasons"]);
    cy.contains("General Checkup").should("be.visible");
    cy.contains("button", "Select").click();

    cy.get("#cancellation-reason").should("exist").select(cancellationReasons[0].reason_id);
    cy.contains("button", "Cancel this appointment").click();
    cy.wait("@cancel").its("request.body").then((body: Record<string, unknown>) => {
      expect(body).to.have.property("cancellation_reason_id", cancellationReasons[0].reason_id);
    });
    cy.contains("Appointment cancelled").should("be.visible");
  });

  it("shows the flagged message when the reschedule limit is reached", () => {
    interceptAvailability();
    cy.intercept("PATCH", "/api/appointments/*/reschedule", {
      statusCode: 409,
      body: {
        error: "Reschedule limit reached",
        flagged: true,
        reschedules_used: 5,
        limit: 5,
      },
    }).as("reschedule");

    cy.visit("http://localhost:3000/patient/reschedule");
    cy.wait("@appointmentList");
    cy.contains("button", "Select").click();
    cy.wait("@availability");

    cy.get("button").filter(':contains("Available")').first().click();
    cy.wait("@reschedule");
    cy.contains("You have reached the reschedule limit. Your account is flagged for review.").should("be.visible");
  });

  it("shows the empty state when there is nothing to reschedule", () => {
    cy.intercept("GET", "/api/appointments", {
      statusCode: 200,
      body: { appointments: [] },
    }).as("emptyAppointments");

    cy.visit("http://localhost:3000/patient/reschedule");
    cy.wait("@emptyAppointments");
    cy.contains("No upcoming appointments to reschedule.").should("be.visible");
  });
});
