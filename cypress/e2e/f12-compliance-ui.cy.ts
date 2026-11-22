const flaggedRow = {
  patient: {
    patient_id: "50000000-0000-4000-8000-000000000001",
    full_name: "Jane Doe",
    email: "jane@example.com",
    phone_number: "0123456789",
    account_status: "flagged",
    suspension_reason: "BR-02 reschedule limit exceeded",
  },
  flag: {
    suspension_id: "60000000-0000-4000-8000-000000000001",
    flagging_reason: "BR-02 reschedule limit exceeded",
    triggered_by: "system",
    flagged_at: "2030-05-01T02:00:00.000Z",
    reviewed_at: null,
    admin_notes: null,
  },
};

const suspendedRow = {
  patient: {
    patient_id: "50000000-0000-4000-8000-000000000002",
    full_name: "John Smith",
    email: "john@example.com",
    phone_number: "0123456789",
    account_status: "suspended",
    suspension_reason: "Repeat booking abuse",
  },
  record: {
    suspension_id: "60000000-0000-4000-8000-000000000002",
    flagging_reason: "BR-02 reschedule limit exceeded",
    triggered_by: "system",
    flagged_at: "2030-04-20T02:00:00.000Z",
    reviewed_at: "2030-04-21T02:00:00.000Z",
    admin_notes: null,
  },
};

describe("F-12 compliance review", () => {
  it("renders the flagged and suspended queues for an admin", () => {
    cy.intercept("GET", "/api/auth/me", { statusCode: 200, body: { user: { id: "1", role: "admin" } } });
    cy.intercept("GET", "/api/accounts/flagged", { statusCode: 200, body: { flagged: [flaggedRow] } });
    cy.intercept("GET", "/api/accounts/suspended", { statusCode: 200, body: { suspended: [suspendedRow] } });

    cy.visit("http://localhost:3000/staff/compliance");
    cy.contains("h1", "Compliance Review").should("be.visible");
    cy.contains("h2", "Flagged for review").should("be.visible");
    cy.contains("Jane Doe").should("be.visible");
    cy.contains("BR-02 reschedule limit exceeded").should("be.visible");
    cy.contains("h2", "Suspended accounts").should("be.visible");
    cy.contains("John Smith").should("be.visible");
    cy.contains("button", "Suspend account").should("be.visible");
    cy.contains("button", "Reinstate account").should("be.visible");
  });

  it("suspends a flagged account with a reason", () => {
    cy.intercept("GET", "/api/auth/me", { statusCode: 200, body: { user: { id: "1", role: "admin" } } });
    cy.intercept("GET", "/api/accounts/flagged", { statusCode: 200, body: { flagged: [flaggedRow] } });
    cy.intercept("GET", "/api/accounts/suspended", { statusCode: 200, body: { suspended: [] } });
    cy.intercept("PATCH", "/api/accounts/*/suspend", { statusCode: 200, body: {} }).as("suspend");

    cy.visit("http://localhost:3000/staff/compliance");
    cy.get(`#reason-${flaggedRow.patient.patient_id}`).type("Repeat booking abuse");
    cy.contains("button", "Suspend account").click();

    cy.wait("@suspend").its("request.body").then((body: Record<string, unknown>) => {
      expect(body).to.deep.include({ reason: "Repeat booking abuse" });
    });
  });

  it("shows empty states when there is nothing to review", () => {
    cy.intercept("GET", "/api/auth/me", { statusCode: 200, body: { user: { id: "1", role: "admin" } } });
    cy.intercept("GET", "/api/accounts/flagged", { statusCode: 200, body: { flagged: [] } });
    cy.intercept("GET", "/api/accounts/suspended", { statusCode: 200, body: { suspended: [] } });

    cy.visit("http://localhost:3000/staff/compliance");
    cy.contains("No flagged accounts awaiting review.").should("be.visible");
    cy.contains("No accounts are currently suspended.").should("be.visible");
  });

  it("hides action buttons for a dental assistant", () => {
    cy.intercept("GET", "/api/auth/me", {
      statusCode: 200,
      body: { user: { id: "2", role: "dental_assistant" } },
    });
    cy.intercept("GET", "/api/accounts/flagged", { statusCode: 200, body: { flagged: [flaggedRow] } });
    cy.intercept("GET", "/api/accounts/suspended", { statusCode: 200, body: { suspended: [suspendedRow] } });

    cy.visit("http://localhost:3000/staff/compliance");
    cy.contains("Jane Doe").should("be.visible");
    cy.contains("John Smith").should("be.visible");
    cy.contains("button", "Suspend account").should("not.exist");
    cy.contains("button", "Reinstate account").should("not.exist");
    cy.contains("Suspension actions require an admin.").should("be.visible");
  });
});