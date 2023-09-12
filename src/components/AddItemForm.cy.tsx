import AddItemForm from '@/components/AddItemForm';

describe('<AddItemForm />', () => {
  it('button text is Add', () => {
    cy.mount(<AddItemForm onNewItem={cy.stub()} />);

    cy.get('button').contains('Add');
  });

  it('onNewItem is called correctly', () => {
    cy.mount(<AddItemForm onNewItem={cy.spy().as('onNewItem')} />);

    cy.get('input').type('wash dishes');
    cy.get('button').click();

    cy.get('@onNewItem').should('have.been.calledOnceWithExactly', 'wash dishes');
  });

  it('field cleared on successful add', () => {
    cy.mount(<AddItemForm onNewItem={cy.stub().returns(true)} />);

    cy.get('input').type('wash dishes');
    cy.get('input').should('contain.value', 'wash dishes');

    cy.get('button').click();
    cy.get('input').should('be.empty');
  });

  it("doesn't submit on empty field", () => {
    cy.mount(<AddItemForm onNewItem={cy.spy().as('onNewItem')} />);

    cy.get('button').click();

    cy.get('@onNewItem').should('not.have.been.called');
  });
});
