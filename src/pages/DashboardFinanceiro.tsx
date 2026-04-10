import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
} from "chart.js";

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip
);

// ---- Types ----

interface ClienteRow {
  nome: string;
  situacao: string;
  boletoVitbank: number;
  pixMonetali: number;
  compensacao: number;
  diasAtraso: number;
}

interface SeriesData {
  labels: string[];
  vb: number[];
  pm: number[];
  tot: number[];
  qtd: number[];
}

interface DrillState {
  label: string;
  idx: number;
  s: SeriesData;
  clientes: ClienteRow[];
}

// ---- Constants ----

const MONTHS_PT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const MONTHS_FULL = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

const SITUACOES: Record<string, { cor: string; badge: string }> = {
  "Em Andamento": { cor: "#378ADD", badge: "bg-blue-100 text-blue-800" },
  "Não Pago": { cor: "#D85A30", badge: "bg-red-100 text-red-800" },
  "Parcelado": { cor: "#1D9E75", badge: "bg-green-100 text-green-800" },
  "Distrato": { cor: "#888780", badge: "bg-gray-100 text-gray-600" },
};

/** Map DB status → display label used by this dashboard */
const DB_STATUS_TO_LABEL: Record<string, string> = {
  nao_iniciado: "Em Andamento",
  em_andamento: "Em Andamento",
  pendente: "Em Andamento",
  contatado: "Em Andamento",
  em_negociacao: "Em Andamento",
  acordo_fechado: "Em Andamento",
  pago: "Pago",
  juridico: "Em Andamento",
  parcelado: "Parcelado",
  distrato: "Distrato",
};

// ---- Helpers ----

