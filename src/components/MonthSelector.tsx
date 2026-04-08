import { Calendar } from 'lucide-react';

interface MonthSelectorProps {
  selected: string;
  onChange: (month: string) => void;
  showTodos?: boolean;
}

const MONTHS = [
  { label: 'Janeiro 2026', value: '2026-01' },
  { label: 'Fevereiro 2026', value: '2026-02' },
  { label: 'Março 2026', value: '2026-03' },
  { label: 'Abril 2026', value: '2026-04' },
  { label: 'Maio 2026', value: '2026-05' },
  { label: 'Junho 2026', value: '2026-06' },
  { label: 'Julho 2026', value: '2026-07' },
  { label: 'Agosto 2026', value: '2026-08' },
  { label: 'Setembro 2026', value: '2026-09' },
  { label: 'Outubro 2026', value: '2026-10' },
  { label: 'Novembro 2026', value: '2026-11' },
  { label: 'Dezembro 2026', value: '2026-12' },
];

/** Default month for the system: March 2026 (start of operations) */
export const DEFAULT_MONTH = '2026-03';

const MonthSelector = ({ selected, onChange, showTodos = false }: MonthSelectorProps) => (
  <div className="flex items-center gap-2">
    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
    <select
      value={selected}
      onChange={e => onChange(e.target.value)}
      className="bg-secondary/50 border border-border/50 rounded-lg text-sm px-3 py-2 text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer min-w-[200px]"
    >
      {showTodos && <option value="todos">Todos</option>}
      {MONTHS.map(m => (
        <option key={m.value} value={m.value}>{m.label}</option>
      ))}
    </select>
  </div>
);

export default MonthSelector;
