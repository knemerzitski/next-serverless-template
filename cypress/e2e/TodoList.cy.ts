import { faker } from '@faker-js/faker';
import { UUID } from 'bson';

const collectionName = 'items';

describe('Todo List', () => {
  faker.seed(81112);

  beforeEach(() => {
    cy.dropCollection(collectionName, { failSilently: true });
  });

  it('visits home page', () => {
    cy.visit('/');
  });

  it('adds item from add button', () => {
    const itemName = faker.string.sample();

    cy.visit('/');

    cy.get('input').type(itemName);
    cy.get('button').contains('Add').click();

    cy.get('ul').children().should('have.length', 1);

    cy.reload();

    cy.get('li').should('contain.text', itemName);
    cy.get('ul').children().should('have.length', 1);
  });

  it('sets item done by clicking on it', () => {
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

  it('removes existing item by clicking on X', () => {
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

  it('receives added item by listening to subscription', () => {
    const newItemname = faker.string.sample();

    cy.visit('/');

    // Wait for App to be ready to receive subscriptions
    cy.get('body').should('not.contain.text', 'Loading...');

    // Create item via API
    cy.request('POST', Cypress.env('NEXT_PUBLIC_GRAPHQL_HTTP_URL'), {
      query:
        'mutation InsertItem($name: String!) {\n  insertItem(name: $name) {\n    id name done\n  }\n}',
      variables: { name: newItemname },
    });

    cy.get('li').should('contain.text', newItemname);
    cy.get('ul').children().should('have.length', 1);
  });

  it('receives item done by listening to subscription', () => {
    const setItemDoneId = faker.string.uuid();
    const setItemDoneName = faker.string.sample();
    cy.insertMany(
      [
        {
          _id: new UUID(setItemDoneId),
          name: setItemDoneName,
          done: false,
        },
        {
          _id: new UUID(faker.string.uuid()),
          name: 'do NOT touch me',
          done: false,
        },
      ],
      {
        collection: collectionName,
      }
    );

    cy.visit('/');

    cy.get('span').contains(setItemDoneName).should('have.css', 'text-decoration-line', 'none');

    // Update item via API
    cy.request('POST', Cypress.env('NEXT_PUBLIC_GRAPHQL_HTTP_URL'), {
      query:
        'mutation UpdateItem($updateItemId: ID!, $done: Boolean) {\n  updateItem(id: $updateItemId, done: $done)\n}',
      variables: { updateItemId: setItemDoneId, done: true },
    });

    cy.get('span')
      .contains(setItemDoneName)
      .should('have.css', 'text-decoration-line', 'line-through');

    cy.get('span').contains('do NOT touch me').should('have.css', 'text-decoration-line', 'none');
  });

  it('removes existing item by listening to subscription', () => {
    const removeItemId = faker.string.uuid();

    cy.insertMany(
      [
        {
          _id: new UUID(removeItemId),
          name: faker.string.sample(),
          done: false,
        },
        {
          _id: new UUID(faker.string.uuid()),
          name: 'i must stay',
          done: false,
        },
      ],
      {
        collection: collectionName,
      }
    );

    cy.visit('/');

    cy.get('ul').children().should('have.length', 2);

    // Delete item via API
    cy.request('POST', Cypress.env('NEXT_PUBLIC_GRAPHQL_HTTP_URL'), {
      query: 'mutation DeleteItem($deleteItemId: ID!) {\n  deleteItem(id: $deleteItemId)\n}',
      variables: { deleteItemId: removeItemId },
    });

    cy.get('li').should('contain.text', 'i must stay');
    cy.get('ul').children().should('have.length', 1);
  });
});
