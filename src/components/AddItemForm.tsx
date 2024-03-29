'use client';

import classNames from 'classnames';
import { FormEvent, useState } from 'react';

export default function AddItemForm({ onNewItem }: { onNewItem: (name: string) => Promise<boolean> }) {
  const [newItemName, setNewItemName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (newItemName) {
      try {
        setIsSubmitting(true);
        if (await onNewItem(newItemName)) {
          setNewItemName('');
        }
      } finally {
        setIsSubmitting(false);
      }
    }
  }

  return (
    <form className="flex gap-4 mt-6" onSubmit={handleSubmit}>
      <input
        className={classNames('w-full', 'border border-gray-400 rounded p-3', 'shadow-sm shadow-black/10')}
        name="name"
        disabled={isSubmitting}
        value={newItemName}
        onChange={(e) => setNewItemName(e.target.value)}
      />
      <button
        disabled={isSubmitting}
        className={classNames(
          'py-1 px-4 font-bold uppercase',
          'bg-green-500 text-white rounded',
          'shadow-sm shadow-black/10',
          'hover:shadow-green-500',
          'active:translate-y-[1px]',
          'disabled:brightness-75 disabled:hover:cursor-default disabled:hover:shadow-none disabled:active:translate-y-0'
        )}
      >
        Add
      </button>
    </form>
  );
}
