describe("authentication pages", () => {
  it("connects the authentication routes", () => {
    cy.visit("http://localhost:3000/login");
    cy.get('a[href="/register"]').should("exist");
    cy.get('a[href="/forgot-password"]').should("exist");

    cy.visit("http://localhost:3000/register");
    cy.get('a[href="/login"]').should("exist");

    cy.visit("http://localhost:3000/forgot-password");
    cy.get('a[href="/login"]').should("exist");
    cy.get('a[href="/register"]').should("exist");

    cy.visit("http://localhost:3000/reset-password");
    cy.get('a[href="/login"]').should("exist");
    cy.get('a[href="/forgot-password"]').should("exist");
  });

  it("shows login validation without making a request", () => {
    cy.visit("http://localhost:3000/login");
    cy.get("button[type=submit]").click();
    cy.contains("Enter your email and password to continue.").should("be.visible");
  });

  it("submits registration and shows the completion state", () => {
    cy.intercept("POST", "/api/auth/signup", {
      statusCode: 201,
      body: { user: { role: "patient" } },
    }).as("signup");

    cy.visit("http://localhost:3000/register");
    cy.get("#fullName").type("Cypress Patient");
    cy.get("#email").type("cypress-ui@example.com");
    cy.get("#phone").type("0123456789");
    cy.get("#dateOfBirth").type("1998-01-01");
    cy.get("#password").type("correct horse battery staple");
    cy.get("#confirmPassword").type("correct horse battery staple");
    cy.get("button[type=submit]").click();
    cy.wait("@signup").its("request.body").should("deep.include", {
      full_name: "Cypress Patient",
      email: "cypress-ui@example.com",
    });
    cy.contains("Your account was created successfully.").should("be.visible");
  });

  it("keeps password recovery non-disclosing", () => {
    cy.intercept("POST", "/api/auth/forgot-password", {
      statusCode: 202,
      body: { message: "If the account exists, reset instructions have been sent" },
    }).as("forgotPassword");

    cy.visit("http://localhost:3000/forgot-password");
    cy.get("#email").type("patient@example.com");
    cy.get("button[type=submit]").click();
    cy.wait("@forgotPassword");
    cy.contains("If the account exists, reset instructions have been sent.").should("be.visible");
  });

  it("rejects a reset form without a token", () => {
    cy.visit("http://localhost:3000/reset-password");
    cy.get("#password").type("correct horse battery staple");
    cy.get("#confirmPassword").type("correct horse battery staple");
    cy.get("button[type=submit]").click();
    cy.contains("This reset link is missing its token.").should("be.visible");
  });
});
