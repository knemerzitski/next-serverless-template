import AddItemForm from '@/components/AddItemForm';
import Item from '@/components/Item';

export interface ItemProps {
  id: number;
  name: string;
  done: boolean;
}

interface TodoListProps {
  items: ItemProps[];
  onAddItem: (name: string) => Promise<boolean>;
  onRemoveItem: (id: number) => Promise<boolean>;
  onUpdateItemDone: (id: number, done: boolean) => Promise<boolean>;
}

export default function TodoList({ items, onAddItem, onRemoveItem, onUpdateItemDone }: TodoListProps) {
  return (
    <>
      <ul className="mt-8 flex flex-col gap-3">
        {items.map((item) => (
          <Item
            key={item.id}
            {...item}
            onUpdateDone={(done) => onUpdateItemDone(item.id, done)}
            onRemove={() => onRemoveItem(item.id)}
          />
        ))}
      </ul>
      <AddItemForm onNewItem={onAddItem} />
    </>
  );
}
