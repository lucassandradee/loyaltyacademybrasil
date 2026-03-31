import { useMemo, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Clock, Star, AlertTriangle, ArrowLeft, Search, X, Download, TrendingUp } from 'lucide-react';
import { CXTicket, calculateCXKPIs, analyzeCausasRaiz, causaColors, generateCX5W2H, generateCXEisenhower } from '@/lib/cx-logic';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';

const CXDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const locState = location.state as { ticketData: CXTicket[] } | null;
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selectedCausa, setSelectedCausa] = useState<string | null>(null);
  const [filterCausa, setFilterCausa] = useState('Todos');
  const [dbData, setDbData] = useState<CXTicket[] | null>(null);
  const [loading, setLoading] = useState(!locState);
  const perPage = 10;

  useEffect(() => {
    if (locState) return;
    const fetch = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) { navigate('/cx'); return; }
      const { data } = await supabase.from('cx_uploads').select('ticket_data')
        .eq('user_id', session.session.user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (data?.ticket_data) setDbData(data.ticket_data as unknown as CXTicket[]);
      else navigate('/cx');
      setLoading(false);
    };
    fetch();
  }, [locState, navigate]);

  const ticketData = locState?.ticketData || dbData;
  const kpis = useMemo(() => ticketData ? calculateCXKPIs(ticketData) : null, [ticketData]);
  const causas = useMemo(() => ticketData ? analyzeCausasRaiz(ticketData) : [], [ticketData]);
  const plans5w2h = useMemo(() => generateCX5W2H(causas), [causas]);
  const plansEisenhower = useMemo(() => generateCXEisenhower(causas), [causas]);

  const causaNames = useMemo(() => causas.map(c => c.causa), [causas]);

  const toggleCausa = (name: string) => { setSelectedCausa(prev => prev === name ? null : name); setPage(0); };

  const filtered = useMemo(() => {
    if (!ticketData) return [];
    let list = ticketData;
    if (selectedCausa) list = list.filter(t => t.causa_raiz === selectedCausa);
    if (search) { const q = search.toLowerCase(); list = list.filter(t => t.cliente.toLowerCase().includes(q) || t.id_chamado.toLowerCase().includes(q) || t.causa_raiz.toLowerCase().includes(q)); }
    return list;
  }, [ticketData, search, selectedCausa]);

  const pageCount = Math.ceil(filtered.length / perPage);
  const pageData = filtered.slice(page * perPage, (page + 1) * perPage);

  const activeFilter = selectedCausa || filterCausa;
  const causasToShow = activeFilter === 'Todos' ? causaNames.slice(0, 5) : [activeFilter];

  const handleDownloadExcel = () => {
    const wb = XLSX.utils.book_new();
    const w2hRows: any[] = [];
    causasToShow.forEach(name => {
      (plans5w2h[name] || []).forEach(p => {
        w2hRows.push({ 'Causa Raiz': name, 'O quê': p.what, 'Por quê': p.why, Onde: p.where, Quando: p.when, Quem: p.who, Como: p.how, Quanto: p.howMuch });
      });
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(w2hRows), '5W2H');
    const eRows: any[] = [];
    causasToShow.forEach(name => {
      const m = plansEisenhower[name]; if (!m) return;
      const add = (q: string, items: string[]) => items.forEach(item => eRows.push({ 'Causa Raiz': name, Quadrante: q, Ação: item }));
      add('🔴 Urgente + Importante', m.urgentImportant);
      add('🔵 Não Urgente + Importante', m.notUrgentImportant);
      add('🟡 Urgente + Não Importante', m.urgentNotImportant);
      add('⚪ Não Urgente + Não Importante', m.notUrgentNotImportant);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(eRows), 'Matriz Eisenhower');
    XLSX.writeFile(wb, 'plano-de-acao-cx.xlsx');
  };

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">Carregando dados...</div>;
  if (!ticketData || !kpis) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Dashboard Customer Experience</h1>
        <p className="text-muted-foreground">Análise de chamados, TMA, NPS e causas raiz</p>
      </div>

      {selectedCausa && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filtro ativo:</span>
          <Badge className="cursor-pointer gap-1 text-sm" style={{ backgroundColor: causaColors[selectedCausa] || 'hsl(220, 15%, 60%)', color: '#fff' }} onClick={() => setSelectedCausa(null)}>
            {selectedCausa} <X className="h-3 w-3" />
          </Badge>
        </div>
      )}

      {/* KPIs */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { icon: Clock, label: 'TMA Médio', value: `${kpis.tma_medio.toFixed(1)} min` },
          { icon: Clock, label: 'TMA Mín', value: `${kpis.tma_min} min` },
          { icon: Clock, label: 'TMA Máx', value: `${kpis.tma_max} min` },
          { icon: Star, label: 'NPS Médio', value: kpis.nps_medio.toFixed(1) },
          { icon: Star, label: 'NPS Mín', value: String(kpis.nps_min) },
          { icon: Star, label: 'NPS Máx', value: String(kpis.nps_max) },
        ].map((kpi, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-accent p-2"><kpi.icon className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className="text-lg font-bold text-foreground">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Causas Raiz */}
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ranking de Causas Raiz</CardTitle>
            <p className="text-xs text-muted-foreground">Clique em uma barra para filtrar</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={causas} layout="vertical" margin={{ left: 20 }}
                onClick={(data: any) => { if (data?.activePayload?.[0]?.payload?.causa) toggleCausa(data.activePayload[0].payload.causa); }}
                className="cursor-pointer">
                <XAxis type="number" />
                <YAxis type="category" dataKey="causa" width={140} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [`${v} chamados`, 'Volume']} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {causas.map((entry, i) => (
                    <Cell key={i} fill={causaColors[entry.causa] || 'hsl(220, 15%, 60%)'} opacity={selectedCausa && selectedCausa !== entry.causa ? 0.3 : 1} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" /> Impacto no NPS por Causa
            </CardTitle>
            <p className="text-xs text-muted-foreground">Melhoria esperada no NPS ao resolver cada causa</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {causas.slice(0, 8).map((c) => (
                <div key={c.causa} className="flex items-center gap-3 cursor-pointer" onClick={() => toggleCausa(c.causa)}>
                  <div className="w-32 truncate text-sm font-medium" title={c.causa}>{c.causa}</div>
                  <div className="flex-1">
                    <div className="h-6 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(Math.abs(c.impacto_nps) * 20, 100)}%`,
                          backgroundColor: causaColors[c.causa] || 'hsl(220, 15%, 60%)',
                          opacity: selectedCausa && selectedCausa !== c.causa ? 0.3 : 1,
                        }}
                      />
                    </div>
                  </div>
                  <div className="w-20 text-right">
                    <Badge variant={c.impacto_nps > 0.5 ? 'destructive' : 'secondary'} className="text-xs">
                      {c.impacto_nps > 0 ? '+' : ''}{c.impacto_nps.toFixed(2)} pts
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Plan */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <CardTitle className="text-base">Plano de Ação CX</CardTitle>
              {selectedCausa ? (
                <Badge style={{ backgroundColor: causaColors[selectedCausa] || 'hsl(220, 15%, 60%)', color: '#fff' }}>{selectedCausa}</Badge>
              ) : (
                <Select value={filterCausa} onValueChange={setFilterCausa}>
                  <SelectTrigger className="w-[240px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todas as causas</SelectItem>
                    {causaNames.slice(0, 5).map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={handleDownloadExcel}><Download className="mr-2 h-4 w-4" /> Baixar Excel</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="5w2h">
            <TabsList><TabsTrigger value="5w2h">5W2H</TabsTrigger><TabsTrigger value="eisenhower">Matriz de Eisenhower</TabsTrigger></TabsList>
            <TabsContent value="5w2h">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[120px]">Causa Raiz</TableHead>
                      <TableHead className="min-w-[140px]">O quê</TableHead>
                      <TableHead className="min-w-[160px]">Por quê</TableHead>
                      <TableHead className="min-w-[100px]">Onde</TableHead>
                      <TableHead className="min-w-[100px]">Quando</TableHead>
                      <TableHead className="min-w-[100px]">Quem</TableHead>
                      <TableHead className="min-w-[160px]">Como</TableHead>
                      <TableHead className="min-w-[120px]">Quanto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {causasToShow.map(name => {
                      const plans = plans5w2h[name] || [];
                      return plans.map((p, i) => (
                        <TableRow key={`${name}-${i}`}>
                          {i === 0 && (
                            <TableCell rowSpan={plans.length} className="align-top">
                              <Badge variant="outline" className="text-xs whitespace-nowrap" style={{ borderColor: causaColors[name] || '#888', color: causaColors[name] || '#888' }}>{name}</Badge>
                            </TableCell>
                          )}
                          <TableCell className="font-medium">{p.what}</TableCell>
                          <TableCell>{p.why}</TableCell><TableCell>{p.where}</TableCell>
                          <TableCell>{p.when}</TableCell><TableCell>{p.who}</TableCell>
                          <TableCell>{p.how}</TableCell><TableCell>{p.howMuch}</TableCell>
                        </TableRow>
                      ));
                    })}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            <TabsContent value="eisenhower">
              <div className="space-y-6">
                {causasToShow.map(name => {
                  const matrix = plansEisenhower[name]; if (!matrix) return null;
                  return (
                    <div key={name}>
                      {causasToShow.length > 1 && <div className="mb-3"><Badge variant="outline" className="text-xs" style={{ borderColor: causaColors[name] || '#888', color: causaColors[name] || '#888' }}>{name}</Badge></div>}
                      <div className="grid grid-cols-2 gap-4">
                        <EisenhowerQuadrant title="🔴 Urgente + Importante" subtitle="Fazer agora" items={matrix.urgentImportant} borderClass="border-destructive/30" bgClass="bg-destructive/5" titleClass="text-destructive" />
                        <EisenhowerQuadrant title="🔵 Não Urgente + Importante" subtitle="Agendar" items={matrix.notUrgentImportant} borderClass="border-primary/30" bgClass="bg-primary/5" titleClass="text-primary" />
                        <EisenhowerQuadrant title="🟡 Urgente + Não Importante" subtitle="Delegar" items={matrix.urgentNotImportant} borderClass="border-amber-500/30" bgClass="bg-amber-500/5" titleClass="text-amber-600" />
                        <EisenhowerQuadrant title="⚪ Não Urgente + Não Importante" subtitle="Eliminar ou adiar" items={matrix.notUrgentNotImportant} borderClass="border-muted-foreground/30" bgClass="bg-muted/50" titleClass="text-muted-foreground" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle className="text-base">Chamados{selectedCausa && <span className="ml-2 text-sm font-normal text-muted-foreground">({filtered.length} de {ticketData.length})</span>}</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar..." className="pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
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
                    <Badge variant="outline" className="text-xs whitespace-nowrap" style={{ borderColor: causaColors[t.causa_raiz] || '#888', color: causaColors[t.causa_raiz] || '#888' }}>
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

      <div className="mt-6">
        <Button variant="ghost" onClick={() => navigate('/cx')}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Upload</Button>
      </div>
    </div>
  );
};

function EisenhowerQuadrant({ title, subtitle, items, borderClass, bgClass, titleClass }: {
  title: string; subtitle: string; items: string[]; borderClass: string; bgClass: string; titleClass: string;
}) {
  return (
    <div className={`rounded-lg border-2 ${borderClass} ${bgClass} p-4`}>
      <h4 className={`mb-3 text-sm font-bold ${titleClass}`}>{title}</h4>
      <p className="mb-2 text-xs text-muted-foreground">{subtitle}</p>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-foreground">
            <Checkbox id={`cx-${title}-${i}`} className="mt-0.5" />
            <label htmlFor={`cx-${title}-${i}`} className="cursor-pointer leading-tight">{item}</label>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default CXDashboard;
