'use client';

import classNames from 'classnames';
import { useRef, useState } from 'react';

import TodoList, { ItemProps } from '@/components/TodoList';

const initialItems = [
  {
    id: 1,
    name: 'An item 1',
    done: false,
  },
  {
    id: 2,
    name: 'Item two',
    done: false,
  },
  {
    id: 3,
    name: 'The item third',
    done: true,
  },
  {
    id: 4,
    name: 'More item vidi',
    done: false,
  },
];

export default function Home() {
  const [items, setItems] = useState<ItemProps[]>(initialItems);
  const nextItemIdRef = useRef(initialItems.length + 1);

  async function handleAddItem(name: string) {
    const id = nextItemIdRef.current++;

    setItems((prevItems) => [
      ...prevItems,
      {
        id,
        name,
        done: false,
      },
    ]);

    return true;
  }

  async function handleRemoveItem(id: number) {
    setItems((prevItems) => prevItems.filter((item) => item.id !== id));
    return true;
  }

  async function handleUpdateItemDone(id: number, done: boolean) {
    setItems((prevItems) => prevItems.map((item) => ({ ...item, done: id === item.id ? done : item.done })));
    return true;
  }

  return (
    <main className="min-h-screen bg-slate-50 text-lg">
      <div className="pt-10 flex justify-center">
        <div
          className={classNames(
            'px-4 py-8 mx-2',
            'border border-gray-600  rounded-sm bg-slate-100 shadow-2xl shadow-black/5'
          )}
        >
          <h1 className="font-semibold text-2xl text-center">TODO List</h1>
          <TodoList
            items={items}
            onAddItem={handleAddItem}
            onRemoveItem={handleRemoveItem}
            onUpdateItemDone={handleUpdateItemDone}
          />
        </div>
      </div>
    </main>
  );
}
