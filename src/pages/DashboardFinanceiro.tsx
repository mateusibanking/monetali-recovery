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

// ---- Types ----

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
  vcto_vitbank: string | null;
  vcto_monetali: string | null;
  pgto_vitbank: string | null;
  pgto_monetali: string | null;
  status: string;
  valor: number;
  deleted_at: string | null;
}

interface ClienteAgg {
  id: string;
  nome: string;
  status: string;
  statusLabel: string;
  valorTotalAtraso: number;
  diasAtrasoMax: number;
  totalVitbank: number;
  totalMonetali: number;
}

interface DayPoint {
  dia: string;            // DD/MM
  diaISO: string;         // YYYY-MM-DD
  vitbank: number;
  monetali: number;
  compensacao: number;
  qtdVitbank: number;
  qtdMonetali: number;
}

interface DrillCliente {
  nome: string;
  status: string;
  statusLabel: string;
  vitbank: number;
  monetali: number;
  compensacao: number;
}

interface DrillState {
  label: string;
  diaISO: string;
  clientes: DrillCliente[];
  totalVB: number;
  totalMon: number;
  totalComp: number;
}

// ---- Constants ----

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

const STATUS_CORES: Record<string, { cor: string; badge: string }> = {
  nao_iniciado:   { cor: "#6B7280", badge: "bg-gray-100 text-gray-600" },
  em_andamento:   { cor: "#378ADD", badge: "bg-blue-100 text-blue-800" },
  pendente:       { cor: "#F59E0B", badge: "bg-amber-100 text-amber-800" },
  contatado:      { cor: "#8B5CF6", badge: "bg-purple-100 text-purple-800" },
  em_negociacao:  { cor: "#3B82F6", badge: "bg-blue-100 text-blue-700" },
  acordo_fechado: { cor: "#10B981", badge: "bg-emerald-100 text-emerald-800" },
  pago:           { cor: "#1D9E75", badge: "bg-green-100 text-green-800" },
  juridico:       { cor: "#EF4444", badge: "bg-red-100 text-red-800" },
  parcelado:      { cor: "#1D9E75", badge: "bg-green-100 text-green-800" },
  distrato:       { cor: "#888780", badge: "bg-gray-100 text-gray-600" },
};

// ---- Helpers ----

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

// ---- Component ----

