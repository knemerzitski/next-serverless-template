import Item from '@/components/Item';

export interface ItemProps {
  id: string;
  name: string;
  done: boolean;
}

interface ItemListProps {
  items: ItemProps[];
  onRemoveItem?: (id: string) => Promise<boolean>;
  onUpdateItemDone?: (id: string, done: boolean) => Promise<boolean>;
}

export default function ItemsList({ items, onRemoveItem, onUpdateItemDone }: ItemListProps) {
  return (
    <ul className="mt-8 flex flex-col gap-3">
      {items.map((item) => (
        <Item
          key={item.id}
          {...item}
          onUpdateDone={onUpdateItemDone ? (done) => onUpdateItemDone(item.id, done) : undefined}
          onRemove={onRemoveItem ? () => onRemoveItem(item.id) : undefined}
        />
      ))}
    </ul>
  );
}
