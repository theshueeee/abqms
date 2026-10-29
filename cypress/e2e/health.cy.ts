describe("API health", () => {
  it("reports that the API is healthy", () => {
    cy.request("/api/health").then((response) => {
      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal({ status: "ok", database: "ok" });
    });
  });
});
