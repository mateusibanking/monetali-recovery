interface MonthSelectorProps {
  selected: string;
  onChange: (month: string) => void;
  showTodos?: boolean;
}

const MONTHS = [
  { label: 'Jan', value: '2026-01' },
  { label: 'Fev', value: '2026-02' },
  { label: 'Mar', value: '2026-03' },
  { label: 'Abr', value: '2026-04' },
  { label: 'Mai', value: '2026-05' },
  { label: 'Jun', value: '2026-06' },
  { label: 'Jul', value: '2026-07' },
  { label: 'Ago', value: '2026-08' },
  { label: 'Set', value: '2026-09' },
  { label: 'Out', value: '2026-10' },
  { label: 'Nov', value: '2026-11' },
  { label: 'Dez', value: '2026-12' },
];

const chipBase = 'px-4 py-1.5 rounded-full text-sm font-medium transition-colors';
const chipActive = 'bg-accent text-accent-foreground shadow-sm';
const chipInactive = 'bg-transparent border border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/50';

const MonthSelector = ({ selected, onChange, showTodos = false }: MonthSelectorProps) => (
  <div className="flex flex-wrap gap-2">
    {showTodos && (
      <button
        onClick={() => onChange('todos')}
        className={`${chipBase} ${selected === 'todos' ? chipActive : chipInactive}`}
      >
        Todos
      </button>
    )}
    {MONTHS.map(m => {
      const active = m.value === selected;
      return (
        <button
          key={m.value}
          onClick={() => onChange(m.value)}
          className={`${chipBase} ${active ? chipActive : chipInactive}`}
        >
          {m.label}
        </button>
      );
    })}
  </div>
);

export default MonthSelector;
