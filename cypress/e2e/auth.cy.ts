describe("authentication API flows", () => {
  const password = "correct horse battery staple";
  const email = `cypress-${Date.now()}@example.com`;

  it("signs up, logs in, and logs out a patient", () => {
    cy.request({
      method: "POST",
      url: "/api/auth/signup",
      body: {
        full_name: "Cypress Patient",
        email,
        phone_number: "0123456789",
        date_of_birth: "1998-01-01",
        password,
      },
    }).then((signup) => {
      expect(signup.status).to.equal(201);
      expect(signup.body.user.role).to.equal("patient");
    });

    cy.request({
      method: "POST",
      url: "/api/auth/login",
      body: { email, password },
    }).then((login) => {
      expect(login.status).to.equal(200);
      expect(login.body.user.role).to.equal("patient");
    });

    cy.request({
      method: "POST",
      url: "/api/auth/logout",
    }).then((logout) => {
      expect(logout.status).to.equal(204);
    });
  });

  it("rejects protected staff provisioning without a session", () => {
    cy.request({
      method: "POST",
      url: "/api/auth/staff/create",
      failOnStatusCode: false,
      body: {
        full_name: "Unauthenticated Cypress Staff",
        email: `cypress-staff-${Date.now()}@example.com`,
        phone_number: "0123456789",
        role: "dental_assistant",
        password,
      },
    }).then((response) => {
      expect(response.status).to.equal(401);
      expect(response.body.error).to.equal("Authentication required");
    });
  });
});
