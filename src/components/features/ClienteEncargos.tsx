import { AlertCircle, TrendingUp, TrendingDown, Loader2, RotateCw } from 'lucide-react';
import { useClienteEncargos, type EncargosEmpresa } from '@/hooks/useClienteEncargos';
import { formatCurrency } from '@/data/mockData';

interface ClienteEncargosProps {
  clienteId: string;
}

interface EmpresaCardProps {
  nome: 'Vitbank' | 'Monetali';
  dados: EncargosEmpresa;
  cor: 'blue' | 'amber';
}

function EmpresaCard({ nome, dados, cor }: EmpresaCardProps) {
  const colorMap = {
    blue: {
      text: 'text-[#185FA5]',
      badge: 'bg-blue-100 text-[#185FA5]',
      border: 'border-l-[#185FA5]',
      soft: 'bg-blue-50/40',
    },
    amber: {
      text: 'text-[#BA7517]',
      badge: 'bg-amber-100 text-[#BA7517]',
      border: 'border-l-[#BA7517]',
      soft: 'bg-amber-50/40',
    },
  };
  const c = colorMap[cor];

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
      <div className={`border-l-4 ${c.border} ${c.soft} px-5 py-3 flex items-center justify-between`}>
        <h3 className={`text-sm font-bold uppercase tracking-wider ${c.text}`}>{nome}</h3>
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${c.badge}`}>
          {dados.percentual.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% do total
        </span>
      </div>

      <div className="px-5 py-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Principal em aberto</span>
          <span className="text-sm font-mono font-semibold tabular-nums">
            {formatCurrency(dados.principal)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Encargos (multa + juros)</span>
          <span className="text-sm font-mono text-negotiation tabular-nums">
            {formatCurrency(dados.totalEncargos)}
          </span>
        </div>

        <div className="border-t border-border pt-2.5 mt-2">
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold uppercase tracking-wider ${c.text}`}>
              Total com encargos
            </span>
            <span className={`text-lg font-mono font-bold tabular-nums ${c.text}`}>
              {formatCurrency(dados.totalComEncargos)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SkeletonLoader() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-lg border border-border bg-card p-4 animate-pulse">
            <div className="h-2.5 w-24 bg-muted rounded mb-3" />
            <div className="h-6 w-32 bg-muted rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map(i => (
          <div key={i} className="rounded-lg border border-border bg-card h-40 animate-pulse" />
        ))}
      </div>
      <div className="flex items-center justify-center py-4 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span className="text-xs">Carregando encargos…</span>
      </div>
    </div>
  );
}

export default function ClienteEncargos({ clienteId }: ClienteEncargosProps) {
  const encargos = useClienteEncargos(clienteId);

  if (encargos.loading) return <SkeletonLoader />;

  if (encargos.error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-start gap-3">
        <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
        <div className="flex-1 text-sm text-red-700">
          <p className="font-semibold">Não foi possível carregar os encargos</p>
          <p className="text-xs mt-1">{encargos.error}</p>
        </div>
        <button
          onClick={() => encargos.refetch()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-red-200 text-xs font-semibold text-red-700 hover:bg-red-100"
        >
          <RotateCw className="h-3 w-3" />
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Linha 1 — Resumo macro */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-card p-4 border-l-4 border-l-slate-400">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Compensação total
          </p>
          <p className="text-lg font-mono font-bold tabular-nums">
            {formatCurrency(encargos.compensacaoTotal)}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 border-l-4 border-l-red-500">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Total inadimplente
          </p>
          <p className="text-lg font-mono font-bold text-red-700 tabular-nums">
            {formatCurrency(encargos.inadimplente)}
          </p>
          <div className="flex items-center gap-1 mt-1 text-[11px] text-red-600">
            <TrendingDown className="h-3 w-3" />
            <span>Principal em aberto</span>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 border-l-4 border-l-green-500">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Recuperado
          </p>
          <p className="text-lg font-mono font-bold text-green-700 tabular-nums">
            {formatCurrency(encargos.recuperado)}
          </p>
          <div className="flex items-center gap-1 mt-1 text-[11px] text-green-600">
            <TrendingUp className="h-3 w-3" />
            <span>
              {encargos.percentualRecuperado.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% de recuperação
            </span>
          </div>
        </div>
      </div>

      {/* Linha 2 — Cards por empresa */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <EmpresaCard nome="Vitbank" dados={encargos.vitbank} cor="blue" />
        <EmpresaCard nome="Monetali" dados={encargos.monetali} cor="amber" />
      </div>

      {/* Linha 3 — Barra de totais */}
      <div className="rounded-lg border border-border bg-gradient-to-r from-slate-50 to-white p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Total geral com encargos
          </p>
          <p className="text-2xl font-mono font-bold text-slate-900 tabular-nums">
            {formatCurrency(encargos.totalGeral)}
          </p>
        </div>

        {encargos.qtdEmAberto > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 border border-red-200 text-xs font-semibold text-red-700 self-start sm:self-auto">
            <AlertCircle className="h-3 w-3" />
            {encargos.qtdEmAberto} em aberto — {formatCurrency(encargos.inadimplente)}
          </span>
        )}
      </div>
    </div>
  );
}
