import Home from './page';

describe('<Home />', () => {
  it('renders and displays expected content', () => {
    cy.mount(<Home />);

    cy.get('h1').contains('About Page');

    cy.get('a[href="/"]').should('be.visible');
  });
});
