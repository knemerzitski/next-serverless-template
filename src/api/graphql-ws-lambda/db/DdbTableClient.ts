import { ReturnValue, Select } from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  QueryCommandInput,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';

import { LoggerFunction } from './../types';

export class DdbTableClient {
  documentClient!: DynamoDBDocumentClient;
  tableName!: string;
  log!: LoggerFunction;

  constructor(params: { documentClient: DynamoDBDocumentClient; tableName: string; log: LoggerFunction }) {
    Object.assign(this, params);
  }

  async get(Key: Record<string, unknown>) {
    this.log('get', { tableName: this.tableName, Key });
    try {
      const { Item } = await this.documentClient.send(
        new GetCommand({
          TableName: this.tableName,
          Key,
        })
      );
      this.log('get:result', { Item });
      return Item;
    } catch (e) {
      this.log('get:error', e);
      throw e;
    }
  }

  async put(Item: Record<string, unknown>) {
    this.log('put', { tableName: this.tableName, Item });
    try {
      const { Attributes } = await this.documentClient.send(
        new PutCommand({
          TableName: this.tableName,
          Item,
          ReturnValues: ReturnValue.ALL_OLD,
        })
      );
      return Attributes;
    } catch (e) {
      this.log('put:error', e);
      throw e;
    }
  }

  async update(Key: Record<string, unknown>, item: Record<string, unknown>) {
    this.log('update', { tableName: this.tableName, Key, item });
    try {
      const itemWithoutKeys = Object.entries(item)
        .filter(([key]) => !(key in Key))
        .reduce(
          (acc, [key, val]) => {
            acc[key] = val;
            return acc;
          },
          {} as Record<string, unknown>
        );

      const expression = DdbTableClient.getItemAsUpdateExpression(itemWithoutKeys);

      const { Attributes } = await this.documentClient.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key,
          ReturnValues: ReturnValue.ALL_NEW,
          ...expression,
        })
      );
      return Attributes;
    } catch (e) {
      this.log('update:error', e);
      throw e;
    }
  }

  private async queryOnce(options: Omit<QueryCommandInput, 'TableName' | 'Select'>) {
    this.log('queryOnce', { tableName: this.tableName, options });
    try {
      return await this.documentClient.send(
        new QueryCommand({
          TableName: this.tableName,
          Select: Select.ALL_ATTRIBUTES,
          ...options,
        })
      );
    } catch (e) {
      this.log('queryOnce:error', e);
      throw e;
    }
  }

  private async *query(options: Omit<QueryCommandInput, 'TableName' | 'Select'>) {
    this.log('query', { tableName: this.tableName, options });
    try {
      let LastEvaluatedKey: Record<string, unknown> | undefined = undefined;

      do {
        let Items: Record<string, unknown>[] | undefined = undefined;

        ({ Items, LastEvaluatedKey } = await this.queryOnce({
          ...options,
          ExclusiveStartKey: LastEvaluatedKey,
        }));

        if (Items) {
          for (const item of Items) {
            yield item;
          }
        }
      } while (LastEvaluatedKey);
    } catch (e) {
      this.log('query:error', e);
      throw e;
    }
  }

  async queryAll(options: Omit<QueryCommandInput, 'TableName' | 'Select'>) {
    const result: Record<string, unknown>[] = [];
    for await (const item of this.query(options)) {
      result.push(item);
    }
    return result;
  }

  async delete(Key: Record<string, unknown>) {
    this.log('delete', { tableName: this.tableName, Key });
    try {
      const { Attributes } = await this.documentClient.send(
        new DeleteCommand({
          TableName: this.tableName,
          Key,
          ReturnValues: ReturnValue.ALL_OLD,
        })
      );
      return Attributes;
    } catch (e) {
      this.log('delete:error', e);
      throw e;
    }
  }

  private static getItemAsUpdateExpression(item: Record<string, unknown>) {
    const updateExpressionParts: string[] = [];
    const ExpressionAttributeNames: Record<string, string> = {};
    const ExpressionAttributeValues: Record<string, unknown> = {};

    let counter = 0;
    for (const key of Object.keys(item)) {
      const namePlaceholder = `#n${counter}`;
      const valuePlaceholder = `:v${counter}`;

      updateExpressionParts.push(`${namePlaceholder} = ${valuePlaceholder}`);
      ExpressionAttributeNames[namePlaceholder] = key;
      ExpressionAttributeValues[valuePlaceholder] = item[key];

      counter++;
    }

    return {
      UpdateExpression: `SET ${updateExpressionParts.join(', ')}`,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
    };
  }
}
