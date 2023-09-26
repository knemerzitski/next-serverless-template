import {
  CreateTableCommand,
  DeleteTableCommand,
  DynamoDBClient,
  KeyType,
  ResourceNotFoundException,
  ScalarAttributeType,
  TableStatus,
  BillingMode,
  ProjectionType,
} from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { faker } from '@faker-js/faker';

import { DdbTableClient } from './DdbTableClient';

let DB: DdbTableClient;

describe('DdbTableClient', () => {
  faker.seed(89);

  function newItem() {
    return {
      id: faker.string.uuid(),
      connectionId: `connection:${faker.string.uuid()}`,
      createdAt: Math.floor(faker.date.recent().getTime() / 1000),
      simpleAttr: faker.string.sample(),
      nestedAttr: {
        first: faker.string.sample(),
      },
      ttl: Math.floor(Date.now() / 1000) + 60 * 60,
    };
  }

  // Create an empty table to run tests on
  beforeAll(async () => {
    const tableName = 'test-table';

    const client = new DynamoDBClient({
      region: 'eu-central-1',
      endpoint: 'http://localhost:8000',
      credentials: {
        accessKeyId: 'dummykey123',
        secretAccessKey: 'dummysecretkey123',
      },
    });
    const documentClient = DynamoDBDocumentClient.from(client);

    DB = new DdbTableClient({ documentClient, tableName, log: () => {} });

    // Delete existing table
    try {
      await documentClient.send(
        new DeleteTableCommand({
          TableName: tableName,
        })
      );
    } catch (err) {
      // All good if table already doesn't exist
      if (!(err instanceof ResourceNotFoundException)) {
        if ((err as Error).message?.startsWith('AWS SDK error wrapper for Error: connect ECONNREFUSED')) {
          (err as Error).message += ' (Run `npm run test:start:ddb` before tests)';
        }
        throw err;
      }
    }

    // Create new table
    const createTableOuput = await documentClient.send(
      new CreateTableCommand({
        BillingMode: BillingMode.PAY_PER_REQUEST,
        TableName: tableName,
        KeySchema: [
          {
            AttributeName: 'id',
            KeyType: KeyType.HASH,
          },
        ],
        AttributeDefinitions: [
          {
            AttributeName: 'id',
            AttributeType: ScalarAttributeType.S,
          },
          {
            AttributeName: 'connectionId',
            AttributeType: ScalarAttributeType.S,
          },
        ],
        GlobalSecondaryIndexes: [
          {
            IndexName: 'ConnectionIndex',
            Projection: {
              ProjectionType: ProjectionType.ALL,
            },
            KeySchema: [
              {
                AttributeName: 'connectionId',
                KeyType: KeyType.HASH,
              },
            ],
          },
        ],
      })
    );
    expect(createTableOuput.TableDescription?.TableStatus).toBe(TableStatus.ACTIVE);
  });

  it('puts to db and gets item with same content', async () => {
    const item = newItem();

    await DB.put(item);

    const getItem = await DB.get({
      id: item.id,
    });
    expect(getItem).not.toBe(item);
    expect(getItem).toStrictEqual(item);
  });

  it('second put returns item indicating that item already exists', async () => {
    const putTwiceItem = newItem();

    expect(await DB.put(putTwiceItem)).toBeUndefined();
    expect(await DB.put(putTwiceItem)).toStrictEqual(putTwiceItem);
  });

  it('updates only single attribute without altering other attributes', async () => {
    const item = newItem();
    const simpleDiffItem = { ...item, simpleAttr: faker.string.sample() };

    await DB.put(item);

    const updatedItem = await DB.update(
      { id: item.id },
      {
        simpleAttr: simpleDiffItem.simpleAttr,
      }
    );
    expect(updatedItem).toStrictEqual(simpleDiffItem);

    const getItem = await DB.get({
      id: item.id,
    });
    expect(getItem).toStrictEqual(simpleDiffItem);
  });

  it('updates whole item', async () => {
    const item = newItem();
    const diffItem = {
      ...item,
      simpleAttr: faker.string.sample(),
      nestedAttr: {
        replacedFirst: faker.string.sample(),
      },
    };

    await DB.put(item);

    const updatedItem = await DB.update({ id: diffItem.id }, diffItem);
    expect(updatedItem).toStrictEqual(diffItem);

    const getItem = await DB.get({
      id: item.id,
    });
    expect(getItem).toStrictEqual(diffItem);
  });

  it('queries by secondary global index', async () => {
    // Two items with same secondary global index
    const item1 = newItem();
    const item2 = newItem();
    item2.connectionId = item1.connectionId;

    // 1MB = 1000kb = 1000000b

    const otherItem1 = newItem();

    await Promise.all([DB.put(item1), DB.put(item2), DB.put(otherItem1)]);

    const items = await DB.queryAll({
      IndexName: 'ConnectionIndex',
      ExpressionAttributeNames: {
        '#c': 'connectionId',
      },
      ExpressionAttributeValues: {
        ':1': item1.connectionId,
      },
      KeyConditionExpression: '#c = :1',
    });

    expect(items.length).toBe(2);
    expect(items).toEqual(expect.arrayContaining([item1, item2]));
  });

  it('collects query responses larger than 1MB', async () => {
    const item = newItem();
    item.simpleAttr = faker.string.sample({ min: 409000, max: 409000 });
    const expectedItems = [...Array(4).keys()].map(() => ({
      ...item,
      id: faker.string.uuid(),
    }));

    await Promise.all(expectedItems.map((item) => DB.put(item)));

    const items = await DB.queryAll({
      IndexName: 'ConnectionIndex',
      ExpressionAttributeNames: {
        '#c': 'connectionId',
      },
      ExpressionAttributeValues: {
        ':1': item.connectionId,
      },
      KeyConditionExpression: '#c = :1',
    });

    expect(items.length).toBe(expectedItems.length);
    expect(items).toEqual(expect.arrayContaining(expectedItems));
  });

  it('deletes item', async () => {
    const item = newItem();

    await DB.put(item);

    await DB.delete({ id: item.id });

    const afterDeleteItem = await DB.get({
      id: item.id,
    });
    expect(afterDeleteItem).toBeUndefined();
  });
});
