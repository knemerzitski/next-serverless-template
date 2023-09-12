import Item from '@/components/Item';

describe('<Item />', () => {
  it('displays name', () => {
    cy.mount(<Item name="Just an item" />);

    cy.get('span').contains('Just an item');
  });

  it('done item has line-through style', () => {
    cy.mount(<Item name="Done item" done={true} />);

    cy.get('span').should('have.css', 'text-decoration-line', 'line-through');
  });

  it('new item has no text decoration', () => {
    cy.mount(<Item name="New item" />);

    cy.get('span').should('have.css', 'text-decoration-line', 'none');
  });

  it('onUpdateDone toggles done', () => {
    cy.mount(<Item name="Just an item" done={true} onUpdateDone={cy.spy().as('onUpdateDone')} />);

    cy.get('li').click();

    cy.get('@onUpdateDone').should('have.been.calledOnceWithExactly', false);
  });

  it('only onRemove called when clicking X', () => {
    cy.mount(
      <Item name="Just an item" onRemove={cy.stub().as('onRemove')} onUpdateDone={cy.spy().as('onUpdateDone')} />
    );

    cy.get('button').click();

    cy.get('@onRemove').should('have.been.calledOnce');
    cy.get('@onUpdateDone').should('not.have.been.called');
  });
});
