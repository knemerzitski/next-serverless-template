import { useQuery, useMutation } from '@apollo/client';
import { useEffect } from 'react';
import { v4 as uuid } from 'uuid';

import { gql } from '@/__generated__/gql';
import AddItemForm from '@/components/AddItemForm';
import ItemsList from '@/components/ItemsList';

const GET_ITEMS = gql(` 
  query Items {
    items {
      id
      name
      done 
    }
  }
`);

const ADD_ITEM = gql(`
  mutation AddItem($name: String!) {
    insertItem(name: $name) {
      optimistic @client
      id
      name
      done
    }
  }
`);

const UPDATE_ITEM = gql(`
  mutation UpdateItem($id: ID!, $name: String, $done: Boolean) {
    updateItem(id: $id, name: $name, done: $done)
  }
`);

const REMOVE_ITEM = gql(`
  mutation RemoveItem($id: ID!) {
    deleteItem(id: $id)
  }
`);

const ITEM_ADDED = gql(`
  subscription OnItemAdded {
    itemCreated {
      id
      name
      done
    }
  }
`);

const ITEM_UPDATED = gql(`
  subscription OnItemUpdated {
    itemUpdated {
      id
      name
      done
    }
  }
`);

const ITEM_REMOVED = gql(`
  subscription OnItemRemoved {
    itemRemoved
  }
`);

export default function TodoList() {
  const { data, loading, error, subscribeToMore } = useQuery(GET_ITEMS);
  const [addItem] = useMutation(ADD_ITEM);
  const [updateItem] = useMutation(UPDATE_ITEM);
  const [removeItem] = useMutation(REMOVE_ITEM);

  useEffect(() => {
    subscribeToMore({
      document: ITEM_ADDED,
      updateQuery(cachedData, { subscriptionData }) {
        if (!subscriptionData.data) return cachedData;
        const newItem = subscriptionData.data.itemCreated;

        // Check for duplicate id
        if (cachedData.items.some((cachedItem) => cachedItem.id === newItem.id)) {
          return cachedData;
        }

        return {
          items: [...cachedData.items, newItem],
        };
      },
    });

    subscribeToMore({
      document: ITEM_UPDATED,
      updateQuery(cachedData, { subscriptionData }) {
        if (!subscriptionData.data) return cachedData;
        const updatedItem = subscriptionData.data.itemUpdated;

        return {
          items: cachedData.items.map((cachedItem) =>
            cachedItem.id === updatedItem.id ? updatedItem : cachedItem
          ),
        };
      },
    });

    subscribeToMore({
      document: ITEM_REMOVED,
      updateQuery(cachedData, { subscriptionData }) {
        if (!subscriptionData.data) return cachedData;
        const removedId = subscriptionData.data.itemRemoved;

        return {
          items: cachedData.items.filter((cachedItem) => cachedItem.id !== removedId),
        };
      },
    });
  }, [subscribeToMore]);

  if (loading) {
    return 'Loading...';
  }
  if (error) {
    return `Error ${error.message}`;
  }

  const items = data!.items;

  async function handleAddItem(name: string) {
    // const { errors } = await addItem({
    addItem({
      variables: {
        name,
      },
      optimisticResponse: {
        insertItem: {
          optimistic: true,
          id: uuid(),
          name,
          done: false,
        },
      },
      update(cache, { data }) {
        if (data?.insertItem) {
          cache.updateQuery({ query: GET_ITEMS }, (cachedData) => {
            if (cachedData) {
              if (cachedData.items.some((cachedItem) => cachedItem.id === data.insertItem.id)) {
                return cachedData;
              }
              return { items: [...cachedData.items, data.insertItem] };
            }
          });
        }
      },
    });
    return true;
  }

  async function handleUpdateItemDone(id: string, done: boolean) {
    const { data } = await updateItem({
      variables: {
        id,
        done,
      },
      optimisticResponse: {
        updateItem: true,
      },
      update(cache, { data }) {
        if (data?.updateItem) {
          cache.updateQuery({ query: GET_ITEMS }, (cachedData) => {
            if (cachedData) {
              return {
                items: cachedData.items.map((item) => ({
                  ...item,
                  done: id === item.id ? done : item.done,
                })),
              };
            }
          });
        }
      },
    });
    return data?.updateItem ?? false;
  }

  async function handleRemoveItem(id: string) {
    const { data } = await removeItem({
      variables: {
        id,
      },
      optimisticResponse: {
        deleteItem: true,
      },
      update(cache, { data }) {
        if (data?.deleteItem) {
          cache.updateQuery({ query: GET_ITEMS }, (cachedData) => {
            if (cachedData) {
              return {
                items: cachedData.items.filter((item) => id !== item.id),
              };
            }
          });
        }
      },
    });
    return data?.deleteItem ?? false;
  }

  return (
    <>
      <ItemsList
        items={items}
        onRemoveItem={handleRemoveItem}
        onUpdateItemDone={handleUpdateItemDone}
      />
      <AddItemForm onNewItem={handleAddItem} />
    </>
  );
}
