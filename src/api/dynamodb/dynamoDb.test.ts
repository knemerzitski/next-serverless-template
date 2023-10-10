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

import { emptyLogger } from '../../utils/logger';

import { Table, newTable } from './dynamoDb';

describe('newTable', () => {
  faker.seed(89);

  let TABLE: Table<{ id: string }, Record<string, unknown>>;

  function newItem() {
    return {
      id: faker.string.uuid(),
      connectionId: `connection:${faker.string.uuid()}`,
      simpleAttr: faker.string.sample(),
      nestedAttr: {
        first: faker.string.sample(),
      },
      undefinedValue: undefined,
    };
  }

  function asSavedItem<T extends { undefinedValue: undefined }>(
    item: T
  ): Omit<T, 'undefinedValue'> {
    const savedItem = {
      ...item,
    };
    delete savedItem.undefinedValue;

    return savedItem;
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
    const documentClient = DynamoDBDocumentClient.from(client, {
      marshallOptions: {
        removeUndefinedValues: true,
      },
    });

    TABLE = newTable({
      documentClient,
      tableName,
      logger: emptyLogger(),
    });

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
        if (
          (err as Error).message?.startsWith(
            'AWS SDK error wrapper for Error: connect ECONNREFUSED'
          )
        ) {
          (err as Error).message += ' (Run `npm run test:unit:prepare` before tests)';
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

  it('adds item to db only once, returns false on subsequent adds', async () => {
    const item = newItem();
    const savedItem = asSavedItem(item);
    const differentButSameIdItem = newItem();
    differentButSameIdItem.id = item.id;

    const key = ['id'];

    expect(await TABLE.add(key, item)).toBe(true);
    expect(
      await TABLE.get({
        id: item.id,
      })
    ).toStrictEqual(savedItem);

    await TABLE.add(key, differentButSameIdItem);
    expect(await TABLE.add(key, differentButSameIdItem)).toBe(false);
    expect(
      await TABLE.get({
        id: item.id,
      })
    ).toStrictEqual(savedItem);
  });

  it('puts to db and gets item with same content', async () => {
    const item = newItem();
    const savedItem = asSavedItem(item);

    await TABLE.put(item);

    const getItem = await TABLE.get({
      id: item.id,
    });
    expect(getItem).not.toBe(savedItem);
    expect(getItem).toStrictEqual(savedItem);
  });

  it('second put returns item indicating that item already exists', async () => {
    const putTwiceItem = newItem();
    const savedItem = asSavedItem(putTwiceItem);

    expect(await TABLE.put(putTwiceItem)).toBeUndefined();
    expect(await TABLE.put(putTwiceItem)).toStrictEqual(savedItem);
  });

  it('updates only single attribute without altering other attributes', async () => {
    const item = newItem();
    const simpleDiffItem = asSavedItem({ ...item, simpleAttr: faker.string.sample() });

    await TABLE.put(item);

    const updatedItem = await TABLE.update(
      { id: item.id },
      {
        simpleAttr: simpleDiffItem.simpleAttr,
      }
    );
    expect(updatedItem).toStrictEqual(simpleDiffItem);

    const getItem = await TABLE.get({
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
    const savedDiffItem = asSavedItem(diffItem);

    await TABLE.put(item);

    const updatedItem = await TABLE.update({ id: diffItem.id }, diffItem);
    expect(updatedItem).toStrictEqual(savedDiffItem);

    const getItem = await TABLE.get({
      id: item.id,
    });
    expect(getItem).toStrictEqual(savedDiffItem);
  });

  it('queries by secondary global index', async () => {
    // Two items with same secondary global index
    const item1 = newItem();
    const item2 = newItem();
    item2.connectionId = item1.connectionId;

    // 1MB = 1000kb = 1000000b

    const otherItem1 = newItem();

    await Promise.all([TABLE.put(item1), TABLE.put(item2), TABLE.put(otherItem1)]);

    const items = await TABLE.queryAll({
      IndexName: 'ConnectionIndex',
      ExpressionAttributeNames: {
        '#a': 'connectionId',
      },
      ExpressionAttributeValues: {
        ':1': item1.connectionId,
      },
      KeyConditionExpression: '#a = :1',
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

    await Promise.all(expectedItems.map((item) => TABLE.put(item)));

    const items = await TABLE.queryAll({
      IndexName: 'ConnectionIndex',
      ExpressionAttributeNames: {
        '#a': 'connectionId',
      },
      ExpressionAttributeValues: {
        ':1': item.connectionId,
      },
      KeyConditionExpression: '#a = :1',
    });

    expect(items.length).toBe(expectedItems.length);
    expect(items).toEqual(expect.arrayContaining(expectedItems));
  });

  it('deletes item', async () => {
    const item = newItem();

    await TABLE.put(item);

    await TABLE.delete({ id: item.id });

    const afterDeleteItem = await TABLE.get({
      id: item.id,
    });
    expect(afterDeleteItem).toBeUndefined();
  });
});
