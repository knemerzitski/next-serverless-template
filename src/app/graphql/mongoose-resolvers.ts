import { Item } from '@/app/graphql/mongoose-schema';

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
      return newItem;
    },
    async updateItem(parent: unknown, { id, name, done }: { id: string; name: string; done: boolean }) {
      await Item.findByIdAndUpdate(id, { name, done });
      return true;
    },
    async deleteItem(parent: unknown, { id }: { id: string }) {
      await Item.findByIdAndDelete(id);
      return true;
    },
  },
};

export default resolvers;
