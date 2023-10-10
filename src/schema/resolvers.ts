import { Connection as MongooseConnection } from 'mongoose';

import { Publisher } from '../api/pubsub/publish';
import { Subscriber } from '../api/pubsub/subscribe';

export interface MongooseQueryMutationContext {
  mongoose: MongooseConnection;
  publish: Publisher;
}

export interface MongooseSubscriptionContext<TReturn = unknown> {
  subscribe: Subscriber<TReturn>;
}

export const queryMutationResolvers = {
  Query: {
    async items(_parent: unknown, _args: unknown, context: MongooseQueryMutationContext) {
      const Item = context.mongoose.model('Item');

      return await Item.find();
    },
    async item(
      _parent: unknown,
      { id }: { id: string },
      { mongoose }: MongooseQueryMutationContext
    ) {
      const Item = mongoose.model('Item');

      return await Item.findById(id);
    },
  },
  Mutation: {
    async insertItem(
      _parent: unknown,
      { name }: { name: string },
      { mongoose, publish }: MongooseQueryMutationContext
    ) {
      const Item = mongoose.model('Item');

      const newItem = new Item({ name, done: false });
      await newItem.save();

      publish('ITEM_CREATED', {
        itemCreated: {
          id: newItem.id,
          name: newItem.name,
          done: newItem.done,
        },
      });

      return newItem;
    },
    async updateItem(
      _parent: unknown,
      { id, name, done }: { id: string; name?: string; done?: boolean },
      { mongoose, publish }: MongooseQueryMutationContext
    ): Promise<boolean> {
      const Item = mongoose.model('Item');

      const updatedItem = await Item.findByIdAndUpdate(id, { name, done });

      publish('ITEM_UPDATED', {
        itemUpdated: {
          id,
          name: name ?? updatedItem.name,
          done: done ?? updatedItem.done,
        },
      });

      return true;
    },
    async deleteItem(
      _parent: unknown,
      { id }: { id: string },
      { mongoose, publish }: MongooseQueryMutationContext
    ) {
      const Item = mongoose.model('Item');

      await Item.findByIdAndDelete(id);
      publish('ITEM_REMOVED', {
        itemRemoved: id,
      });
      return true;
    },
  },
};

// interface NewSubscribe {
//   subscribe: GraphQLFieldResolver<unknown,MongooseSubscriptionContext>,
//   resolve: GraphQLFieldResolver<unknown,MongooseSubscriptionContext>,
// }

// export const s: NewSubscribe = {
//   subscribe(_parent: unknown, _args: unknown, { subscribe }) {
//     return subscribe('ITEM_CREATED');
//   },
//   resolve(payload: unknown, _args: unknown) {
//     console.log({ payload, other, more });
//     return payload;
//   },
// }

export const subscriptionResolvers = {
  Subscription: {
    itemCreated: {
      subscribe(_parent: unknown, _args: unknown, { subscribe }: MongooseSubscriptionContext) {
        return subscribe('ITEM_CREATED');
      },
      resolve(payload: unknown) {
        return payload;
      },
    },
    itemUpdated: {
      subscribe(_parent: unknown, _args: unknown, { subscribe }: MongooseSubscriptionContext) {
        return subscribe('ITEM_UPDATED');
      },
      resolve(payload: unknown) {
        return payload;
      },
    },
    itemRemoved: {
      subscribe(_parent: unknown, _args: unknown, { subscribe }: MongooseSubscriptionContext) {
        return subscribe('ITEM_REMOVED');
      },
      resolve(payload: unknown) {
        return payload;
      },
    },
  },
};

// export const resolvers = {
//   ...queryMutationResolvers,
//   ...subscriptionResolvers,
// };
