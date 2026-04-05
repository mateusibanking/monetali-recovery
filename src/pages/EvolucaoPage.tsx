import { useState, useMemo } from 'react';
import { TrendingUp, Calendar, AlertCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { formatCurrency } from '@/data/mockData';
import { useAtividades } from '@/hooks/useAtividades';
import { useRecuperacoes } from '@/hooks/useRecuperacoes';
import LoadingSkeleton from '@/components/LoadingSkeleton';

const EvolucaoPage = () => {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const { events: allActivities, loading: loadingAct } = useAtividades();
  const { data: recuperacoes, loading: loadingRec } = useRecuperacoes();

  // Build daily data from real activities and recuperacoes
  const dailyData = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const data = [];

    let acumulado = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${selectedMonth}-${String(day).padStart(2, '0')}`;
      const dayLabel = `${day}/${month}`;

      // Count activities for this day
      const dayActivities = allActivities.filter(a => a.date.startsWith(dateStr));
      const contatos = dayActivities.length;

      // Count renegociacoes (type = meeting or legal)
      const renegociacoes = dayActivities.filter(a => a.type === 'meeting' || a.type === 'legal').length;

      // Sum recuperacoes for this day
      const dayRecuperacao = recuperacoes
        .filter(r => r.dataRecebimento === dateStr)
        .reduce((s, r) => s + r.valor, 0);

      acumulado += dayRecuperacao;

      data.push({ dia: dateStr, diaLabel: dayLabel, contatos, renegociacoes, recuperacao: dayRecuperacao, acumulado });
    }

    return data;
  }, [selectedMonth, allActivities, recuperacoes]);

  // Generate month options (current and past 5 months)
  const months = useMemo(() => {
    const result = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      result.push({ value, label: `${monthNames[d.getMonth()]} ${d.getFullYear()}` });
    }
    return result;
  }, []);

  const loading = loadingAct || loadingRec;

  const tooltipStyle = {
    contentStyle: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, color: '#333' },
    labelStyle: { color: '#6b7280' },
  };

  const inputClass = "bg-secondary/50 border border-border/50 rounded-lg text-sm px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50";

  if (loading) return <LoadingSkeleton />;

  const hasAnyData = dailyData.some(d => d.contatos > 0 || d.recuperacao > 0);

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

      {!hasAnyData && (
        <div className="glass-card p-12 flex flex-col items-center justify-center text-center">
          <AlertCircle className="h-7 w-7 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Sem dados para este mês</h3>
          <p className="text-sm text-muted-foreground">Registre atividades e recuperações para ver a evolução diária.</p>
        </div>
      )}

      {hasAnyData && (
        <>
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 font-display">Contatos Feitos por Dia</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="diaLabel" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip {...tooltipStyle} />
                <Line type="monotone" dataKey="contatos" stroke="#316AB4" strokeWidth={2} dot={{ fill: '#316AB4', r: 3 }} name="Contatos" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 font-display">Valor Acumulado de Recuperação</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="diaLabel" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => v > 0 ? `R$${(v / 1000).toFixed(0)}k` : '0'} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
                <Line type="monotone" dataKey="acumulado" stroke="#0D2C60" strokeWidth={2.5} dot={false} name="Acumulado" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
};

export default EvolucaoPage;
