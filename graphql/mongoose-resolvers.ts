import { PubSub } from 'graphql-subscriptions';

import { Item } from './mongoose-schema';

const pubsub = new PubSub();

const resolvers = {
  Query: {
    async items() {
      return await Item.find();
    },
    async item(parent: unknown, { id }: { id: string }) {
      return await Item.findById(id);
    },
  },
  Mutation: {
    async insertItem(parent: unknown, { name }: { name: string }) {
      const newItem = new Item({ name, done: false });
      await newItem.save();

      pubsub.publish('ITEM_CREATED', {
        itemCreated: {
          id: newItem.id,
          name: newItem.name,
          done: newItem.done,
        },
      });

      return newItem;
    },
    async updateItem(
      parent: unknown,
      { id, name, done }: { id: string; name?: string; done?: boolean }
    ): Promise<boolean> {
      const updatedItem = await Item.findByIdAndUpdate(id, { name, done });

      pubsub.publish('ITEM_UPDATED', {
        itemUpdated: {
          id,
          name: name ?? updatedItem.name,
          done: done ?? updatedItem.done,
        },
      });

      return true;
    },
    async deleteItem(parent: unknown, { id }: { id: string }) {
      await Item.findByIdAndDelete(id);
      pubsub.publish('ITEM_REMOVED', {
        itemRemoved: id,
      });
      return true;
    },
  },
  Subscription: {
    itemCreated: {
      subscribe() {
        return pubsub.asyncIterator(['ITEM_CREATED']);
      },
    },
    itemUpdated: {
      subscribe() {
        return pubsub.asyncIterator(['ITEM_UPDATED']);
      },
    },
    itemRemoved: {
      subscribe() {
        return pubsub.asyncIterator(['ITEM_REMOVED']);
      },
    },
  },
};

export default resolvers;
