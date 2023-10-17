describe('API', () => {
  it('is online and responds to request', () => {
    cy.request('POST', Cypress.env('NEXT_PUBLIC_GRAPHQL_HTTP_URL'), {
      query: '{items{id name done}}',
    });
  });
});
