import { useMemo, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, ScatterChart, Scatter, CartesianGrid, ZAxis, LineChart, Line } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Star, Users, Search, X, Download, Timer, CheckCircle, FileText } from 'lucide-react';
import { CXTicket, calculateCXKPIs, analyzeCausasRaiz, getNPSDistribution, generateCXSummary } from '@/lib/cx-logic';
import { downloadCSV } from '@/lib/export-utils';
import { supabase } from '@/integrations/supabase/client';

function getBlueShade(index: number, total: number): string {
  const minL = 30;
  const maxL = 70;
  const l = minL + ((maxL - minL) * index) / Math.max(total - 1, 1);
  return `hsl(215, 45%, ${l}%)`;
}

const CXDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const locState = location.state as { ticketData: CXTicket[] } | null;
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selectedCausa, setSelectedCausa] = useState<string | null>(null);
  const [selectedNps, setSelectedNps] = useState<string | null>(null);
  const [selectedTipo, setSelectedTipo] = useState<string | null>(null);
  const [periodoView, setPeriodoView] = useState<'dia' | 'mes' | 'ano'>('mes');
  const [corrX, setCorrX] = useState('tma');
  const [corrY, setCorrY] = useState('nps');
  const [dbData, setDbData] = useState<CXTicket[] | null>(null);
  const [loading, setLoading] = useState(!locState);
  const perPage = 10;

  useEffect(() => {
    if (locState) return;
    const fetchData = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) { navigate('/cx'); return; }
      const { data } = await supabase.from('cx_uploads').select('ticket_data')
        .eq('user_id', session.session.user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (data?.ticket_data) setDbData(data.ticket_data as unknown as CXTicket[]);
      else navigate('/cx');
      setLoading(false);
    };
    fetchData();
  }, [locState, navigate]);

  const ticketData = locState?.ticketData || dbData;
  const kpis = useMemo(() => ticketData ? calculateCXKPIs(ticketData) : null, [ticketData]);
  const causas = useMemo(() => ticketData ? analyzeCausasRaiz(ticketData) : [], [ticketData]);
  const npsDistribution = useMemo(() => ticketData ? getNPSDistribution(ticketData) : [], [ticketData]);
  const summary = useMemo(() => ticketData ? generateCXSummary(ticketData) : '', [ticketData]);

  const toggleCausa = (name: string) => { setSelectedCausa(prev => prev === name ? null : name); setPage(0); };
  const toggleNps = (faixa: string) => { setSelectedNps(prev => prev === faixa ? null : faixa); setPage(0); };
  const toggleTipo = (tipo: string) => { setSelectedTipo(prev => prev === tipo ? null : tipo); setPage(0); };

  const filtered = useMemo(() => {
    if (!ticketData) return [];
    let list = ticketData;
    if (selectedCausa) list = list.filter(t => t.causa_raiz === selectedCausa);
    if (selectedNps) {
      if (selectedNps === 'promotores') list = list.filter(t => t.nps_score >= 9);
      else if (selectedNps === 'neutros') list = list.filter(t => t.nps_score >= 7 && t.nps_score <= 8);
      else if (selectedNps === 'detratores') list = list.filter(t => t.nps_score <= 6);
    }
    if (selectedTipo) list = list.filter(t => t.tipo_chamado === selectedTipo);
    if (search) { const q = search.toLowerCase(); list = list.filter(t => t.cliente.toLowerCase().includes(q) || t.id_chamado.toLowerCase().includes(q) || t.causa_raiz.toLowerCase().includes(q) || t.tipo_chamado.toLowerCase().includes(q)); }
    return list;
  }, [ticketData, search, selectedCausa, selectedNps, selectedTipo]);

  // Charts data
  const rankingData = useMemo(() => [...causas].map((c, i) => ({ causa: c.causa, count: c.count, color: getBlueShade(i, causas.length) })), [causas]);
  const npsByCausa = useMemo(() => [...causas].sort((a, b) => a.nps_real - b.nps_real).map((c, i, arr) => ({ causa: c.causa, nps: Number(c.nps_real.toFixed(1)), color: getBlueShade(i, arr.length) })), [causas]);
  const tmaByCausa = useMemo(() => [...causas].sort((a, b) => b.tma_medio - a.tma_medio).map((c, i, arr) => ({ causa: c.causa, tma: Number(c.tma_medio.toFixed(1)), color: getBlueShade(i, arr.length) })), [causas]);
  const tmeByCausa = useMemo(() => [...causas].sort((a, b) => b.tme_medio - a.tme_medio).map((c, i, arr) => ({ causa: c.causa, tme: Number(c.tme_medio.toFixed(1)), color: getBlueShade(i, arr.length) })), [causas]);
  const fcrByCausa = useMemo(() => [...causas].sort((a, b) => a.fcr_rate - b.fcr_rate).map((c, i, arr) => ({ causa: c.causa, fcr: Number(c.fcr_rate.toFixed(1)), color: getBlueShade(i, arr.length) })), [causas]);

  // Tipo distribution
  const tipoData = useMemo(() => {
    if (!ticketData) return [];
    const grupos: Record<string, number> = {};
    ticketData.forEach(t => { grupos[t.tipo_chamado] = (grupos[t.tipo_chamado] || 0) + 1; });
    return Object.entries(grupos).sort((a, b) => b[1] - a[1]).map(([tipo, count], i, arr) => ({ tipo, count, color: getBlueShade(i, arr.length) }));
  }, [ticketData]);

  // Volume por período
  const volumeData = useMemo(() => {
    if (!ticketData) return [];
    const grupos: Record<string, number> = {};
    ticketData.forEach(t => {
      let key: string;
      if (periodoView === 'dia') key = t.data_chamado;
      else if (periodoView === 'mes') key = t.data_chamado.substring(0, 7);
      else key = t.data_chamado.substring(0, 4);
      grupos[key] = (grupos[key] || 0) + 1;
    });
    return Object.entries(grupos).sort((a, b) => a[0].localeCompare(b[0])).map(([periodo, count]) => {
      let label = periodo;
      if (periodoView === 'mes') {
        const [y, m] = periodo.split('-');
        const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        label = `${meses[parseInt(m) - 1]}/${y.slice(2)}`;
      } else if (periodoView === 'dia') {
        const parts = periodo.split('-');
        label = `${parts[2]}/${parts[1]}`;
      }
      return { periodo: label, count };
    });
  }, [ticketData, periodoView]);

  const corrIndicators: Record<string, { label: string; unit: string; getValue: (c: typeof causas[0]) => number }> = {
    tma: { label: 'TMA (min)', unit: ' min', getValue: c => Number(c.tma_medio.toFixed(1)) },
    nps: { label: 'NPS', unit: '', getValue: c => Number(c.nps_real.toFixed(1)) },
    tme: { label: 'TME (min)', unit: ' min', getValue: c => Number(c.tme_medio.toFixed(1)) },
    fcr: { label: 'FCR (%)', unit: '%', getValue: c => Number(c.fcr_rate.toFixed(1)) },
  };

  const scatterData = useMemo(() => causas.map(c => ({
    causa: c.causa,
    x: corrIndicators[corrX].getValue(c),
    y: corrIndicators[corrY].getValue(c),
    count: c.count,
    color: 'hsl(215, 45%, 45%)',
  })), [causas, corrX, corrY]);

  const pageCount = Math.ceil(filtered.length / perPage);
  const pageData = filtered.slice(page * perPage, (page + 1) * perPage);

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">Carregando dados...</div>;
  if (!ticketData || !kpis) return null;

  const npsColor = kpis.nps_real >= 50 ? 'text-green-600' : kpis.nps_real >= 0 ? 'text-amber-600' : 'text-destructive';
  const activeFilters = [
    selectedCausa && { label: selectedCausa, clear: () => setSelectedCausa(null) },
    selectedNps && { label: selectedNps === 'promotores' ? 'Promotores' : selectedNps === 'neutros' ? 'Neutros' : 'Detratores', clear: () => setSelectedNps(null) },
    selectedTipo && { label: selectedTipo, clear: () => setSelectedTipo(null) },
  ].filter(Boolean) as { label: string; clear: () => void }[];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Análise Customer Experience</h1>
        <p className="text-muted-foreground">Análise de chamados, TMA, TME, NPS, FCR e causas raiz</p>
      </div>

      {activeFilters.length > 0 && (
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Filtros ativos:</span>
          {activeFilters.map(f => (
            <Badge key={f.label} className="cursor-pointer gap-1 text-sm" style={{ backgroundColor: 'hsl(215, 45%, 45%)' }} onClick={f.clear}>
              {f.label} <X className="h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="flex items-center gap-4 p-6">
          <div className="rounded-lg bg-accent p-3"><Users className="h-6 w-6 text-primary" /></div>
          <div><p className="text-sm text-muted-foreground">Total de Chamados</p><p className="text-2xl font-bold text-foreground">{kpis.total_chamados.toLocaleString('pt-BR')}</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 p-6">
          <div className="rounded-lg bg-accent p-3"><Clock className="h-6 w-6 text-primary" /></div>
          <div><p className="text-sm text-muted-foreground">TMA Médio</p><p className="text-2xl font-bold text-foreground">{kpis.tma_medio.toFixed(1)} min</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 p-6">
          <div className="rounded-lg bg-accent p-3"><Star className="h-6 w-6 text-primary" /></div>
          <div><p className="text-sm text-muted-foreground">NPS</p><p className={`text-2xl font-bold ${npsColor}`}>{kpis.nps_real.toFixed(1)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 p-6">
          <div className="rounded-lg bg-accent p-3"><Timer className="h-6 w-6 text-primary" /></div>
          <div><p className="text-sm text-muted-foreground">TME Médio</p><p className="text-2xl font-bold text-foreground">{kpis.tme_medio.toFixed(1)} min</p></div>
        </CardContent></Card>
      </div>

      {/* Diagnóstico CX */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><FileText className="h-5 w-5" /> Diagnóstico CX</CardTitle>
          <p className="text-xs text-muted-foreground">Resumo analítico gerado automaticamente a partir dos dados</p>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-foreground">{summary}</p>
        </CardContent>
      </Card>

      {/* Row 1: Distribuição NPS + Correlação */}
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição NPS</CardTitle>
            <p className="text-xs text-muted-foreground">Clique para filtrar nos chamados</p>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="h-[220px] w-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={npsDistribution} dataKey="count" nameKey="categoria" cx="50%" cy="50%" innerRadius={65} outerRadius={100} paddingAngle={2} className="cursor-pointer">
                      {npsDistribution.map((entry, i) => (
                        <Cell key={i} fill={entry.color} opacity={selectedNps && selectedNps !== entry.faixa ? 0.3 : 1} onClick={() => toggleNps(entry.faixa)} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number, name: string) => [`${value} chamados`, name]} />
                    <text x="50%" y="46%" textAnchor="middle" dominantBaseline="central" className="fill-foreground" style={{ fontSize: '28px', fontWeight: 'bold' }}>
                      {kpis.nps_real.toFixed(1)}
                    </text>
                    <text x="50%" y="58%" textAnchor="middle" dominantBaseline="central" className="fill-muted-foreground" style={{ fontSize: '11px' }}>
                      NPS
                    </text>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-3">
                {npsDistribution.map((d) => (
                  <div key={d.categoria} className="flex items-center justify-between cursor-pointer hover:bg-accent/50 rounded px-2 py-1 transition-colors" onClick={() => toggleNps(d.faixa)}>
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-sm text-foreground">{d.categoria}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-foreground">{d.pct.toFixed(1).replace('.', ',')}%</span>
                      <span className="ml-1 text-xs text-muted-foreground">({d.count})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Correlação TMA × NPS</CardTitle>
            <p className="text-xs text-muted-foreground">Cada bolha = causa raiz, tamanho = volume</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <ScatterChart margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis type="number" dataKey="tma" name="TMA (min)" unit=" min" tick={{ fontSize: 11 }} />
                <YAxis type="number" dataKey="nps" name="NPS" tick={{ fontSize: 11 }} />
                <ZAxis type="number" dataKey="count" range={[60, 400]} name="Chamados" />
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (<div className="rounded-lg border bg-background p-2 shadow-md">
                    <p className="text-xs font-bold text-foreground">{d.causa}</p>
                    <p className="text-xs text-muted-foreground">TMA: {d.tma} min | NPS: {d.nps} | {d.count} chamados</p>
                  </div>);
                }} />
                <Scatter data={scatterData}>
                  {scatterData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} opacity={selectedCausa && selectedCausa !== entry.causa ? 0.3 : 0.8} className="cursor-pointer" onClick={() => toggleCausa(entry.causa)} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Volume por Período */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Volume de Chamados por Período</CardTitle>
              <p className="text-xs text-muted-foreground">Distribuição temporal dos chamados</p>
            </div>
            <div className="flex gap-1">
              {(['dia', 'mes', 'ano'] as const).map(p => (
                <Button key={p} variant={periodoView === p ? 'default' : 'outline'} size="sm" onClick={() => setPeriodoView(p)} className="text-xs capitalize">
                  {p === 'dia' ? 'Dia' : p === 'mes' ? 'Mês' : 'Ano'}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={volumeData} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="periodo" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [`${v} chamados`, 'Volume']} />
              <Line type="monotone" dataKey="count" stroke="hsl(215, 45%, 45%)" strokeWidth={2} dot={{ fill: 'hsl(215, 45%, 45%)', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Row 2: Ranking + NPS por Causa (2x2 grid) */}
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Ranking de Causas Raiz</CardTitle><p className="text-xs text-muted-foreground">Clique para filtrar</p></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={rankingData} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" />
                <YAxis type="category" dataKey="causa" width={120} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => [`${v} chamados`, 'Volume']} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {rankingData.map((entry, i) => (<Cell key={i} fill={entry.color} opacity={selectedCausa && selectedCausa !== entry.causa ? 0.3 : 1} className="cursor-pointer" onClick={() => toggleCausa(entry.causa)} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">NPS por Causa Raiz</CardTitle><p className="text-xs text-muted-foreground">Clique para filtrar</p></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={npsByCausa} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" domain={['dataMin', 'dataMax']} />
                <YAxis type="category" dataKey="causa" width={120} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => [`${v}`, 'NPS']} />
                <Bar dataKey="nps" radius={[0, 4, 4, 0]}>
                  {npsByCausa.map((entry, i) => (<Cell key={i} fill={entry.color} opacity={selectedCausa && selectedCausa !== entry.causa ? 0.3 : 1} className="cursor-pointer" onClick={() => toggleCausa(entry.causa)} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">TMA por Causa Raiz</CardTitle><p className="text-xs text-muted-foreground">Clique para filtrar</p></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={tmaByCausa} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" />
                <YAxis type="category" dataKey="causa" width={120} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => [`${v} min`, 'TMA']} />
                <Bar dataKey="tma" radius={[0, 4, 4, 0]}>
                  {tmaByCausa.map((entry, i) => (<Cell key={i} fill={entry.color} opacity={selectedCausa && selectedCausa !== entry.causa ? 0.3 : 1} className="cursor-pointer" onClick={() => toggleCausa(entry.causa)} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">TME por Causa Raiz</CardTitle><p className="text-xs text-muted-foreground">Clique para filtrar</p></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={tmeByCausa} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" />
                <YAxis type="category" dataKey="causa" width={120} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => [`${v} min`, 'TME']} />
                <Bar dataKey="tme" radius={[0, 4, 4, 0]}>
                  {tmeByCausa.map((entry, i) => (<Cell key={i} fill={entry.color} opacity={selectedCausa && selectedCausa !== entry.causa ? 0.3 : 1} className="cursor-pointer" onClick={() => toggleCausa(entry.causa)} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: FCR + Tipo de Chamado */}
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Taxa de FCR por Causa Raiz</CardTitle><p className="text-xs text-muted-foreground">% resolução no primeiro contato</p></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={fcrByCausa} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" unit="%" />
                <YAxis type="category" dataKey="causa" width={120} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => [`${v}%`, 'FCR']} />
                <Bar dataKey="fcr" radius={[0, 4, 4, 0]}>
                  {fcrByCausa.map((entry, i) => (<Cell key={i} fill={entry.color} opacity={selectedCausa && selectedCausa !== entry.causa ? 0.3 : 1} className="cursor-pointer" onClick={() => toggleCausa(entry.causa)} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Chamados por Tipo</CardTitle><p className="text-xs text-muted-foreground">Clique para filtrar</p></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={tipoData} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" />
                <YAxis type="category" dataKey="tipo" width={120} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => [`${v} chamados`, 'Volume']} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {tipoData.map((entry, i) => (<Cell key={i} fill={entry.color} opacity={selectedTipo && selectedTipo !== entry.tipo ? 0.3 : 1} className="cursor-pointer" onClick={() => toggleTipo(entry.tipo)} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle className="text-base">Chamados{(selectedCausa || selectedNps || selectedTipo) && <span className="ml-2 text-sm font-normal text-muted-foreground">({filtered.length} de {ticketData.length})</span>}</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Buscar..." className="pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
              </div>
              <Button variant="outline" size="sm" className="gap-1" onClick={() => {
                downloadCSV(filtered.map(t => ({
                  ID: t.id_chamado, Cliente: t.cliente, Tipo: t.tipo_chamado, 'TMA (min)': t.tma_minutos,
                  'TME (min)': t.tme_minutos, NPS: t.nps_score, FCR: t.fcr ? 'Sim' : 'Não',
                  'Causa Raiz': t.causa_raiz, Data: t.data_chamado, 'Comentário NPS': t.comentario_nps,
                })), 'cx-chamados.csv');
              }}>
                <Download className="h-4 w-4" /> Exportar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead><TableHead>Cliente</TableHead><TableHead>Tipo</TableHead>
                <TableHead className="text-center">TMA</TableHead><TableHead className="text-center">TME</TableHead>
                <TableHead className="text-center">NPS</TableHead><TableHead className="text-center">FCR</TableHead>
                <TableHead>Causa Raiz</TableHead><TableHead>Data</TableHead><TableHead>Comentário</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TooltipProvider>
                {pageData.map((t) => (
                  <TableRow key={t.id_chamado}>
                    <TableCell className="text-muted-foreground text-xs">{t.id_chamado}</TableCell>
                    <TableCell className="font-medium text-sm">{t.cliente}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs whitespace-nowrap">{t.tipo_chamado}</Badge></TableCell>
                    <TableCell className="text-center text-sm">{t.tma_minutos}</TableCell>
                    <TableCell className="text-center text-sm">{t.tme_minutos}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={t.nps_score >= 9 ? 'default' : t.nps_score >= 7 ? 'secondary' : 'destructive'} className="text-xs">{t.nps_score}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={t.fcr === 1 ? 'default' : 'secondary'} className="text-xs">{t.fcr === 1 ? 'Sim' : 'Não'}</Badge>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-xs whitespace-nowrap">{t.causa_raiz}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{t.data_chamado}</TableCell>
                    <TableCell>
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <span className="text-xs text-muted-foreground cursor-help truncate block max-w-[150px]">{t.comentario_nps}</span>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-xs">
                          <p className="text-xs mb-1 font-semibold">Comentário NPS:</p>
                          <p className="text-xs">{t.comentario_nps}</p>
                          {t.transcricao && (<><p className="text-xs mt-2 mb-1 font-semibold">Transcrição:</p><p className="text-xs">{t.transcricao}</p></>)}
                        </TooltipContent>
                      </UITooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TooltipProvider>
            </TableBody>
          </Table>
          {pageCount > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</Button>
              <span className="text-sm text-muted-foreground">Página {page + 1} de {pageCount}</span>
              <Button variant="outline" size="sm" disabled={page >= pageCount - 1} onClick={() => setPage(page + 1)}>Próxima</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CXDashboard;
