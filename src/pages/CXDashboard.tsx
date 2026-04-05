import { useMemo, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, ScatterChart, Scatter, CartesianGrid, ZAxis } from 'recharts';
import { Clock, Star, AlertTriangle, Users, Search, X, Download } from 'lucide-react';
import { CXTicket, calculateCXKPIs, analyzeCausasRaiz, getNPSDistribution } from '@/lib/cx-logic';
import { downloadCSV } from '@/lib/export-utils';
import { supabase } from '@/integrations/supabase/client';

/** Gray gradient from dark to light based on index */
function getGrayShade(index: number, total: number): string {
  const minL = 30;
  const maxL = 75;
  const l = minL + ((maxL - minL) * index) / Math.max(total - 1, 1);
  return `hsl(0, 0%, ${l}%)`;
}

const CXDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const locState = location.state as { ticketData: CXTicket[] } | null;
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selectedCausa, setSelectedCausa] = useState<string | null>(null);
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

  const toggleCausa = (name: string) => { setSelectedCausa(prev => prev === name ? null : name); setPage(0); };

  const filtered = useMemo(() => {
    if (!ticketData) return [];
    let list = ticketData;
    if (selectedCausa) list = list.filter(t => t.causa_raiz === selectedCausa);
    if (search) { const q = search.toLowerCase(); list = list.filter(t => t.cliente.toLowerCase().includes(q) || t.id_chamado.toLowerCase().includes(q) || t.causa_raiz.toLowerCase().includes(q)); }
    return list;
  }, [ticketData, search, selectedCausa]);

  // Ranking sorted by count desc (gray dark=most to light=least)
  const rankingData = useMemo(() =>
    [...causas].map((c, i) => ({
      causa: c.causa, count: c.count, color: getGrayShade(i, causas.length),
    })), [causas]);

  // NPS by cause sorted by NPS asc (worst first = darkest)
  const npsByCausa = useMemo(() =>
    [...causas].sort((a, b) => a.nps_real - b.nps_real).map((c, i, arr) => ({
      causa: c.causa, nps: Number(c.nps_real.toFixed(1)), color: getGrayShade(i, arr.length),
    })), [causas]);

  // TMA by cause sorted desc (highest = darkest)
  const tmaByCausa = useMemo(() =>
    [...causas].sort((a, b) => b.tma_medio - a.tma_medio).map((c, i, arr) => ({
      causa: c.causa, tma: Number(c.tma_medio.toFixed(1)), color: getGrayShade(i, arr.length),
    })), [causas]);

  // Scatter data
  const scatterData = useMemo(() =>
    causas.map(c => ({
      causa: c.causa, tma: Number(c.tma_medio.toFixed(1)), nps: Number(c.nps_real.toFixed(1)), count: c.count, color: 'hsl(0, 0%, 45%)',
    })), [causas]);

  const pageCount = Math.ceil(filtered.length / perPage);
  const pageData = filtered.slice(page * perPage, (page + 1) * perPage);

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">Carregando dados...</div>;
  if (!ticketData || !kpis) return null;

  const npsColor = kpis.nps_real >= 50 ? 'text-green-600' : kpis.nps_real >= 0 ? 'text-amber-600' : 'text-destructive';

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Análise Customer Experience</h1>
        <p className="text-muted-foreground">Análise de chamados, TMA, NPS e causas raiz</p>
      </div>

      {selectedCausa && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filtro ativo:</span>
          <Badge className="cursor-pointer gap-1 text-sm bg-muted-foreground text-white" onClick={() => setSelectedCausa(null)}>
            {selectedCausa} <X className="h-3 w-3" />
          </Badge>
        </div>
      )}

      {/* KPIs */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-accent p-3"><Users className="h-6 w-6 text-primary" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Total de Chamados</p>
              <p className="text-2xl font-bold text-foreground">{kpis.total_chamados.toLocaleString('pt-BR')}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-accent p-3"><Clock className="h-6 w-6 text-primary" /></div>
            <div>
              <p className="text-sm text-muted-foreground">TMA Médio</p>
              <p className="text-2xl font-bold text-foreground">{kpis.tma_medio.toFixed(1)} min</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-accent p-3"><Star className="h-6 w-6 text-primary" /></div>
            <div>
              <p className="text-sm text-muted-foreground">NPS</p>
              <p className={`text-2xl font-bold ${npsColor}`}>{kpis.nps_real.toFixed(1)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-accent p-3"><AlertTriangle className="h-6 w-6 text-primary" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Causas Raiz</p>
              <p className="text-2xl font-bold text-foreground">{kpis.causas_unicas}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 1: Distribuição NPS + Correlação TMA × NPS */}
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição NPS</CardTitle>
            <p className="text-xs text-muted-foreground">Promotores (9-10), Neutros (7-8), Detratores (0-6)</p>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="h-[220px] w-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={npsDistribution} dataKey="count" nameKey="categoria" cx="50%" cy="50%" innerRadius={65} outerRadius={100} paddingAngle={2}>
                      {npsDistribution.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number, name: string) => [`${value} chamados`, name]} />
                    {/* NPS value in center */}
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
                  <div key={d.categoria} className="flex items-center justify-between">
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
            <p className="text-xs text-muted-foreground">Cada bolha é uma causa raiz — tamanho = volume de chamados</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <ScatterChart margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis type="number" dataKey="tma" name="TMA (min)" unit=" min" tick={{ fontSize: 11 }} />
                <YAxis type="number" dataKey="nps" name="NPS" tick={{ fontSize: 11 }} />
                <ZAxis type="number" dataKey="count" range={[60, 400]} name="Chamados" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-md">
                        <p className="text-xs font-bold text-foreground">{d.causa}</p>
                        <p className="text-xs text-muted-foreground">TMA: {d.tma} min</p>
                        <p className="text-xs text-muted-foreground">NPS: {d.nps}</p>
                        <p className="text-xs text-muted-foreground">{d.count} chamados</p>
                      </div>
                    );
                  }}
                />
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

      {/* Row 2: Ranking + NPS por Causa + TMA por Causa (3 side by side) */}
      <div className="mb-8 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ranking de Causas Raiz</CardTitle>
            <p className="text-xs text-muted-foreground">Clique para filtrar</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={rankingData} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" />
                <YAxis type="category" dataKey="causa" width={120} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => [`${v} chamados`, 'Volume']} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {rankingData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} opacity={selectedCausa && selectedCausa !== entry.causa ? 0.3 : 1} className="cursor-pointer" onClick={() => toggleCausa(entry.causa)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">NPS por Causa Raiz</CardTitle>
            <p className="text-xs text-muted-foreground">Clique para filtrar</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={npsByCausa} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" domain={['dataMin', 'dataMax']} />
                <YAxis type="category" dataKey="causa" width={120} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => [`${v}`, 'NPS']} />
                <Bar dataKey="nps" radius={[0, 4, 4, 0]}>
                  {npsByCausa.map((entry, i) => (
                    <Cell key={i} fill={entry.color} opacity={selectedCausa && selectedCausa !== entry.causa ? 0.3 : 1} className="cursor-pointer" onClick={() => toggleCausa(entry.causa)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">TMA por Causa Raiz</CardTitle>
            <p className="text-xs text-muted-foreground">Clique para filtrar</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={tmaByCausa} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" />
                <YAxis type="category" dataKey="causa" width={120} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => [`${v} min`, 'TMA']} />
                <Bar dataKey="tma" radius={[0, 4, 4, 0]}>
                  {tmaByCausa.map((entry, i) => (
                    <Cell key={i} fill={entry.color} opacity={selectedCausa && selectedCausa !== entry.causa ? 0.3 : 1} className="cursor-pointer" onClick={() => toggleCausa(entry.causa)} />
                  ))}
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
            <CardTitle className="text-base">Chamados{selectedCausa && <span className="ml-2 text-sm font-normal text-muted-foreground">({filtered.length} de {ticketData.length})</span>}</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Buscar..." className="pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
              </div>
              <Button variant="outline" size="sm" className="gap-1" onClick={() => {
                downloadCSV(filtered.map(t => ({
                  ID: t.id_chamado, Cliente: t.cliente, 'TMA (min)': t.tma_minutos,
                  NPS: t.nps_score, 'Causa Raiz': t.causa_raiz, Data: t.data_chamado,
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
                <TableHead>ID</TableHead><TableHead>Cliente</TableHead>
                <TableHead className="text-center">TMA (min)</TableHead>
                <TableHead className="text-center">NPS</TableHead>
                <TableHead>Causa Raiz</TableHead><TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.map((t) => (
                <TableRow key={t.id_chamado}>
                  <TableCell className="text-muted-foreground">{t.id_chamado}</TableCell>
                  <TableCell className="font-medium">{t.cliente}</TableCell>
                  <TableCell className="text-center">{t.tma_minutos}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={t.nps_score >= 9 ? 'default' : t.nps_score >= 7 ? 'secondary' : 'destructive'} className="text-xs">
                      {t.nps_score}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs whitespace-nowrap">
                      {t.causa_raiz}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t.data_chamado}</TableCell>
                </TableRow>
              ))}
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
