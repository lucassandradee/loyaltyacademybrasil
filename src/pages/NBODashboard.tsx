import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Users, DollarSign, Clock, Search, X, Download, Info, ArrowRight } from 'lucide-react';
import { classifyNBO, allFaixaNames, faixaColors, faixaActions, faixa5W2H, faixaEisenhower } from '@/lib/nbo-logic';
import { supabase } from '@/integrations/supabase/client';
import type { ClientData } from '@/lib/rfv-logic';
import * as XLSX from 'xlsx';

const NBODashboard = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selectedFaixa, setSelectedFaixa] = useState<string | null>(null);
  const [filterFaixa, setFilterFaixa] = useState('Todos');
  const [clientData, setClientData] = useState<ClientData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const perPage = 10;

  useEffect(() => {
    const fetch = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) { navigate('/rfv'); return; }
      const { data } = await supabase.from('rfv_uploads').select('client_data')
        .eq('user_id', session.session.user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (data?.client_data) setClientData(data.client_data as unknown as ClientData[]);
      else navigate('/rfv');
      setLoading(false);
    };
    fetch();
  }, [navigate]);

  const scored = useMemo(() => clientData ? classifyNBO(clientData) : [], [clientData]);

  const totalClients = scored.length;
  const avgGasto = totalClients > 0 ? scored.reduce((s, c) => s + c.gasto_total, 0) / totalClients : 0;
  const avgRecencia = totalClients > 0 ? scored.reduce((s, c) => s + c.recencia, 0) / totalClients : 0;

  const faixaCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allFaixaNames.forEach(n => counts[n] = 0);
    scored.forEach(c => { counts[c.faixa] = (counts[c.faixa] || 0) + 1; });
    return allFaixaNames.map(name => ({
      name, count: counts[name],
      pct: totalClients > 0 ? ((counts[name] / totalClients) * 100).toFixed(1) : '0',
      color: faixaColors[name],
    }));
  }, [scored, totalClients]);

  const toggleFaixa = (name: string) => { setSelectedFaixa(prev => prev === name ? null : name); setPage(0); };

  const filtered = useMemo(() => {
    let list = scored;
    if (selectedFaixa) list = list.filter(c => c.faixa === selectedFaixa);
    if (search) { const q = search.toLowerCase(); list = list.filter(c => c.nome.toLowerCase().includes(q) || c.id_cliente.includes(q)); }
    return list;
  }, [scored, search, selectedFaixa]);

  const pageCount = Math.ceil(filtered.length / perPage);
  const pageData = filtered.slice(page * perPage, (page + 1) * perPage);

  const activeFilter = selectedFaixa || filterFaixa;
  const clustersToShow = activeFilter === 'Todos' ? allFaixaNames : [activeFilter];

  const handleDownloadExcel = () => {
    const wb = XLSX.utils.book_new();
    const w2hRows: any[] = [];
    clustersToShow.forEach(name => {
      (faixa5W2H[name] || []).forEach(p => {
        w2hRows.push({ Segmento: name, 'O quê': p.what, 'Por quê': p.why, Onde: p.where, Quando: p.when, Quem: p.who, Como: p.how, Quanto: p.howMuch });
      });
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(w2hRows), '5W2H');
    const eRows: any[] = [];
    clustersToShow.forEach(name => {
      const m = faixaEisenhower[name]; if (!m) return;
      const add = (q: string, items: string[]) => items.forEach(item => eRows.push({ Segmento: name, Quadrante: q, Ação: item }));
      add('🔴 Urgente + Importante', m.urgentImportant);
      add('🔵 Não Urgente + Importante', m.notUrgentImportant);
      add('🟡 Urgente + Não Importante', m.urgentNotImportant);
      add('⚪ Não Urgente + Não Importante', m.notUrgentNotImportant);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(eRows), 'Matriz Eisenhower');
    XLSX.writeFile(wb, 'plano-de-acao-nbo.xlsx');
  };

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">Carregando dados...</div>;
  if (!clientData) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Dashboard Next Best Offer</h1>
        <p className="text-muted-foreground">Segmentação por faixas de gasto (baseada na mesma base do RFV)</p>
      </div>

      {/* De-Para RFV → NBO */}
      <Card className="mb-8 border-blue-500/20 bg-blue-500/5">
        <CardContent className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-500" />
            <h3 className="text-sm font-bold text-foreground">Como funciona: RFV → Next Best Offer</h3>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            O NBO reutiliza a base de clientes já enviada no <strong>Passo 2 (RFV)</strong>. O campo <strong>Valor</strong> (gasto acumulado) é usado para classificar cada cliente em uma faixa de gasto, gerando ofertas de upgrade personalizadas.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { faixa: 'Bronze', range: 'Valor até R$ 500', arrow: 'Cupom 15% p/ subir a Prata' },
              { faixa: 'Prata', range: 'R$ 501 a R$ 2.000', arrow: 'Frete grátis + 10% p/ subir a Ouro' },
              { faixa: 'Ouro', range: 'R$ 2.001 a R$ 5.000', arrow: 'Cashback 5% p/ subir a Diamante' },
              { faixa: 'Diamante', range: 'Acima de R$ 5.000', arrow: 'Programa de embaixadores' },
            ].map((item) => (
              <div key={item.faixa} className="rounded-lg border bg-background p-3">
                <div className="mb-1 flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: faixaColors[item.faixa] }} />
                  <span className="text-sm font-bold text-foreground">{item.faixa}</span>
                </div>
                <p className="mb-1 text-xs text-muted-foreground">{item.range}</p>
                <div className="flex items-center gap-1 text-xs text-primary">
                  <ArrowRight className="h-3 w-3" />
                  <span>{item.arrow}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedFaixa && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filtro ativo:</span>
          <Badge className="cursor-pointer gap-1 text-sm" style={{ backgroundColor: faixaColors[selectedFaixa], color: '#fff' }} onClick={() => setSelectedFaixa(null)}>
            {selectedFaixa} <X className="h-3 w-3" />
          </Badge>
        </div>
      )}

      {/* KPIs */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {[
          { icon: Users, label: 'Total de Clientes', value: totalClients.toLocaleString('pt-BR') },
          { icon: DollarSign, label: 'Valor Médio (Gasto)', value: `R$ ${avgGasto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
          { icon: Clock, label: 'Recência Média', value: `${avgRecencia.toFixed(0)} dias` },
        ].map((kpi, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-accent p-3"><kpi.icon className="h-6 w-6 text-primary" /></div>
              <div>
                <p className="text-sm text-muted-foreground">{kpi.label}</p>
                <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição por Faixa</CardTitle>
            <p className="text-xs text-muted-foreground">Clique em uma barra para filtrar</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={faixaCounts} onClick={(data: any) => { if (data?.activePayload?.[0]?.payload?.name) toggleFaixa(data.activePayload[0].payload.name); }} className="cursor-pointer">
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip formatter={(v: number) => [`${v} clientes`, 'Quantidade']} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {faixaCounts.map((entry, i) => (
                    <Cell key={i} fill={entry.color} opacity={selectedFaixa && selectedFaixa !== entry.name ? 0.3 : 1} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Composição da Base (%)</CardTitle>
            <p className="text-xs text-muted-foreground">Clique em uma fatia para filtrar</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={faixaCounts.filter(c => c.count > 0)} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90}
                  label={({ name, pct }) => `${name}: ${pct}%`} labelLine
                  onClick={(_: any, index: number) => { const visible = faixaCounts.filter(c => c.count > 0); if (visible[index]) toggleFaixa(visible[index].name); }}
                  className="cursor-pointer">
                  {faixaCounts.filter(c => c.count > 0).map((entry, i) => (
                    <Cell key={i} fill={entry.color} opacity={selectedFaixa && selectedFaixa !== entry.name ? 0.3 : 1} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [`${v} clientes`, 'Quantidade']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Faixa Cards */}
      <h2 className="mb-4 text-xl font-bold text-foreground">Faixas de Gasto</h2>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {faixaCounts.map((faixa) => (
          <Card key={faixa.name}
            className={`cursor-pointer overflow-hidden transition-all hover:shadow-md ${selectedFaixa === faixa.name ? 'ring-2 ring-offset-2' : ''} ${selectedFaixa && selectedFaixa !== faixa.name ? 'opacity-50' : ''}`}
            onClick={() => toggleFaixa(faixa.name)}>
            <div className="h-1.5" style={{ backgroundColor: faixa.color }} />
            <CardContent className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">{faixa.name}</h3>
                <Badge variant="secondary" className="text-xs">{faixa.pct}%</Badge>
              </div>
              <p className="mb-3 text-2xl font-bold text-foreground">{faixa.count}</p>
              <p className="text-xs text-muted-foreground">{faixaActions[faixa.name]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Action Plan */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <CardTitle className="text-base">Plano de Ação</CardTitle>
              {selectedFaixa ? (
                <Badge style={{ backgroundColor: faixaColors[selectedFaixa], color: '#fff' }}>{selectedFaixa}</Badge>
              ) : (
                <Select value={filterFaixa} onValueChange={setFilterFaixa}>
                  <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todas as faixas</SelectItem>
                    {allFaixaNames.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
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
                      <TableHead className="min-w-[100px]">Faixa</TableHead>
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
                    {clustersToShow.map(name => {
                      const plans = faixa5W2H[name] || [];
                      return plans.map((p, i) => (
                        <TableRow key={`${name}-${i}`}>
                          {i === 0 && (
                            <TableCell rowSpan={plans.length} className="align-top">
                              <Badge variant="outline" className="text-xs whitespace-nowrap" style={{ borderColor: faixaColors[name], color: faixaColors[name] }}>{name}</Badge>
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
                {clustersToShow.map(name => {
                  const matrix = faixaEisenhower[name]; if (!matrix) return null;
                  return (
                    <div key={name}>
                      {clustersToShow.length > 1 && <div className="mb-3"><Badge variant="outline" className="text-xs" style={{ borderColor: faixaColors[name], color: faixaColors[name] }}>{name}</Badge></div>}
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
            <CardTitle className="text-base">Dados dos Clientes{selectedFaixa && <span className="ml-2 text-sm font-normal text-muted-foreground">({filtered.length} de {totalClients})</span>}</CardTitle>
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
                <TableHead>Nome</TableHead><TableHead>ID</TableHead>
                <TableHead className="text-center">Valor (Gasto)</TableHead>
                <TableHead className="text-center">Frequência</TableHead>
                <TableHead className="text-center">Recência</TableHead>
                <TableHead>Faixa</TableHead><TableHead>Oferta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.map((c) => (
                <TableRow key={c.id_cliente}>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{c.id_cliente}</TableCell>
                  <TableCell className="text-center">R$ {c.gasto_total.toLocaleString('pt-BR')}</TableCell>
                  <TableCell className="text-center">{c.frequencia}</TableCell>
                  <TableCell className="text-center">{c.recencia}d</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs whitespace-nowrap" style={{ borderColor: faixaColors[c.faixa], color: faixaColors[c.faixa] }}>{c.faixa}</Badge></TableCell>
                  <TableCell className="max-w-[200px] text-xs text-muted-foreground">{c.oferta}</TableCell>
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

function EisenhowerQuadrant({ title, subtitle, items, borderClass, bgClass, titleClass }: {
  title: string; subtitle: string; items: string[]; borderClass: string; bgClass: string; titleClass: string;
}) {
  return (
    <div className={`rounded-lg border ${borderClass} ${bgClass} p-4`}>
      <p className={`mb-1 text-sm font-bold ${titleClass}`}>{title}</p>
      <p className="mb-3 text-xs text-muted-foreground">{subtitle}</p>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-foreground">
            <Checkbox className="mt-0.5 h-3.5 w-3.5" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default NBODashboard;
