import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════

interface DbCliente {
  id: string;
  nome: string;
  status: string;
  valor_total_atraso: number;
  dias_atraso_max: number;
  regional: string | null;
}

interface DbPagamento {
  id: string;
  cliente_id: string;
  vitbank: number | null;
  monetali: number | null;
  valor_pago_vitbank: number | null;
  valor_pago_monetali: number | null;
  valor_compensacao: number | null;
  vcto_vitbank: string | null;
  vcto_monetali: string | null;
  pgto_vitbank: string | null;
  pgto_monetali: string | null;
  data_vencimento: string | null;
  status: string;
  valor: number;
  created_at: string;
  cliente_nome?: string;
  cliente_status?: string;
}

interface DayPoint {
  dia: string;
  diaISO: string;
  recebidoVB: number;
  recebidoMon: number;
  vencido: number;
  novos: number;
  qtdRecebido: number;
  qtdVencido: number;
  qtdNovos: number;
}

interface DrillRow {
  nome: string;
  tipo: "Recebido" | "Vencido" | "Novo";
  vitbank: number;
  monetali: number;
  total: number;
  status: string;
}

interface DrillState {
  label: string;
  diaISO: string;
  rows: DrillRow[];
  totalVB: number;
  totalMon: number;
  totalComp: number;
}

interface MonthRow {
  mes: string;
  mesLabel: string;
  recebidoVB: number;
  recebidoMon: number;
  totalRecebido: number;
  vencido: number;
  novosCadastros: number;
}

// ═══════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════

const MONTHS_PT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const MONTHS_FULL = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

const STATUS_LABELS: Record<string, string> = {
  nao_iniciado: "NÃO INICIADO",
  em_andamento: "EM ANDAMENTO",
  pendente: "PENDENTE",
  contatado: "CONTATADO",
  em_negociacao: "EM NEGOCIAÇÃO",
  acordo_fechado: "ACORDO FECHADO",
  pago: "PAGO",
  juridico: "JURÍDICO",
  parcelado: "PARCELADO",
  distrato: "DISTRATO",
};

// ═══════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════

