describe('API', () => {
  it('responds to query', () => {
    cy.request('POST', Cypress.env('NEXT_PUBLIC_GRAPHQL_HTTP_URL'), {
      query: '{items{id name done}}',
    });
  });
});
