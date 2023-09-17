import { faker } from '@faker-js/faker';

import ItemsList from '@/components/ItemsList';

describe('<ItemsList />', () => {
  const items = [
    {
      id: faker.string.uuid(),
      name: faker.string.sample(),
      done: true,
    },
    {
      id: faker.string.uuid(),
      name: faker.string.sample(),
      done: false,
    },
  ];

  it('should display items in correct order', () => {
    cy.mount(<ItemsList items={...items} onRemoveItem={cy.spy()} onUpdateItemDone={cy.stub()} />);
    items.map((_, index) => {
      cy.get('li').eq(index).should('contain.text', items[index].name);
    });
  });

  it('it should call onRemoveItem event with correct id', () => {
    cy.mount(<ItemsList items={...items} onRemoveItem={cy.spy().as('onRemoveItem')} onUpdateItemDone={cy.stub()} />);

    cy.get('li button').eq(1).click();
    cy.get('@onRemoveItem').should('have.been.calledOnceWithExactly', items[1].id);
  });

  it('should call onUpdateItemDone with correct id and done', () => {
    cy.mount(
      <ItemsList items={...items} onRemoveItem={cy.stub()} onUpdateItemDone={cy.spy().as('onUpdateItemDone')} />
    );

    cy.get('li').eq(1).click();

    cy.get('@onUpdateItemDone').should('have.been.calledOnceWithExactly', items[1].id, true);
  });
});
