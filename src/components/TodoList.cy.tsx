import TodoList from '@/components/TodoList';

describe('<TodoList />', () => {
  it('onAddItem is drilled', () => {
    cy.mount(
      <TodoList items={[]} onAddItem={cy.spy().as('onAddItem')} onRemoveItem={cy.stub()} onUpdateItemDone={cy.stub()} />
    );

    cy.get('input').type('do chores');
    cy.contains('button', 'Add').click();

    cy.get('@onAddItem').should('have.been.calledOnceWithExactly', 'do chores');
  });

  it('calls onRemoveItem correctly with id', () => {
    cy.mount(
      <TodoList
        items={[
          {
            id: 5,
            name: 'my item no',
            done: true,
          },
          {
            id: 10,
            name: 'my item',
            done: false,
          },
        ]}
        onAddItem={cy.stub()}
        onRemoveItem={cy.spy().as('onRemoveItem')}
        onUpdateItemDone={cy.stub()}
      />
    );

    cy.get('span')
      .contains(/^my item$/)
      .siblings('button')
      .click();

    cy.get('@onRemoveItem').should('have.been.calledOnceWithExactly', 10);
  });

  it('calls onUpdateItemDone correctly with id and done', () => {
    cy.mount(
      <TodoList
        items={[
          {
            id: 5,
            name: 'my item no',
            done: true,
          },
          {
            id: 10,
            name: 'my item',
            done: false,
          },
        ]}
        onAddItem={cy.stub()}
        onRemoveItem={cy.stub()}
        onUpdateItemDone={cy.spy().as('onUpdateItemDone')}
      />
    );

    cy.get('span')
      .contains(/^my item$/)
      .click();

    cy.get('@onUpdateItemDone').should('have.been.calledOnceWithExactly', 10, true);
  });
});
