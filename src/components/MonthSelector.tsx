interface MonthSelectorProps {
  selected: string;
  onChange: (month: string) => void;
}

const MONTHS = [
  { label: 'Jan', value: '2026-01' },
  { label: 'Fev', value: '2026-02' },
  { label: 'Mar', value: '2026-03' },
  { label: 'Abr', value: '2026-04' },
  { label: 'Mai', value: '2026-05' },
  { label: 'Jun', value: '2026-06' },
  { label: 'Jul', value: '2026-07' },
];

const MonthSelector = ({ selected, onChange }: MonthSelectorProps) => (
  <div className="flex flex-wrap gap-2">
    {MONTHS.map(m => {
      const active = m.value === selected;
      return (
        <button
          key={m.value}
          onClick={() => onChange(m.value)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            active
              ? 'bg-accent text-accent-foreground'
              : 'bg-transparent border border-primary text-primary hover:bg-primary/5'
          }`}
        >
          {m.label}
        </button>
      );
    })}
  </div>
);

export default MonthSelector;
