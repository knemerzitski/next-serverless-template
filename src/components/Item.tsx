import classNames from 'classnames';

interface ItemProps {
  name: string;
  done?: boolean;
  removable?: boolean;
  onUpdateDone?: (done: boolean) => void;
  onRemove?: () => void;
}

export default function Item({ name, done = false, onUpdateDone, onRemove }: ItemProps) {
  return (
    <li
      className={classNames(
        'px-4 py-2',
        'flex justify-between',
        'bg-white border',
        'border-gray-500 rounded-sm shadow-sm shadow-black/10',
        onUpdateDone ? 'hover:cursor-pointer' : '',
        done ? 'brightness-95' : ''
      )}
      onClick={onUpdateDone ? () => onUpdateDone(!done) : undefined}
    >
      <span className={classNames(done ? 'line-through' : '')}>{name}</span>
      {onRemove && (
        <button
          className="text-red-500 font-bold"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          ✕
        </button>
      )}
    </li>
  );
}
