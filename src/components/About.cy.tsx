import About from '@/components/About';

describe('<Home />', () => {
  it('renders and displays expected content', () => {
    cy.mount(<About />);

    cy.get('h1').contains('About Page');

    cy.get('a[href="/"]').should('be.visible');
  });
});
