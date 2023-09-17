import { faker } from '@faker-js/faker';

import AddItemForm from '@/components/AddItemForm';

describe('<AddItemForm />', () => {
  it('should have button text Add', () => {
    cy.mount(<AddItemForm onNewItem={cy.stub()} />);

    cy.get('button').contains('Add');
  });

  it('should call onNewItem on submit', () => {
    const inputText = faker.string.sample();

    cy.mount(<AddItemForm onNewItem={cy.spy().as('onNewItem')} />);

    cy.get('input').type(inputText);
    cy.get('button').click();

    cy.get('@onNewItem').should('have.been.calledOnceWithExactly', inputText);
  });

  it('should clear field on submit', () => {
    const inputText = faker.string.sample();

    cy.mount(<AddItemForm onNewItem={cy.stub().returns(true)} />);

    cy.get('input').type(inputText);
    cy.get('input').should('contain.value', inputText);

    cy.get('button').click();
    cy.get('input').should('be.empty');
  });

  it('should not submit with empty field', () => {
    cy.mount(<AddItemForm onNewItem={cy.spy().as('onNewItem')} />);

    cy.get('button').click();

    cy.get('@onNewItem').should('not.have.been.called');
  });
});