export default function DashboardFinanceiro() {
  const now = new Date();
  const [mode, setMode] = useState<"dias" | "mes">("dias");
  const [days, setDays] = useState(7);
  const [metric, setMetric] = useState<"valor" | "qtd">("valor");
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [showVB, setShowVB] = useState(true);
  const [showPM, setShowPM] = useState(true);
  const [showTOT, setShowTOT] = useState(true);

  const [clientes, setClientes] = useState<ClienteAgg[]>([]);
  const [pagamentos, setPagamentos] = useState<DbPagamento[]>([]);
  const [loading, setLoading] = useState(true);

  const [drill, setDrill] = useState<DrillState | null>(null);
  const [drillSearch, setDrillSearch] = useState("");
  const [ctxText, setCtxText] = useState("Últimos 7 dias");

  // ---------- Fetch data ----------
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
          .select("id, cliente_id, vitbank, monetali, vcto_vitbank, vcto_monetali, pgto_vitbank, pgto_monetali, status, valor, deleted_at")
          .is("deleted_at", null),
      ]);

      if (cliRes.error) console.error("Fetch clientes error:", cliRes.error);
      if (pagRes.error) console.error("Fetch pagamentos error:", pagRes.error);

      const dbClientes = (cliRes.data || []) as DbCliente[];
      const dbPagamentos = (pagRes.data || []) as DbPagamento[];

      // Aggregate VB/Monetali per cliente
      const pagMap: Record<string, { vb: number; mon: number }> = {};
      for (const p of dbPagamentos) {
        const cid = p.cliente_id;
        if (!pagMap[cid]) pagMap[cid] = { vb: 0, mon: 0 };
        pagMap[cid].vb += Number(p.vitbank) || 0;
        pagMap[cid].mon += Number(p.monetali) || 0;
      }

      const rows: ClienteAgg[] = dbClientes.map((c) => {
        const agg = pagMap[c.id] || { vb: 0, mon: 0 };
        return {
          id: c.id,
          nome: c.nome,
          status: c.status,
          statusLabel: STATUS_LABELS[c.status] || c.status.toUpperCase(),
          valorTotalAtraso: Number(c.valor_total_atraso) || 0,
          diasAtrasoMax: Number(c.dias_atraso_max) || 0,
          totalVitbank: agg.vb,
          totalMonetali: agg.mon,
        };
      });

      setClientes(rows);
      setPagamentos(dbPagamentos);
      setLoading(false);
    }
    load();
  }, []);

  // ---------- Build date range ----------
  const periodDays = useMemo(() => {
    if (mode === "dias") {
      const end = new Date(now);
      const start = new Date(now);
      start.setDate(start.getDate() - (days - 1));
      return dateRange(start, end);
    } else {
      const year = selectedYear;
      const month = selectedMonth;
      const start = new Date(year, month, 1);
      const today = new Date();
      const isCurr = year === today.getFullYear() && month === today.getMonth();
      const lastDay = isCurr ? today.getDate() : new Date(year, month + 1, 0).getDate();
      const end = new Date(year, month, lastDay);
      return dateRange(start, end);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, days, selectedYear, selectedMonth]);

  // ---------- Build daily series from real payment dates ----------
  const seriesData = useMemo(() => {
    // Index pagamentos by date
    const vbByDay: Record<string, { valor: number; count: number; clienteIds: Set<string> }> = {};
    const monByDay: Record<string, { valor: number; count: number; clienteIds: Set<string> }> = {};

    for (const p of pagamentos) {
      // VitBank: use vcto_vitbank as the date axis
      if (p.vcto_vitbank) {
        const d = p.vcto_vitbank.slice(0, 10);
        if (!vbByDay[d]) vbByDay[d] = { valor: 0, count: 0, clienteIds: new Set() };
        vbByDay[d].valor += Number(p.vitbank) || 0;
        vbByDay[d].count += 1;
        vbByDay[d].clienteIds.add(p.cliente_id);
      }
      // Monetali: use vcto_monetali as the date axis
      if (p.vcto_monetali) {
        const d = p.vcto_monetali.slice(0, 10);
        if (!monByDay[d]) monByDay[d] = { valor: 0, count: 0, clienteIds: new Set() };
        monByDay[d].valor += Number(p.monetali) || 0;
        monByDay[d].count += 1;
        monByDay[d].clienteIds.add(p.cliente_id);
      }
    }

    const points: DayPoint[] = periodDays.map((isoDate) => {
      const vb = vbByDay[isoDate] || { valor: 0, count: 0 };
      const mon = monByDay[isoDate] || { valor: 0, count: 0 };
      return {
        dia: fmtDayLabel(isoDate),
        diaISO: isoDate,
        vitbank: Math.round(vb.valor),
        monetali: Math.round(mon.valor),
        compensacao: Math.round(vb.valor + mon.valor),
        qtdVitbank: vb.count,
        qtdMonetali: mon.count,
      };
    });

    return points;
  }, [pagamentos, periodDays]);

  // ---------- Drill-down ----------
  const openDrill = useCallback((diaISO: string, label: string) => {
    // Find pagamentos for this day
    const dayPags = pagamentos.filter((p) => {
      const matchVB = p.vcto_vitbank?.slice(0, 10) === diaISO;
      const matchMon = p.vcto_monetali?.slice(0, 10) === diaISO;
      return matchVB || matchMon;
    });

    // Group by cliente
    const clienteMap = new Map<string, { vb: number; mon: number }>();
    for (const p of dayPags) {
      const cid = p.cliente_id;
      if (!clienteMap.has(cid)) clienteMap.set(cid, { vb: 0, mon: 0 });
      const agg = clienteMap.get(cid)!;
      if (p.vcto_vitbank?.slice(0, 10) === diaISO) agg.vb += Number(p.vitbank) || 0;
      if (p.vcto_monetali?.slice(0, 10) === diaISO) agg.mon += Number(p.monetali) || 0;
    }

    const clienteIndex = new Map(clientes.map((c) => [c.id, c]));

    const drillClientes: DrillCliente[] = [];
    let totalVB = 0, totalMon = 0, totalComp = 0;

    clienteMap.forEach((agg, cid) => {
      const cli = clienteIndex.get(cid);
      const vb = agg.vb;
      const mon = agg.mon;
      const comp = vb + mon;
      totalVB += vb;
      totalMon += mon;
      totalComp += comp;
      drillClientes.push({
        nome: cli?.nome || "—",
        status: cli?.status || "nao_iniciado",
        statusLabel: cli?.statusLabel || "—",
        vitbank: vb,
        monetali: mon,
        compensacao: comp,
      });
    });

    drillClientes.sort((a, b) => b.compensacao - a.compensacao);

    setDrill({ label, diaISO, clientes: drillClientes, totalVB, totalMon, totalComp });
    setDrillSearch("");
  }, [pagamentos, clientes]);

  function closeDrill() {
    setDrill(null);
    setDrillSearch("");
  }

  function toggleSerie(w: string) {
    if (w === "vb" && (showPM || showTOT || !showVB)) setShowVB((v) => !v);
    else if (w === "pm" && (showVB || showTOT || !showPM)) setShowPM((v) => !v);
    else if (w === "tot" && (showVB || showPM || !showTOT)) setShowTOT((v) => !v);
  }

  // ---------- KPIs ----------
  const totalComp = clientes.reduce((a, c) => a + c.valorTotalAtraso, 0);

  // VitBank/Monetali totais: soma de pagamentos em aberto
  const kpiVB = pagamentos
    .filter((p) => p.status === "em_aberto")
    .reduce((a, p) => a + (Number(p.vitbank) || 0), 0);
  const kpiMon = pagamentos
    .filter((p) => p.status === "em_aberto")
    .reduce((a, p) => a + (Number(p.monetali) || 0), 0);

  // Não pago / Distrato
  const naoRecup = clientes.filter((c) => ["pendente", "distrato"].includes(c.status));
  const totalNR = naoRecup.reduce((a, c) => a + c.valorTotalAtraso, 0);

  const pctVB = kpiVB + kpiMon > 0 ? Number(((kpiVB / (kpiVB + kpiMon)) * 100).toFixed(0)) : 50;

  const filteredDrill = drill
    ? drill.clientes.filter((c) =>
        c.nome?.toLowerCase().includes(drillSearch.toLowerCase())
      )
    : [];

  const years: number[] = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 3; y--) years.push(y);

  // ---------- Situação distribution ----------
  const situacaoDistrib = useMemo(() => {
    const grouped: Record<string, { count: number; valor: number }> = {};
    for (const c of clientes) {
      const st = c.status;
      if (!grouped[st]) grouped[st] = { count: 0, valor: 0 };
      grouped[st].count += 1;
      grouped[st].valor += c.valorTotalAtraso;
    }
    return Object.entries(grouped)
      .map(([status, data]) => ({
        status,
        label: STATUS_LABELS[status] || status.toUpperCase(),
        cor: STATUS_CORES[status]?.cor || "#6B7280",
        badge: STATUS_CORES[status]?.badge || "bg-gray-100 text-gray-600",
        count: data.count,
        valor: data.valor,
        pct: totalComp > 0 ? ((data.valor / totalComp) * 100) : 0,
      }))
      .sort((a, b) => b.valor - a.valor);
  }, [clientes, totalComp]);

  // ---------- Aging ----------
  const agingBands = useMemo(() => {
    const bands = [
      { l: "1–30 dias", t: (d: number) => d >= 1 && d <= 30, c: "y" as const },
      { l: "31–90 dias", t: (d: number) => d > 30 && d <= 90, c: "y" as const },
      { l: "91–180 dias", t: (d: number) => d > 90 && d <= 180, c: "r" as const },
      { l: "181–365 dias", t: (d: number) => d > 180 && d <= 365, c: "r" as const },
      { l: "+ 1 ano", t: (d: number) => d > 365, c: "r" as const },
    ];
    return bands.map((f) => {
      const g = clientes.filter((c) => f.t(c.diasAtrasoMax));
      const v = g.reduce((a, c) => a + c.valorTotalAtraso, 0);
      const pct = totalComp > 0 ? ((v / totalComp) * 100).toFixed(0) : "0";
      return { ...f, count: g.length, valor: v, pct };
    });
  }, [clientes, totalComp]);

  // ---------- Chart click handler ----------
  const handleChartClick = useCallback((data: any) => {
    if (data && data.activePayload && data.activePayload.length > 0) {
      const point = data.activePayload[0].payload as DayPoint;
      openDrill(point.diaISO, point.dia);
    }
  }, [openDrill]);

  // ---------- Custom tooltip ----------
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

  // ---------- Loading state ----------
  if (loading)
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Carregando dados...
      </div>
    );

  // ---------- Render ----------
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Filtros de período */}
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

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-2.5 mb-5">
        {[
          { label: "Compensação total", value: fmt(totalComp), sub: `${clientes.length} clientes`, subClass: "text-gray-400" },
          { label: "Boleto VitBank", value: fmt(kpiVB), sub: `${pctVB}% do total`, subClass: "text-blue-500" },
          { label: "Pix Monetali", value: fmt(kpiMon), sub: `${100 - pctVB}% do total`, subClass: "text-green-600" },
          { label: "Não pago / Distrato", value: fmt(totalNR), sub: `${naoRecup.length} clientes`, subClass: "text-red-500" },
        ].map((k) => (
          <div key={k.label} className="bg-gray-50 rounded-lg p-3.5">
            <div className="text-xs text-gray-500 mb-1">{k.label}</div>
            <div className="text-lg font-medium text-gray-900">{k.value}</div>
            <div className={`text-xs mt-0.5 ${k.subClass}`}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Gráfico */}
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
              { key: "vb", label: "Boleto VitBank", on: showVB, color: "#378ADD" },
              { key: "pm", label: "Pix Monetali", on: showPM, color: "#1D9E75" },
              { key: "tot", label: "Compensação total", on: showTOT, color: "#BA7517" },
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
            Clique em qualquer ponto para ver <span className="text-blue-500">quem são os clientes</span> naquele dia
          </p>
        )}
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={seriesData}
              onClick={handleChartClick}
              margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
              <XAxis
                dataKey="dia"
                tick={{ fontSize: 10, fill: "#888" }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#888" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => metric === "qtd" ? `${v}` : fmt(v)}
              />
              <RechartsTooltip content={<CustomTooltip />} />
              {showVB && (
                <Line
                  type="monotone"
                  dataKey={metric === "qtd" ? "qtdVitbank" : "vitbank"}
                  name="Boleto VitBank"
                  stroke="#378ADD"
                  strokeWidth={2}
                  dot={{ r: seriesData.length > 25 ? 2 : 4, fill: "#378ADD" }}
                  activeDot={{ r: 6 }}
                />
              )}
              {showPM && (
                <Line
                  type="monotone"
                  dataKey={metric === "qtd" ? "qtdMonetali" : "monetali"}
                  name="Pix Monetali"
                  stroke="#1D9E75"
                  strokeWidth={2}
                  strokeDasharray="5 3"
                  dot={{ r: seriesData.length > 25 ? 2 : 4, fill: "#1D9E75" }}
                  activeDot={{ r: 6 }}
                />
              )}
              {showTOT && (
                <Line
                  type="monotone"
                  dataKey={metric === "qtd" ? "qtdVitbank" : "compensacao"}
                  name="Compensação total"
                  stroke="#BA7517"
                  strokeWidth={1.5}
                  strokeDasharray="3 4"
                  dot={{ r: seriesData.length > 25 ? 2 : 3, fill: "#BA7517" }}
                  activeDot={{ r: 5 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Barra de composição */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="text-xs font-medium text-gray-700 mb-1.5">Composição — VitBank × Monetali</div>
          <div className="flex h-1.5 rounded-full overflow-hidden mb-1.5">
            <div style={{ width: pctVB + "%", background: "#378ADD" }}></div>
            <div style={{ width: (100 - pctVB) + "%", background: "#1D9E75" }}></div>
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span><span className="inline-block w-2 h-2 rounded-sm bg-blue-400 mr-1"></span>VitBank: {fmt(kpiVB)} ({pctVB}%)</span>
            <span><span className="inline-block w-2 h-2 rounded-sm bg-green-500 mr-1"></span>Monetali: {fmt(kpiMon)} ({100 - pctVB}%)</span>
          </div>
        </div>
      </div>

      {/* Drill-down */}
      {drill && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-3">
          <div className="flex items-start justify-between mb-3 gap-2">
            <div>
              <div className="text-sm font-medium text-gray-800">Clientes — {drill.label}</div>
              <div className="flex gap-4 mt-1 text-xs">
                <span className="text-blue-600 font-medium">VitBank: {fmt(drill.totalVB)}</span>
                <span className="text-green-600 font-medium">Monetali: {fmt(drill.totalMon)}</span>
                <span className="text-amber-600 font-medium">Compensação: {fmt(drill.totalComp)}</span>
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
                  <th className="text-left text-gray-500 font-medium py-2 px-2" style={{ width: "36%" }}>Cliente</th>
                  <th className="text-center text-gray-500 font-medium py-2 px-2" style={{ width: "16%" }}>Situação</th>
                  <th className="text-right text-gray-500 font-medium py-2 px-2" style={{ width: "16%" }}>VitBank</th>
                  <th className="text-right text-gray-500 font-medium py-2 px-2" style={{ width: "16%" }}>Monetali</th>
                  <th className="text-right text-gray-500 font-medium py-2 px-2" style={{ width: "16%" }}>Compensação</th>
                </tr>
              </thead>
              <tbody>
                {filteredDrill.map((c, i) => {
                  const sit = STATUS_CORES[c.status] || STATUS_CORES["nao_iniciado"];
                  return (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 px-2 text-gray-800 truncate" title={c.nome}>{c.nome}</td>
                      <td className="py-2 px-2 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sit.badge}`}>
                          {c.statusLabel}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right text-blue-600">{fmt(c.vitbank)}</td>
                      <td className="py-2 px-2 text-right text-green-600">{fmt(c.monetali)}</td>
                      <td className="py-2 px-2 text-right font-medium">{fmt(c.compensacao)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between mt-2.5 text-xs text-gray-400">
            <span>{filteredDrill.length} clientes</span>
            <span>Total: <span className="font-medium text-gray-700">{fmt(filteredDrill.reduce((a, c) => a + c.compensacao, 0))}</span></span>
          </div>
        </div>
      )}

      {/* Painéis inferiores */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Distribuição por situação */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="text-sm font-medium text-gray-800 mb-3">Distribuição por situação</div>
          {situacaoDistrib.map((s) => (
            <div key={s.status} className="flex items-center gap-2 mb-2">
              <span className="text-xs text-gray-500 flex-shrink-0" style={{ width: 120 }}>
                {s.label}
              </span>
              <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div style={{ width: s.pct + "%", background: s.cor, height: "100%", borderRadius: 9999 }}></div>
              </div>
              <span className="text-xs font-medium text-gray-700 text-right" style={{ minWidth: 60 }}>{fmt(s.valor)}</span>
              <span className="text-xs text-gray-400" style={{ minWidth: 40 }}>{s.pct.toFixed(1)}%</span>
            </div>
          ))}
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
    </div>
  );
}
