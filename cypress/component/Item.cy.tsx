import { faker } from '@faker-js/faker';

import Item from '@/components/Item';

describe('<Item />', () => {
  it('should display name', () => {
    const itemName = faker.string.sample();

    cy.mount(<Item name={itemName} />);

    cy.get('span').should('contain.text', itemName);
  });

  it('should have line-through style when done', () => {
    cy.mount(<Item name={faker.string.sample()} done={true} />);

    cy.get('span').should('have.css', 'text-decoration-line', 'line-through');
  });

  it('should have no line-through style on new', () => {
    cy.mount(<Item name={faker.string.sample()} />);

    cy.get('span').should('have.css', 'text-decoration-line', 'none');
  });

  it('should toggle done on event onUpdateDone', () => {
    cy.mount(<Item name={faker.string.sample()} done={true} onUpdateDone={cy.spy().as('onUpdateDone')} />);

    cy.get('li').click();

    cy.get('@onUpdateDone').should('have.been.calledOnceWithExactly', false);
  });

  it('should call event onRemove when clicking button', () => {
    cy.mount(
      <Item
        name={faker.string.sample()}
        onRemove={cy.stub().as('onRemove')}
        onUpdateDone={cy.spy().as('onUpdateDone')}
      />
    );

    cy.get('button').click();

    cy.get('@onRemove').should('have.been.calledOnce');
    cy.get('@onUpdateDone').should('not.have.been.called');
  });
});
