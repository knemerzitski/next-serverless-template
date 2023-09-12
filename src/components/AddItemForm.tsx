import classNames from 'classnames';
import { FormEvent, useState } from 'react';

export default function AddItemForm({ onNewItem }: { onNewItem: (name: string) => Promise<boolean> }) {
  const [newItemName, setNewItemName] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (newItemName) {
      if (await onNewItem(newItemName)) {
        setNewItemName('');
      }
    }
  }

  return (
    <form className="flex gap-4 mt-6" onSubmit={handleSubmit}>
      <input
        className={classNames('w-full', 'border border-gray-400 rounded p-3', 'shadow-sm shadow-black/10')}
        name="name"
        value={newItemName}
        onChange={(e) => setNewItemName(e.target.value)}
      />
      <button
        className={classNames(
          'py-1 px-4 font-bold uppercase',
          'bg-green-500 text-white rounded',
          'shadow-sm shadow-black/10',
          'hover:shadow-green-500',
          'active:translate-y-[1px]'
        )}
      >
        Add
      </button>
    </form>
  );
}
