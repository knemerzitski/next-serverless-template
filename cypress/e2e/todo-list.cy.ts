import { faker } from '@faker-js/faker';
import { UUID } from 'bson';

const collectionName = 'items';

describe('Todo List', () => {
  beforeEach(() => {
    cy.dropCollection(collectionName, { failSilently: true });
  });

  it('visits home page', () => {
    cy.visit('/');
  });

  it('should add item', () => {
    const itemName = faker.string.sample();

    cy.visit('/');

    cy.get('input').type(itemName);
    cy.get('button').contains('Add').click();

    cy.get('ul').children().should('have.length', 1);

    cy.reload();

    cy.get('li').should('contain.text', itemName);
    cy.get('ul').children().should('have.length', 1);
  });

  it('should set item done', () => {
    cy.insertOne(
      {
        _id: new UUID(faker.string.uuid()),
        name: faker.string.sample(),
        done: false,
      },
      {
        collection: collectionName,
      }
    );

    cy.visit('/');

    cy.get('span').should('have.css', 'text-decoration-line', 'none');
    cy.get('span').click();
    cy.get('span').should('have.css', 'text-decoration-line', 'line-through');

    cy.reload();

    cy.get('span').should('have.css', 'text-decoration-line', 'line-through');
  });

  it('should remove item', () => {
    cy.insertOne(
      {
        _id: new UUID(faker.string.uuid()),
        name: faker.string.sample(),
        done: false,
      },
      {
        collection: collectionName,
      }
    );

    cy.visit('/');

    cy.get('li button').click();

    cy.get('ul').children().should('have.length', 0);

    cy.reload();

    cy.get('ul').children().should('have.length', 0);
  });
});
