import React, { useEffect, useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { RefreshCw, ChevronDown, ChevronRight, AlertTriangle, CheckCircle2, XCircle, Loader2, History } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSyncPlanilha, type SyncLogRow } from '@/hooks/useSyncPlanilha';
import EmptyState from '@/components/EmptyState';

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} às ${hh}:${mi}`;
}

function renderErro(e: unknown): string {
  if (e == null) return '';
  if (typeof e === 'string') return e;
  if (typeof e === 'number' || typeof e === 'boolean') return String(e);
  if (typeof e === 'object') {
    const obj = e as Record<string, unknown>;
    const msg = obj.erro ?? obj.error ?? obj.message ?? obj.msg;
    if (typeof msg === 'string') {
      const extras: string[] = [];
      if (obj.chunk != null) extras.push(`chunk ${String(obj.chunk)}`);
      if (obj.linha != null) extras.push(`linha ${typeof obj.linha === 'object' ? JSON.stringify(obj.linha) : String(obj.linha)}`);
      return extras.length ? `${msg} (${extras.join(', ')})` : msg;
    }
    try { return JSON.stringify(e); } catch { return String(e); }
  }
  return String(e);
}

function formatDuration(start: string | null, end: string | null): string {
  if (!start || !end) return '—';
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (isNaN(s) || isNaN(e)) return '—';
  const ms = Math.max(0, e - s);
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const r = sec % 60;
  return `${m}m ${r}s`;
}

type StatusKind = 'sucesso' | 'parcial' | 'erro' | 'em_andamento' | 'desconhecido';

function classifyStatus(row: Pick<SyncLogRow, 'status' | 'finalizado_em' | 'erros'>): StatusKind {
  const s = (row.status || '').toLowerCase();
  if (!row.finalizado_em || s === 'em_andamento' || s === 'running' || s === 'iniciado') return 'em_andamento';
  if (s.includes('erro') || s === 'error' || s === 'failed') return 'erro';
  if (s.includes('parcial') || (typeof row.erros === 'number' && row.erros > 0 && s.includes('sucesso'))) return 'parcial';
  if (s === 'sucesso' || s === 'success' || s === 'ok' || s === 'completo' || s === 'completed') {
    return typeof row.erros === 'number' && row.erros > 0 ? 'parcial' : 'sucesso';
  }
  if (typeof row.erros === 'number' && row.erros > 0) return 'parcial';
  return 'desconhecido';
}

function StatusBadge({ kind }: { kind: StatusKind }) {
  const map: Record<StatusKind, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
    sucesso: { label: 'Sucesso', cls: 'bg-green-100 text-green-800 border-green-200', Icon: CheckCircle2 },
    parcial: { label: 'Parcial', cls: 'bg-yellow-100 text-yellow-800 border-yellow-200', Icon: AlertTriangle },
    erro: { label: 'Erro', cls: 'bg-red-100 text-red-800 border-red-200', Icon: XCircle },
    em_andamento: { label: 'Em andamento', cls: 'bg-blue-100 text-blue-800 border-blue-200', Icon: Loader2 },
    desconhecido: { label: '—', cls: 'bg-muted text-muted-foreground border-border', Icon: History },
  };
  const { label, cls, Icon } = map[kind];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      <Icon className={`h-3.5 w-3.5 ${kind === 'em_andamento' ? 'animate-spin' : ''}`} />
      {label}
    </span>
  );
}

const SincronizacaoPage = () => {
  const { profile, loading: authLoading } = useAuth();
  const { sincronizando, sincronizar, buscarHistorico } = useSyncPlanilha();

  const [ultimo, setUltimo] = useState<SyncLogRow | null>(null);
  const [historico, setHistorico] = useState<SyncLogRow[]>([]);
  const [carregandoUltimo, setCarregandoUltimo] = useState(true);
  const [carregandoHistorico, setCarregandoHistorico] = useState(true);
  const [expandido, setExpandido] = useState<Record<string, boolean>>({});

  const recarregar = useCallback(async () => {
    setCarregandoUltimo(true);
    setCarregandoHistorico(true);
    const [u, h] = await Promise.all([buscarHistorico(1), buscarHistorico(20)]);
    setUltimo(u[0] ?? null);
    setHistorico(h);
    setCarregandoUltimo(false);
    setCarregandoHistorico(false);
  }, [buscarHistorico]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  const handleSync = async () => {
    await sincronizar();
    await recarregar();
  };

  if (authLoading) return null;
  if (!profile || profile.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const ultimoStatus = ultimo ? classifyStatus(ultimo) : null;

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <header>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Sincronização da Planilha</h1>
        <p className="text-sm text-muted-foreground mt-1">Dados da planilha CONTAS A RECEBER - 2025</p>
      </header>

      {/* Card Última Sincronização */}
      <section className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-foreground mb-3">Última Sincronização</h2>

            {carregandoUltimo ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : !ultimo ? (
              <p className="text-sm text-muted-foreground">Nenhuma sincronização realizada ainda</p>
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-medium text-foreground">
                    {formatDateTime(ultimo.finalizado_em || ultimo.iniciado_em)}
                  </span>
                  {ultimoStatus && <StatusBadge kind={ultimoStatus} />}
                </div>
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{ultimo.atualizados ?? 0}</span> pagamentos atualizados
                  {' · '}
                  <span className="font-semibold text-foreground">{ultimo.erros ?? 0}</span> erros
                </p>
              </div>
            )}
          </div>

          <div className="shrink-0">
            <button
              onClick={handleSync}
              disabled={sincronizando}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed w-full md:w-auto justify-center"
            >
              {sincronizando ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Sincronizar Agora
                </>
              )}
            </button>
          </div>
        </div>

        {sincronizando && (
          <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-900 text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <p>Sincronização em andamento. Pode levar 1-2 minutos. Não feche a página.</p>
          </div>
        )}
      </section>

      {/* Tabela Histórico */}
      <section className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Histórico de Sincronizações</h2>
          <button
            onClick={recarregar}
            disabled={carregandoHistorico}
            className="inline-flex items-center gap-1.5 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-60"
            aria-label="Atualizar histórico"
            title="Atualizar"
          >
            <RefreshCw className={`h-4 w-4 ${carregandoHistorico ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {carregandoHistorico ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Carregando histórico...</div>
        ) : historico.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={History}
              title="Nenhuma sincronização ainda"
              description="O histórico de sincronizações aparecerá aqui."
            />
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3 font-semibold">Data/Hora</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Lidos</th>
                    <th className="px-4 py-3 font-semibold text-right">Processados</th>
                    <th className="px-4 py-3 font-semibold text-right">Erros</th>
                    <th className="px-4 py-3 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {historico.map((row, idx) => {
                    const open = !!expandido[row.id];
                    const processados = (row.inseridos ?? 0) + (row.atualizados ?? 0);
                    const detalhes = row.detalhes as Record<string, unknown> | null;
                    const errosLista = Array.isArray((detalhes as any)?.erros)
                      ? ((detalhes as any).erros as unknown[]).slice(0, 10)
                      : [];
                    return (
                      <React.Fragment key={row.id}>
                        <tr
                          className={`border-t border-border ${idx % 2 === 1 ? 'bg-muted/20' : ''}`}
                        >
                          <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(row.iniciado_em)}</td>
                          <td className="px-4 py-3"><StatusBadge kind={classifyStatus(row)} /></td>
                          <td className="px-4 py-3 text-right tabular-nums">{row.lidos ?? 0}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{processados}</td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            <span className={row.erros && row.erros > 0 ? 'text-red-600 font-semibold' : ''}>
                              {row.erros ?? 0}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => setExpandido(p => ({ ...p, [row.id]: !p[row.id] }))}
                              className="p-1 rounded hover:bg-muted text-muted-foreground"
                              aria-label={open ? 'Recolher' : 'Expandir'}
                            >
                              {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </button>
                          </td>
                        </tr>
                        {open && (
                          <tr className={`border-t border-border ${idx % 2 === 1 ? 'bg-muted/20' : ''}`}>
                            <td colSpan={6} className="px-4 py-4">
                              <div className="space-y-3 text-sm">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                  <div>
                                    <p className="text-muted-foreground uppercase tracking-wider">Duração</p>
                                    <p className="font-semibold">{formatDuration(row.iniciado_em, row.finalizado_em)}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground uppercase tracking-wider">Inseridos</p>
                                    <p className="font-semibold">{row.inseridos ?? 0}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground uppercase tracking-wider">Atualizados</p>
                                    <p className="font-semibold">{row.atualizados ?? 0}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground uppercase tracking-wider">Ignorados</p>
                                    <p className="font-semibold">{row.ignorados ?? 0}</p>
                                  </div>
                                </div>
                                {row.mensagem && (
                                  <p className="text-sm text-muted-foreground italic">{row.mensagem}</p>
                                )}
                                {errosLista.length > 0 && (
                                  <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-red-700 mb-1">
                                      Primeiros erros ({errosLista.length})
                                    </p>
                                    <ul className="text-xs space-y-1 list-disc list-inside text-red-800">
                                      {errosLista.map((e, i) => (
                                        <li key={i} className="break-words">
                                          {renderErro(e)}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {detalhes && (
                                  <details className="text-xs">
                                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                      Ver detalhes JSON
                                    </summary>
                                    <pre className="mt-2 p-3 bg-muted/40 rounded-lg overflow-x-auto text-[11px] leading-relaxed">
                                      {JSON.stringify(detalhes, null, 2)}
                                    </pre>
                                  </details>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-border">
              {historico.map((row, idx) => {
                const open = !!expandido[row.id];
                const processados = (row.inseridos ?? 0) + (row.atualizados ?? 0);
                return (
                  <div key={row.id} className={`p-4 ${idx % 2 === 1 ? 'bg-muted/20' : ''}`}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{formatDateTime(row.iniciado_em)}</p>
                        <div className="mt-1"><StatusBadge kind={classifyStatus(row)} /></div>
                      </div>
                      <button
                        onClick={() => setExpandido(p => ({ ...p, [row.id]: !p[row.id] }))}
                        className="p-1 rounded hover:bg-muted text-muted-foreground shrink-0"
                      >
                        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div><p className="text-muted-foreground">Lidos</p><p className="font-semibold">{row.lidos ?? 0}</p></div>
                      <div><p className="text-muted-foreground">Processados</p><p className="font-semibold">{processados}</p></div>
                      <div><p className="text-muted-foreground">Erros</p><p className={`font-semibold ${row.erros && row.erros > 0 ? 'text-red-600' : ''}`}>{row.erros ?? 0}</p></div>
                    </div>
                    {open && (
                      <div className="mt-3 pt-3 border-t border-border space-y-2 text-xs">
                        <p><span className="text-muted-foreground">Duração: </span>{formatDuration(row.iniciado_em, row.finalizado_em)}</p>
                        {row.mensagem && <p className="italic text-muted-foreground">{row.mensagem}</p>}
                        {row.detalhes != null && (
                          <details>
                            <summary className="cursor-pointer text-muted-foreground">Ver detalhes JSON</summary>
                            <pre className="mt-2 p-2 bg-muted/40 rounded overflow-x-auto text-[10px]">
                              {JSON.stringify(row.detalhes, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default SincronizacaoPage;
