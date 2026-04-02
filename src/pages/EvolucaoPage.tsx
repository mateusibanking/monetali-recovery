import { useState } from 'react';
import { TrendingUp, Calendar } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { dailyEvolutionData, formatCurrency } from '@/data/mockData';

const months = [
  { value: '2026-03', label: 'Março 2026' },
  { value: '2026-02', label: 'Fevereiro 2026' },
  { value: '2026-01', label: 'Janeiro 2026' },
];

const EvolucaoPage = () => {
  const [selectedMonth, setSelectedMonth] = useState('2026-03');
  const filtered = dailyEvolutionData.filter(d => d.dia.startsWith(selectedMonth));

  const tooltipStyle = {
    contentStyle: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, color: '#333' },
    labelStyle: { color: '#6b7280' },
  };

  const inputClass = "bg-secondary/50 border border-border/50 rounded-lg text-sm px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-accent" />
          </div>
          <h2 className="text-xl font-bold font-display">Evolução Diária</h2>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className={inputClass}>
            {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
      </div>

      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 font-display">Contatos Feitos por Dia</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={filtered}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="diaLabel" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip {...tooltipStyle} />
            <Line type="monotone" dataKey="contatos" stroke="#316AB4" strokeWidth={2} dot={{ fill: '#316AB4', r: 3 }} name="Contatos" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 font-display">Renegociações Efetivas por Dia</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={filtered}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="diaLabel" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip {...tooltipStyle} />
            <Line type="monotone" dataKey="renegociacoes" stroke="#D4A843" strokeWidth={2} dot={{ fill: '#D4A843', r: 3 }} name="Renegociações" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 font-display">Valor Acumulado de Recuperação</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={filtered}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="diaLabel" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1_000_000).toFixed(1)}M`} />
            <Tooltip {...tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
            <Line type="monotone" dataKey="acumulado" stroke="#0D2C60" strokeWidth={2.5} dot={false} name="Acumulado" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default EvolucaoPage;