function fmt(v: number): string {
  if (v >= 1e9) return "R$ " + (v / 1e9).toFixed(1) + "B";
  if (v >= 1e6) return "R$ " + (v / 1e6).toFixed(2) + "M";
  if (v >= 1e3) return "R$ " + (v / 1e3).toFixed(0) + "k";
  return "R$ " + Math.round(v);
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function fmtDayLabel(isoDate: string): string {
  const [, m, d] = isoDate.split("-");
  return `${d}/${m}`;
}

function dateRange(start: Date, end: Date): string[] {
  const result: string[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    result.push(toDateStr(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

function n(v: number | null | undefined): number {
  return Number(v) || 0;
}

// ═══════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════

export default function DashboardFinanceiro() {
  const now = new Date();
  const hoje = toDateStr(now);
  const [mode, setMode] = useState<"dias" | "mes">("dias");
  const [days, setDays] = useState(7);
  const [metric, setMetric] = useState<"valor" | "qtd">("valor");
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());

  const [showRecVB, setShowRecVB] = useState(true);
  const [showRecMon, setShowRecMon] = useState(true);
  const [showVencido, setShowVencido] = useState(true);
  const [showNovos, setShowNovos] = useState(true);

  const [clientes, setClientes] = useState<DbCliente[]>([]);
  const [pagamentos, setPagamentos] = useState<DbPagamento[]>([]);
  const [loading, setLoading] = useState(true);

  const [drill, setDrill] = useState<DrillState | null>(null);
  const [drillSearch, setDrillSearch] = useState("");
  const [ctxText, setCtxText] = useState("Últimos 7 dias");

  // ─── Fetch ────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true);
      const [cliRes, pagRes] = await Promise.all([
        supabase
          .from("clientes")
          .select("id, nome, status, valor_total_atraso, dias_atraso_max, regional")
          .is("deleted_at", null)
          .order("valor_total_atraso", { ascending: false }),
        supabase
          .from("pagamentos_atraso")
          .select("id, cliente_id, vitbank, monetali, valor_pago_vitbank, valor_pago_monetali, valor_compensacao, vcto_vitbank, vcto_monetali, pgto_vitbank, pgto_monetali, data_vencimento, status, valor, created_at")
          .is("deleted_at", null),
      ]);

      if (cliRes.error) console.error("Fetch clientes error:", cliRes.error);
      if (pagRes.error) console.error("Fetch pagamentos error:", pagRes.error);

      const dbCli = (cliRes.data || []) as DbCliente[];
      const dbPag = (pagRes.data || []) as DbPagamento[];

      // Enrich pagamentos with client name/status
      const cliMap = new Map(dbCli.map((c) => [c.id, c]));
      for (const p of dbPag) {
        const cli = cliMap.get(p.cliente_id);
        p.cliente_nome = cli?.nome || "—";
        p.cliente_status = cli?.status || "nao_iniciado";
      }

      setClientes(dbCli);
      setPagamentos(dbPag);
      setLoading(false);
    }
    load();
  }, []);

  // ─── Period ───────────────────────────────────────────────────
  const periodDays = useMemo(() => {
    if (mode === "dias") {
      const end = new Date(now);
      const start = new Date(now);
      start.setDate(start.getDate() - (days - 1));
      return dateRange(start, end);
    } else {
      const start = new Date(selectedYear, selectedMonth, 1);
      const today = new Date();
      const isCurr = selectedYear === today.getFullYear() && selectedMonth === today.getMonth();
      const lastDay = isCurr ? today.getDate() : new Date(selectedYear, selectedMonth + 1, 0).getDate();
      return dateRange(start, new Date(selectedYear, selectedMonth, lastDay));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, days, selectedYear, selectedMonth]);

  // ─── KPIs ─────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    let totalRecebido = 0;
    let totalPendente = 0;
    let totalVencido = 0;
    let novosMes = 0;
    const mesAtual = toDateStr(now).slice(0, 7); // YYYY-MM

    for (const p of pagamentos) {
      const pagoVB = p.pgto_vitbank != null;
      const pagoMon = p.pgto_monetali != null;

      // Recebido
      if (pagoVB || pagoMon) {
        totalRecebido += (pagoVB ? (n(p.valor_pago_vitbank) || n(p.vitbank)) : 0)
                       + (pagoMon ? (n(p.valor_pago_monetali) || n(p.monetali)) : 0);
      }

      // Pendente vs Vencido
      if (p.status === "em_aberto") {
        const venc = p.data_vencimento?.slice(0, 10) || "";
        const val = n(p.vitbank) + n(p.monetali);
        if (venc >= hoje) {
          totalPendente += val;
        } else {
          totalVencido += val;
        }
      }

      // Novos cadastros no mês selecionado (por data de vencimento, não created_at)
      const dataEntrada = p.data_vencimento || p.vcto_vitbank || p.vcto_monetali;
      if (dataEntrada?.slice(0, 7) === mesAtual) {
        novosMes++;
      }
    }

    return { totalRecebido, totalPendente, totalVencido, novosMes };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagamentos]);

  // ─── Daily series ─────────────────────────────────────────────
  const seriesData = useMemo(() => {
    // Index by date
    const recVBByDay: Record<string, { valor: number; count: number }> = {};
    const recMonByDay: Record<string, { valor: number; count: number }> = {};
    const vencByDay: Record<string, { valor: number; count: number }> = {};
    const novosByDay: Record<string, { valor: number; count: number }> = {};

    for (const p of pagamentos) {
      // Recebido VB: pgto_vitbank date
      if (p.pgto_vitbank) {
        const d = p.pgto_vitbank.slice(0, 10);
        if (!recVBByDay[d]) recVBByDay[d] = { valor: 0, count: 0 };
        recVBByDay[d].valor += n(p.valor_pago_vitbank) || n(p.vitbank);
        recVBByDay[d].count += 1;
      }
      // Recebido Mon: pgto_monetali date
      if (p.pgto_monetali) {
        const d = p.pgto_monetali.slice(0, 10);
        if (!recMonByDay[d]) recMonByDay[d] = { valor: 0, count: 0 };
        recMonByDay[d].valor += n(p.valor_pago_monetali) || n(p.monetali);
        recMonByDay[d].count += 1;
      }
      // Vencido VB: vcto_vitbank sem pgto
      if (p.vcto_vitbank && !p.pgto_vitbank && p.status === "em_aberto") {
        const d = p.vcto_vitbank.slice(0, 10);
        if (!vencByDay[d]) vencByDay[d] = { valor: 0, count: 0 };
        vencByDay[d].valor += n(p.vitbank);
        vencByDay[d].count += 1;
      }
      // Vencido Mon: vcto_monetali sem pgto
      if (p.vcto_monetali && !p.pgto_monetali && p.status === "em_aberto") {
        const d = p.vcto_monetali.slice(0, 10);
        if (!vencByDay[d]) vencByDay[d] = { valor: 0, count: 0 };
        vencByDay[d].valor += n(p.monetali);
        vencByDay[d].count += 1;
      }
      // Novos: por data de vencimento (não created_at)
      const dataEntrada = p.data_vencimento || p.vcto_vitbank || p.vcto_monetali;
      if (dataEntrada) {
        const d = dataEntrada.slice(0, 10);
        if (!novosByDay[d]) novosByDay[d] = { valor: 0, count: 0 };
        novosByDay[d].valor += n(p.valor_compensacao) || n(p.valor);
        novosByDay[d].count += 1;
      }
    }

    return periodDays.map((iso): DayPoint => {
      const rvb = recVBByDay[iso] || { valor: 0, count: 0 };
      const rmon = recMonByDay[iso] || { valor: 0, count: 0 };
      const venc = vencByDay[iso] || { valor: 0, count: 0 };
      const novo = novosByDay[iso] || { valor: 0, count: 0 };
      return {
        dia: fmtDayLabel(iso),
        diaISO: iso,
        recebidoVB: Math.round(rvb.valor),
        recebidoMon: Math.round(rmon.valor),
        vencido: Math.round(venc.valor),
        novos: Math.round(novo.valor),
        qtdRecebido: rvb.count + rmon.count,
        qtdVencido: venc.count,
        qtdNovos: novo.count,
      };
    });
  }, [pagamentos, periodDays]);

  // ─── Composição bar (baseada em RECEBIDOS) ────────────────────
  const recebidoTotalVB = useMemo(() =>
    pagamentos
      .filter((p) => p.pgto_vitbank != null)
      .reduce((a, p) => a + (n(p.valor_pago_vitbank) || n(p.vitbank)), 0),
    [pagamentos]
  );
  const recebidoTotalMon = useMemo(() =>
    pagamentos
      .filter((p) => p.pgto_monetali != null)
      .reduce((a, p) => a + (n(p.valor_pago_monetali) || n(p.monetali)), 0),
    [pagamentos]
  );
  const recebidoTotal = recebidoTotalVB + recebidoTotalMon;
  const pctRecVB = recebidoTotal > 0 ? Math.round((recebidoTotalVB / recebidoTotal) * 100) : 50;

  // ─── Distribuição por tipo de movimentação ────────────────────
  const distrib = useMemo(() => {
    const pendente = pagamentos
      .filter((p) => p.status === "em_aberto" && (p.data_vencimento?.slice(0, 10) || "") >= hoje)
      .reduce((a, p) => a + n(p.vitbank) + n(p.monetali), 0);
    const vencido = pagamentos
      .filter((p) => p.status === "em_aberto" && (p.data_vencimento?.slice(0, 10) || "") < hoje)
      .reduce((a, p) => a + n(p.vitbank) + n(p.monetali), 0);
    const total = recebidoTotalVB + recebidoTotalMon + pendente + vencido;
    const pct = (v: number) => total > 0 ? ((v / total) * 100).toFixed(1) : "0";
    return [
      { label: "Recebido VITBANK", valor: recebidoTotalVB, cor: "#378ADD", pct: pct(recebidoTotalVB) },
      { label: "Recebido MONETALI", valor: recebidoTotalMon, cor: "#1D9E75", pct: pct(recebidoTotalMon) },
      { label: "Pendente (a vencer)", valor: pendente, cor: "#F59E0B", pct: pct(pendente) },
      { label: "Vencido (não pago)", valor: vencido, cor: "#EF4444", pct: pct(vencido) },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagamentos, recebidoTotalVB, recebidoTotalMon]);

  // ─── Aging ────────────────────────────────────────────────────
  const totalComp = clientes.reduce((a, c) => a + (Number(c.valor_total_atraso) || 0), 0);
  const agingBands = useMemo(() => {
    const bands = [
      { l: "1–30 dias", t: (d: number) => d >= 1 && d <= 30, c: "y" as const },
      { l: "31–90 dias", t: (d: number) => d > 30 && d <= 90, c: "y" as const },
      { l: "91–180 dias", t: (d: number) => d > 90 && d <= 180, c: "r" as const },
      { l: "181–365 dias", t: (d: number) => d > 180 && d <= 365, c: "r" as const },
      { l: "+ 1 ano", t: (d: number) => d > 365, c: "r" as const },
    ];
    return bands.map((f) => {
      const g = clientes.filter((c) => f.t(Number(c.dias_atraso_max) || 0));
      const v = g.reduce((a, c) => a + (Number(c.valor_total_atraso) || 0), 0);
      const pct = totalComp > 0 ? ((v / totalComp) * 100).toFixed(0) : "0";
      return { ...f, count: g.length, valor: v, pct };
    });
  }, [clientes, totalComp]);

  // ─── Monthly summary table ────────────────────────────────────
  const monthlyTable = useMemo(() => {
    const meses: Record<string, MonthRow> = {};

    for (const p of pagamentos) {
      // Recebido VB
      if (p.pgto_vitbank) {
        const m = p.pgto_vitbank.slice(0, 7);
        if (!meses[m]) meses[m] = { mes: m, mesLabel: "", recebidoVB: 0, recebidoMon: 0, totalRecebido: 0, vencido: 0, novosCadastros: 0 };
        meses[m].recebidoVB += n(p.valor_pago_vitbank) || n(p.vitbank);
      }
      // Recebido Mon
      if (p.pgto_monetali) {
        const m = p.pgto_monetali.slice(0, 7);
        if (!meses[m]) meses[m] = { mes: m, mesLabel: "", recebidoVB: 0, recebidoMon: 0, totalRecebido: 0, vencido: 0, novosCadastros: 0 };
        meses[m].recebidoMon += n(p.valor_pago_monetali) || n(p.monetali);
      }
      // Vencido
      if (p.status === "em_aberto" && p.data_vencimento) {
        const venc = p.data_vencimento.slice(0, 10);
        if (venc < hoje) {
          const m = p.data_vencimento.slice(0, 7);
          if (!meses[m]) meses[m] = { mes: m, mesLabel: "", recebidoVB: 0, recebidoMon: 0, totalRecebido: 0, vencido: 0, novosCadastros: 0 };
          meses[m].vencido += n(p.vitbank) + n(p.monetali);
        }
      }
      // Novos (por data de vencimento, não created_at)
      const dataEntradaM = p.data_vencimento || p.vcto_vitbank || p.vcto_monetali;
      if (dataEntradaM) {
        const m = dataEntradaM.slice(0, 7);
        if (!meses[m]) meses[m] = { mes: m, mesLabel: "", recebidoVB: 0, recebidoMon: 0, totalRecebido: 0, vencido: 0, novosCadastros: 0 };
        meses[m].novosCadastros += 1;
      }
    }

    const rows = Object.values(meses)
      .map((r) => {
        const [y, m] = r.mes.split("-");
        r.mesLabel = `${MONTHS_PT[parseInt(m, 10) - 1]} ${y}`;
        r.totalRecebido = r.recebidoVB + r.recebidoMon;
        return r;
      })
      .sort((a, b) => a.mes.localeCompare(b.mes));

    return rows;
  }, [pagamentos, hoje]);

  const monthlyTotals = useMemo(() => {
    return monthlyTable.reduce(
      (acc, r) => ({
        recebidoVB: acc.recebidoVB + r.recebidoVB,
        recebidoMon: acc.recebidoMon + r.recebidoMon,
        totalRecebido: acc.totalRecebido + r.totalRecebido,
        vencido: acc.vencido + r.vencido,
        novosCadastros: acc.novosCadastros + r.novosCadastros,
      }),
      { recebidoVB: 0, recebidoMon: 0, totalRecebido: 0, vencido: 0, novosCadastros: 0 }
    );
  }, [monthlyTable]);

  // ─── Drill-down ───────────────────────────────────────────────
  const openDrill = useCallback((diaISO: string, label: string) => {
    const rows: DrillRow[] = [];
    let totalVB = 0, totalMon = 0, totalComp = 0;

    for (const p of pagamentos) {
      // Recebido naquele dia
      const recVB = p.pgto_vitbank?.slice(0, 10) === diaISO;
      const recMon = p.pgto_monetali?.slice(0, 10) === diaISO;
      if (recVB || recMon) {
        const vb = recVB ? (n(p.valor_pago_vitbank) || n(p.vitbank)) : 0;
        const mon = recMon ? (n(p.valor_pago_monetali) || n(p.monetali)) : 0;
        totalVB += vb; totalMon += mon; totalComp += vb + mon;
        rows.push({
          nome: p.cliente_nome || "—",
          tipo: "Recebido",
          vitbank: vb,
          monetali: mon,
          total: vb + mon,
          status: p.cliente_status || "nao_iniciado",
        });
      }

      // Vencido naquele dia (sem pgto)
      const vencVB = p.vcto_vitbank?.slice(0, 10) === diaISO && !p.pgto_vitbank && p.status === "em_aberto";
      const vencMon = p.vcto_monetali?.slice(0, 10) === diaISO && !p.pgto_monetali && p.status === "em_aberto";
      if (vencVB || vencMon) {
        const vb = vencVB ? n(p.vitbank) : 0;
        const mon = vencMon ? n(p.monetali) : 0;
        totalVB += vb; totalMon += mon; totalComp += vb + mon;
        rows.push({
          nome: p.cliente_nome || "—",
          tipo: "Vencido",
          vitbank: vb,
          monetali: mon,
          total: vb + mon,
          status: p.cliente_status || "nao_iniciado",
        });
      }

      // Novo cadastro naquele dia (por data de vencimento)
      const dataEntradaDrill = p.data_vencimento || p.vcto_vitbank || p.vcto_monetali;
      if (dataEntradaDrill?.slice(0, 10) === diaISO) {
        const vb = n(p.vitbank);
        const mon = n(p.monetali);
        // Don't double-count if already added as Recebido or Vencido
        if (!recVB && !recMon && !vencVB && !vencMon) {
          totalVB += vb; totalMon += mon; totalComp += vb + mon;
        }
        rows.push({
          nome: p.cliente_nome || "—",
          tipo: "Novo",
          vitbank: vb,
          monetali: mon,
          total: vb + mon,
          status: p.cliente_status || "nao_iniciado",
        });
      }
    }

    rows.sort((a, b) => b.total - a.total);
    setDrill({ label, diaISO, rows, totalVB, totalMon, totalComp });
    setDrillSearch("");
  }, [pagamentos]);

  function closeDrill() { setDrill(null); setDrillSearch(""); }

  function toggleSerie(w: string) {
    if (w === "rvb") setShowRecVB((v) => !v);
    else if (w === "rmon") setShowRecMon((v) => !v);
    else if (w === "venc") setShowVencido((v) => !v);
    else if (w === "novo") setShowNovos((v) => !v);
  }

  // ─── Chart handlers ───────────────────────────────────────────
  const handleChartClick = useCallback((data: any) => {
    if (data?.activePayload?.length > 0) {
      const point = data.activePayload[0].payload as DayPoint;
      openDrill(point.diaISO, point.dia);
    }
  }, [openDrill]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const isQtd = metric === "qtd";
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-2.5 text-xs">
        <div className="font-medium text-gray-700 mb-1">{label}</div>
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: entry.color }}></span>
            <span className="text-gray-500">{entry.name}:</span>
            <span className="font-medium" style={{ color: entry.color }}>
              {isQtd ? entry.value + " pag" : fmt(entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const filteredDrill = drill
    ? drill.rows.filter((r) => r.nome.toLowerCase().includes(drillSearch.toLowerCase()))
    : [];

  const years: number[] = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 3; y--) years.push(y);

  // ═══════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════

  if (loading)
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Carregando dados...
      </div>
    );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* ─── Filtros de período ─── */}
      <div className="mb-5">
        <div className="flex border border-gray-200 rounded-lg overflow-hidden w-fit mb-3">
          {(["dias", "mes"] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); closeDrill(); }}
              className={`text-xs px-4 py-2 border-r border-gray-200 last:border-r-0 transition-colors ${
                mode === m ? "bg-blue-50 text-blue-600 font-medium" : "bg-white text-gray-500 hover:bg-gray-50"
              }`}
            >
              {m === "dias" ? "Por dias" : "Por mês"}
            </button>
          ))}
        </div>
        {mode === "dias" && (
          <div className="flex gap-2 flex-wrap">
            {[7, 14, 30, 60, 90].map((d) => (
              <button
                key={d}
                onClick={() => { setDays(d); setCtxText(`Últimos ${d} dias`); closeDrill(); }}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  days === d ? "bg-blue-50 text-blue-600 border-transparent" : "border-gray-200 text-gray-500 hover:bg-gray-50"
                }`}
              >
                {d} dias
              </button>
            ))}
          </div>
        )}
        {mode === "mes" && (
          <div className="flex gap-2 flex-wrap items-center">
            <select
              value={selectedYear}
              onChange={(e) => { setSelectedYear(Number(e.target.value)); closeDrill(); }}
              className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-700"
            >
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            {Array.from({ length: 12 }, (_, m) => {
              const isFut = selectedYear === now.getFullYear() && m > now.getMonth();
              const isCurr = selectedYear === now.getFullYear() && m === now.getMonth();
              if (isFut) return null;
              return (
                <button
                  key={m}
                  onClick={() => {
                    setSelectedMonth(m);
                    setCtxText(MONTHS_FULL[m] + " " + selectedYear + (isCurr ? " (parcial)" : ""));
                    closeDrill();
                  }}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                    isCurr ? "border-dashed" : ""
                  } ${
                    selectedMonth === m ? "bg-blue-50 text-blue-600 border-transparent" : "border-gray-200 text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {MONTHS_PT[m]}{isCurr ? " *" : ""}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Badge de contexto */}
      <div className="inline-flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 rounded-full px-3 py-1 mb-4">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block"></span>
        {ctxText}
      </div>

      {/* ─── KPIs ─── */}
      <div className="grid grid-cols-4 gap-2.5 mb-5">
        {[
          { label: "Total Recebido", value: fmt(kpis.totalRecebido), sub: "pgto efetivado", subClass: "text-green-600" },
          { label: "Total Pendente", value: fmt(kpis.totalPendente), sub: "a vencer", subClass: "text-amber-500" },
          { label: "Total Vencido", value: fmt(kpis.totalVencido), sub: "não pago", subClass: "text-red-500" },
          { label: "Novos Cadastros", value: String(kpis.novosMes), sub: "este mês", subClass: "text-blue-500" },
        ].map((k) => (
          <div key={k.label} className="bg-gray-50 rounded-lg p-3.5">
            <div className="text-xs text-gray-500 mb-1">{k.label}</div>
            <div className="text-lg font-medium text-gray-900">{k.value}</div>
            <div className={`text-xs mt-0.5 ${k.subClass}`}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ─── Gráfico ─── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-3">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-800">Evolução diária</span>
            <div className="flex border border-gray-200 rounded-lg overflow-hidden">
              {(["valor", "qtd"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMetric(m)}
                  className={`text-xs px-3 py-1.5 border-r border-gray-200 last:border-r-0 transition-colors ${
                    metric === m ? "bg-gray-100 text-gray-800 font-medium" : "bg-white text-gray-500"
                  }`}
                >
                  {m === "valor" ? "Valor R$" : "Quantidade"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {[
              { key: "rvb", label: "VITBANK recebido", on: showRecVB, color: "#378ADD" },
              { key: "rmon", label: "MONETALI recebido", on: showRecMon, color: "#1D9E75" },
              { key: "venc", label: "Vencido", on: showVencido, color: "#EF4444" },
              { key: "novo", label: "Novos cadastros", on: showNovos, color: "#BA7517" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => toggleSerie(t.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 text-xs transition-opacity ${
                  t.on ? "opacity-100" : "opacity-30"
                }`}
                style={{ borderColor: t.color, color: t.color }}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: t.color }}></span>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        {!drill && (
          <p className="text-xs text-gray-400 mb-3">
            Clique em qualquer ponto para ver <span className="text-blue-500">detalhes dos pagamentos</span> naquele dia
          </p>
        )}
        <div style={{ width: "100%", height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={seriesData} onClick={handleChartClick} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
              <XAxis dataKey="dia" tick={{ fontSize: 10, fill: "#888" }} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11, fill: "#888" }} tickLine={false} axisLine={false} tickFormatter={(v: number) => metric === "qtd" ? `${v}` : fmt(v)} />
              <RechartsTooltip content={<CustomTooltip />} />
              {showRecVB && (
                <Line type="monotone" dataKey={metric === "qtd" ? "qtdRecebido" : "recebidoVB"} name="VITBANK recebido" stroke="#378ADD" strokeWidth={2} dot={{ r: seriesData.length > 25 ? 2 : 4, fill: "#378ADD" }} activeDot={{ r: 6 }} />
              )}
              {showRecMon && (
                <Line type="monotone" dataKey={metric === "qtd" ? "qtdRecebido" : "recebidoMon"} name="MONETALI recebido" stroke="#1D9E75" strokeWidth={2} dot={{ r: seriesData.length > 25 ? 2 : 4, fill: "#1D9E75" }} activeDot={{ r: 6 }} />
              )}
              {showVencido && (
                <Line type="monotone" dataKey={metric === "qtd" ? "qtdVencido" : "vencido"} name="Vencido" stroke="#EF4444" strokeWidth={2} strokeDasharray="5 3" dot={{ r: seriesData.length > 25 ? 2 : 3, fill: "#EF4444" }} activeDot={{ r: 5 }} />
              )}
              {showNovos && (
                <Line type="monotone" dataKey={metric === "qtd" ? "qtdNovos" : "novos"} name="Novos cadastros" stroke="#BA7517" strokeWidth={1.5} strokeDasharray="3 4" dot={{ r: seriesData.length > 25 ? 2 : 3, fill: "#BA7517" }} activeDot={{ r: 5 }} />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Barra de composição (RECEBIDOS) */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="text-xs font-medium text-gray-700 mb-1.5">Composição recebido — VITBANK × MONETALI</div>
          <div className="flex h-1.5 rounded-full overflow-hidden mb-1.5">
            <div style={{ width: pctRecVB + "%", background: "#378ADD" }}></div>
            <div style={{ width: (100 - pctRecVB) + "%", background: "#1D9E75" }}></div>
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span><span className="inline-block w-2 h-2 rounded-sm bg-blue-400 mr-1"></span>VITBANK: {fmt(recebidoTotalVB)} ({pctRecVB}%)</span>
            <span><span className="inline-block w-2 h-2 rounded-sm bg-green-500 mr-1"></span>MONETALI: {fmt(recebidoTotalMon)} ({100 - pctRecVB}%)</span>
          </div>
        </div>
      </div>

      {/* ─── Drill-down ─── */}
      {drill && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-3">
          <div className="flex items-start justify-between mb-3 gap-2">
            <div>
              <div className="text-sm font-medium text-gray-800">Pagamentos — {drill.label}</div>
              <div className="flex gap-4 mt-1 text-xs">
                <span className="text-blue-600 font-medium">VITBANK: {fmt(drill.totalVB)}</span>
                <span className="text-green-600 font-medium">MONETALI: {fmt(drill.totalMon)}</span>
                <span className="text-amber-600 font-medium">Total: {fmt(drill.totalComp)}</span>
              </div>
            </div>
            <button onClick={closeDrill} className="text-xs text-gray-500 border border-gray-200 rounded-lg px-2 py-1 hover:bg-gray-50">Fechar</button>
          </div>
          <input
            value={drillSearch}
            onChange={(e) => setDrillSearch(e.target.value)}
            placeholder="Buscar cliente..."
            className="w-full text-xs px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-700 mb-3"
          />
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ tableLayout: "fixed" }}>
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-gray-500 font-medium py-2 px-2" style={{ width: "30%" }}>Cliente</th>
                  <th className="text-center text-gray-500 font-medium py-2 px-2" style={{ width: "14%" }}>Tipo</th>
                  <th className="text-right text-gray-500 font-medium py-2 px-2" style={{ width: "14%" }}>VITBANK</th>
                  <th className="text-right text-gray-500 font-medium py-2 px-2" style={{ width: "14%" }}>MONETALI</th>
                  <th className="text-right text-gray-500 font-medium py-2 px-2" style={{ width: "14%" }}>Total</th>
                  <th className="text-center text-gray-500 font-medium py-2 px-2" style={{ width: "14%" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredDrill.map((r, i) => {
                  const tipoBadge = r.tipo === "Recebido"
                    ? "bg-green-100 text-green-800"
                    : r.tipo === "Vencido"
                    ? "bg-red-100 text-red-800"
                    : "bg-blue-100 text-blue-800";
                  const tipoIcon = r.tipo === "Recebido" ? "✅" : r.tipo === "Vencido" ? "❌" : "🆕";
                  return (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 px-2 text-gray-800 truncate" title={r.nome}>{r.nome}</td>
                      <td className="py-2 px-2 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tipoBadge}`}>
                          {tipoIcon} {r.tipo}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right text-blue-600">{fmt(r.vitbank)}</td>
                      <td className="py-2 px-2 text-right text-green-600">{fmt(r.monetali)}</td>
                      <td className="py-2 px-2 text-right font-medium">{fmt(r.total)}</td>
                      <td className="py-2 px-2 text-center text-gray-500">
                        {STATUS_LABELS[r.status] || r.status}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between mt-2.5 text-xs text-gray-400">
            <span>{filteredDrill.length} pagamentos</span>
            <span>Total: <span className="font-medium text-gray-700">{fmt(filteredDrill.reduce((a, r) => a + r.total, 0))}</span></span>
          </div>
        </div>
      )}

      {/* ─── Painéis inferiores ─── */}
      <div className="grid grid-cols-2 gap-2.5 mb-3">
        {/* Distribuição por tipo de movimentação */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="text-sm font-medium text-gray-800 mb-3">Distribuição por tipo de movimentação</div>
          {distrib.map((d) => {
            const distribTotal = distrib.reduce((a, x) => a + x.valor, 0);
            const pctBar = distribTotal > 0 ? ((d.valor / distribTotal) * 100) : 0;
            return (
              <div key={d.label} className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-500 flex-shrink-0" style={{ width: 130 }}>{d.label}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div style={{ width: pctBar + "%", background: d.cor, height: "100%", borderRadius: 9999 }}></div>
                </div>
                <span className="text-xs font-medium text-gray-700 text-right" style={{ minWidth: 60 }}>{fmt(d.valor)}</span>
                <span className="text-xs text-gray-400" style={{ minWidth: 40 }}>{d.pct}%</span>
              </div>
            );
          })}
        </div>

        {/* Aging da carteira */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="text-sm font-medium text-gray-800 mb-3">Aging da carteira</div>
          {agingBands.map((f) => (
            <div key={f.l} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-b-0 text-xs">
              <span className="text-gray-500">{f.l} ({f.count})</span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-800">{fmt(f.valor)}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${f.c === "r" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}>{f.pct}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Tabela resumo mensal ─── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="text-sm font-medium text-gray-800 mb-3">Resumo mensal</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-gray-500 font-medium py-2 px-2">Mês</th>
                <th className="text-right text-gray-500 font-medium py-2 px-2">Recebido VB</th>
                <th className="text-right text-gray-500 font-medium py-2 px-2">Recebido Mon</th>
                <th className="text-right text-gray-500 font-medium py-2 px-2">Total Receb.</th>
                <th className="text-right text-gray-500 font-medium py-2 px-2">Vencido</th>
                <th className="text-right text-gray-500 font-medium py-2 px-2">Novos Cad.</th>
              </tr>
            </thead>
            <tbody>
              {monthlyTable.map((r) => (
                <tr key={r.mes} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 px-2 text-gray-800 font-medium">{r.mesLabel}</td>
                  <td className="py-2 px-2 text-right text-blue-600">{fmt(r.recebidoVB)}</td>
                  <td className="py-2 px-2 text-right text-green-600">{fmt(r.recebidoMon)}</td>
                  <td className="py-2 px-2 text-right font-medium">{fmt(r.totalRecebido)}</td>
                  <td className="py-2 px-2 text-right text-red-500">{fmt(r.vencido)}</td>
                  <td className="py-2 px-2 text-right text-gray-700">{r.novosCadastros}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50 font-medium">
                <td className="py-2 px-2 text-gray-800">TOTAL</td>
                <td className="py-2 px-2 text-right text-blue-700">{fmt(monthlyTotals.recebidoVB)}</td>
                <td className="py-2 px-2 text-right text-green-700">{fmt(monthlyTotals.recebidoMon)}</td>
                <td className="py-2 px-2 text-right text-gray-900">{fmt(monthlyTotals.totalRecebido)}</td>
                <td className="py-2 px-2 text-right text-red-600">{fmt(monthlyTotals.vencido)}</td>
                <td className="py-2 px-2 text-right text-gray-800">{monthlyTotals.novosCadastros}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