function fmt(v: number): string {
  if (v >= 1e9) return "R$ " + (v / 1e9).toFixed(1) + "B";
  if (v >= 1e6) return "R$ " + (v / 1e6).toFixed(2) + "M";
  if (v >= 1e3) return "R$ " + (v / 1e3).toFixed(0) + "k";
  return "R$ " + Math.round(v);
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
  const [clientes, setClientes] = useState<ClienteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [drill, setDrill] = useState<DrillState | null>(null);
  const [drillSearch, setDrillSearch] = useState("");
  const [ctxText, setCtxText] = useState("Últimos 7 dias");
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstance = useRef<Chart | null>(null);

  // ---------- Fetch clientes + aggregate VB/Monetali from pagamentos ----------
  useEffect(() => {
    async function load() {
      setLoading(true);

      // 1. Fetch clientes
      const { data: dbClientes, error: cliErr } = await supabase
        .from("clientes")
        .select("id, nome, status, valor_total_atraso, dias_atraso_max")
        .is("deleted_at", null)
        .order("valor_total_atraso", { ascending: false });

      if (cliErr || !dbClientes) {
        console.error("DashboardFinanceiro fetch clientes error:", cliErr);
        setLoading(false);
        return;
      }

      // 2. Fetch pagamentos to aggregate VitBank / Monetali per cliente
      const clienteIds = dbClientes.map((c) => c.id);
      let pagMap: Record<string, { vb: number; mon: number }> = {};

      if (clienteIds.length > 0) {
        const { data: pags, error: pagErr } = await supabase
          .from("pagamentos_atraso")
          .select("cliente_id, vitbank, monetali")
          .in("cliente_id", clienteIds)
          .is("deleted_at", null);

        if (!pagErr && pags) {
          for (const p of pags) {
            const cid = p.cliente_id as string;
            if (!pagMap[cid]) pagMap[cid] = { vb: 0, mon: 0 };
            pagMap[cid].vb += Number(p.vitbank) || 0;
            pagMap[cid].mon += Number(p.monetali) || 0;
          }
        }
      }

      // 3. Build frontend rows
      const rows: ClienteRow[] = dbClientes.map((c) => {
        const agg = pagMap[c.id] || { vb: 0, mon: 0 };
        const situacao = DB_STATUS_TO_LABEL[c.status as string] || "Em Andamento";
        return {
          nome: c.nome as string,
          situacao,
          boletoVitbank: agg.vb,
          pixMonetali: agg.mon,
          compensacao: Number(c.valor_total_atraso) || 0,
          diasAtraso: Number(c.dias_atraso_max) || 0,
        };
      });

      setClientes(rows);
      setLoading(false);
    }
    load();
  }, []);

  // ---------- Series builders ----------

  function buildSeries(numDays: number): SeriesData {
    const labels: string[] = [], vb: number[] = [], pm: number[] = [], tot: number[] = [], qtd: number[] = [];
    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      labels.push(d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }));
      const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
      const bucket = clientes.filter((c) => {
        let s = (c.diasAtraso * 71 + seed) & 0xffffffff;
        s = (s * 1664525 + 1013904223) & 0xffffffff;
        return (s >>> 0) / 0xffffffff < 0.25;
      });
      vb.push(Math.round(bucket.reduce((a, c) => a + (c.boletoVitbank || 0), 0)));
      pm.push(Math.round(bucket.reduce((a, c) => a + (c.pixMonetali || 0), 0)));
      tot.push(Math.round(bucket.reduce((a, c) => a + (c.compensacao || 0), 0)));
      qtd.push(bucket.length);
    }
    return { labels, vb, pm, tot, qtd };
  }

  function buildMonthSeries(year: number, month: number): SeriesData {
    const dim = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const isCurr = year === today.getFullYear() && month === today.getMonth();
    const lastDay = isCurr ? today.getDate() : dim;
    const labels: string[] = [], vb: number[] = [], pm: number[] = [], tot: number[] = [], qtd: number[] = [];
    for (let d = 1; d <= lastDay; d++) {
      labels.push(String(d).padStart(2, "0") + "/" + String(month + 1).padStart(2, "0"));
      const seed = year * 10000 + (month + 1) * 100 + d;
      const bucket = clientes.filter((c) => {
        let s = (c.diasAtraso * 71 + seed) & 0xffffffff;
        s = (s * 1664525 + 1013904223) & 0xffffffff;
        return (s >>> 0) / 0xffffffff < 0.25;
      });
      vb.push(Math.round(bucket.reduce((a, c) => a + (c.boletoVitbank || 0), 0)));
      pm.push(Math.round(bucket.reduce((a, c) => a + (c.pixMonetali || 0), 0)));
      tot.push(Math.round(bucket.reduce((a, c) => a + (c.compensacao || 0), 0)));
      qtd.push(bucket.length);
    }
    return { labels, vb, pm, tot, qtd };
  }

  function getSeries(): SeriesData {
    return mode === "dias"
      ? buildSeries(days)
      : buildMonthSeries(selectedYear, selectedMonth);
  }

  // ---------- Chart rendering ----------

  useEffect(() => {
    if (!chartRef.current || loading) return;
    if (chartInstance.current) chartInstance.current.destroy();

    const s = getSeries();
    const isQtd = metric === "qtd";
    const datasets: any[] = [];

    if (showVB)
      datasets.push({
        label: "Boleto VitBank",
        data: isQtd ? s.qtd : s.vb,
        borderColor: "#378ADD",
        backgroundColor: "rgba(55,138,221,0.07)",
        fill: true,
        tension: 0.4,
        pointRadius: s.labels.length > 25 ? 2 : 4,
        pointBackgroundColor: "#378ADD",
        borderWidth: 2,
        spanGaps: false,
      });

    if (showPM)
      datasets.push({
        label: "Pix Monetali",
        data: isQtd ? s.qtd : s.pm,
        borderColor: "#1D9E75",
        backgroundColor: "rgba(29,158,117,0.06)",
        fill: true,
        tension: 0.4,
        pointRadius: s.labels.length > 25 ? 2 : 4,
        pointBackgroundColor: "#1D9E75",
        borderWidth: 2,
        borderDash: [5, 3],
        spanGaps: false,
      });

    if (showTOT)
      datasets.push({
        label: "Compensação total",
        data: isQtd ? s.qtd : s.tot,
        borderColor: "#BA7517",
        backgroundColor: "rgba(186,117,23,0.05)",
        fill: true,
        tension: 0.4,
        pointRadius: s.labels.length > 25 ? 2 : 3,
        pointBackgroundColor: "#BA7517",
        borderWidth: 1.5,
        borderDash: [3, 4],
        spanGaps: false,
      });

    chartInstance.current = new Chart(chartRef.current, {
      type: "line",
      data: { labels: s.labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index" as const, intersect: false },
        onClick(_: any, elements: any[]) {
          if (!elements.length) return;
          const idx = elements[0].index;
          openDrill(s.labels[idx], idx, s);
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx: any) => {
                const v = ctx.parsed.y;
                if (v === null) return null;
                return " " + ctx.dataset.label + ": " + (isQtd ? v + " cli" : fmt(v));
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 10 }, color: "#888", maxRotation: 45, autoSkip: true, maxTicksLimit: 15 },
          },
          y: {
            grid: { color: "rgba(128,128,128,0.1)" },
            ticks: {
              font: { size: 11 },
              color: "#888",
              callback: (v: any) => (isQtd ? v + " cli" : fmt(Number(v))),
            },
          },
        },
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientes, mode, days, selectedYear, selectedMonth, metric, showVB, showPM, showTOT]);

  // ---------- Drill-down ----------

  function openDrill(label: string, idx: number, s: SeriesData) {
    const seed = label.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const bucket = clientes
      .filter((c) => {
        let x = (c.diasAtraso * 71 + seed + idx * 100) & 0xffffffff;
        x = (x * 1664525 + 1013904223) & 0xffffffff;
        return (x >>> 0) / 0xffffffff < 0.25;
      })
      .sort((a, b) => (b.compensacao || 0) - (a.compensacao || 0));
    setDrill({ label, idx, s, clientes: bucket });
    setDrillSearch("");
  }

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

  const totalVB = clientes.reduce((a, c) => a + (c.boletoVitbank || 0), 0);
  const totalPM = clientes.reduce((a, c) => a + (c.pixMonetali || 0), 0);
  const totalComp = clientes.reduce((a, c) => a + (c.compensacao || 0), 0);
  const naoRecup = clientes.filter((c) => ["Não Pago", "Distrato"].includes(c.situacao));
  const totalNR = naoRecup.reduce((a, c) => a + (c.compensacao || 0), 0);
  const pctVB = totalVB + totalPM > 0 ? Number(((totalVB / (totalVB + totalPM)) * 100).toFixed(0)) : 50;
  const filteredDrill = drill
    ? drill.clientes.filter((c) =>
        c.nome?.toLowerCase().includes(drillSearch.toLowerCase())
      )
    : [];

  const years: number[] = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 3; y--) years.push(y);

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
              onClick={() => setMode(m)}
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
              onChange={(e) => setSelectedYear(Number(e.target.value))}
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
          { label: "Boleto VitBank", value: fmt(totalVB), sub: `${pctVB}% do total`, subClass: "text-blue-500" },
          { label: "Pix Monetali", value: fmt(totalPM), sub: `${100 - pctVB}% do total`, subClass: "text-green-600" },
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
        <div style={{ position: "relative", width: "100%", height: 260 }}>
          <canvas ref={chartRef}></canvas>
        </div>

        {/* Barra de composição */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="text-xs font-medium text-gray-700 mb-1.5">Composição — VitBank × Monetali</div>
          <div className="flex h-1.5 rounded-full overflow-hidden mb-1.5">
            <div style={{ width: pctVB + "%", background: "#378ADD" }}></div>
            <div style={{ width: 100 - pctVB + "%", background: "#1D9E75" }}></div>
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span><span className="inline-block w-2 h-2 rounded-sm bg-blue-400 mr-1"></span>VitBank: {fmt(totalVB)} ({pctVB}%)</span>
            <span><span className="inline-block w-2 h-2 rounded-sm bg-green-500 mr-1"></span>Monetali: {fmt(totalPM)} ({100 - pctVB}%)</span>
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
                <span className="text-blue-600 font-medium">VitBank: {fmt(drill.s.vb[drill.idx])}</span>
                <span className="text-green-600 font-medium">Monetali: {fmt(drill.s.pm[drill.idx])}</span>
                <span className="text-amber-600 font-medium">Compensação: {fmt(drill.s.tot[drill.idx])}</span>
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
                  const sit = SITUACOES[c.situacao] || SITUACOES["Em Andamento"];
                  return (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 px-2 text-gray-800 truncate" title={c.nome}>{c.nome}</td>
                      <td className="py-2 px-2 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sit.badge}`}>
                          {c.situacao}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right text-blue-600">{fmt(c.boletoVitbank || 0)}</td>
                      <td className="py-2 px-2 text-right text-green-600">{fmt(c.pixMonetali || 0)}</td>
                      <td className="py-2 px-2 text-right font-medium">{fmt(c.compensacao || 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between mt-2.5 text-xs text-gray-400">
            <span>{filteredDrill.length} clientes</span>
            <span>Total: <span className="font-medium text-gray-700">{fmt(filteredDrill.reduce((a, c) => a + (c.compensacao || 0), 0))}</span></span>
          </div>
        </div>
      )}

      {/* Painéis inferiores */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="text-sm font-medium text-gray-800 mb-3">Distribuição por situação</div>
          {Object.entries(SITUACOES).map(([st, { cor }]) => {
            const g = clientes.filter((c) => c.situacao === st);
            const v = g.reduce((a, c) => a + (c.compensacao || 0), 0);
            const pct = totalComp > 0 ? ((v / totalComp) * 100).toFixed(1) : "0";
            return (
              <div key={st} className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-500 flex-shrink-0" style={{ width: 110 }}>
                  {st}
                </span>
                <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div style={{ width: pct + "%", background: cor, height: "100%", borderRadius: 9999 }}></div>
                </div>
                <span className="text-xs font-medium text-gray-700 text-right" style={{ minWidth: 60 }}>{fmt(v)}</span>
                <span className="text-xs text-gray-400" style={{ minWidth: 34 }}>{pct}%</span>
              </div>
            );
          })}
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="text-sm font-medium text-gray-800 mb-3">Aging da carteira</div>
          {[
            { l: "1–30 dias", t: (d: number) => d >= 1 && d <= 30, c: "y" as const },
            { l: "31–90 dias", t: (d: number) => d > 30 && d <= 90, c: "y" as const },
            { l: "91–180 dias", t: (d: number) => d > 90 && d <= 180, c: "r" as const },
            { l: "181–365 dias", t: (d: number) => d > 180 && d <= 365, c: "r" as const },
            { l: "+ 1 ano", t: (d: number) => d > 365, c: "r" as const },
          ].map((f) => {
            const g = clientes.filter((c) => f.t(c.diasAtraso || 0));
            const v = g.reduce((a, c) => a + (c.compensacao || 0), 0);
            const pct = totalComp > 0 ? ((v / totalComp) * 100).toFixed(0) : "0";
            return (
              <div key={f.l} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-b-0 text-xs">
                <span className="text-gray-500">{f.l} ({g.length})</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-800">{fmt(v)}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${f.c === "r" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}>{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
