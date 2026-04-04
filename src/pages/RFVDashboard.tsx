import { useMemo, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Users, DollarSign, ShoppingCart, Clock, ArrowLeft, Search, Settings2, X } from 'lucide-react';
import { ClientData, RFVParams, RFVPercentileParams, defaultPercentileParams, scoreClients, allClusterNames, clusterColors, clusterActions, clusterMap } from '@/lib/rfv-logic';

import { supabase } from '@/integrations/supabase/client';

const RFVDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const locState = location.state as { clientData: ClientData[]; params: RFVParams | RFVPercentileParams } | null;
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const [dbData, setDbData] = useState<ClientData[] | null>(null);
  const [loading, setLoading] = useState(!locState);
  const perPage = 10;

  useEffect(() => {
    if (locState) return;
    const fetchFromDB = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) { navigate('/rfv'); return; }
      const { data } = await supabase
        .from('rfv_uploads')
        .select('client_data')
        .eq('user_id', session.session.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data?.client_data) {
        setDbData(data.client_data as unknown as ClientData[]);
      } else {
        navigate('/rfv');
      }
      setLoading(false);
    };
    fetchFromDB();
  }, [locState, navigate]);

  const clientData = locState?.clientData || dbData;
  const params = locState?.params || defaultPercentileParams(3);

  const scored = useMemo(() => {
    if (!clientData) return [];
    return scoreClients(clientData, params);
  }, [clientData, params]);

  const totalClients = scored.length;
  const avgTicket = totalClients > 0 ? scored.reduce((s, c) => s + c.valor, 0) / totalClients : 0;
  const avgFreq = totalClients > 0 ? scored.reduce((s, c) => s + c.frequencia, 0) / totalClients : 0;

  const clusterCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allClusterNames.forEach(n => counts[n] = 0);
    scored.forEach(c => { counts[c.cluster] = (counts[c.cluster] || 0) + 1; });
    return allClusterNames.map(name => ({
      name,
      count: counts[name],
      pct: totalClients > 0 ? ((counts[name] / totalClients) * 100).toFixed(1) : '0',
      color: clusterColors[name],
    }));
  }, [scored, totalClients]);

  const analysisText = useMemo(() => {
    if (totalClients === 0) return '';
    const sorted = [...clusterCounts].sort((a, b) => b.count - a.count);
    const top = sorted[0];
    const champions = clusterCounts.find(c => c.name === 'Campeão');
    const hibernating = clusterCounts.find(c => c.name === 'Hibernando');

    let text = `Sua base tem uma concentração de ${top.pct}% em clientes "${top.name}". `;
    if (top.name === 'Hibernando' || top.name === 'Em risco') {
      text += 'Isso indica um problema de retenção que precisa de atenção imediata. ';
    } else if (top.name === 'Campeão' || top.name === 'Fidelizado') {
      text += 'Isso é um excelente sinal — sua base tem alta qualidade. ';
    }
    if (champions && champions.count > 0) {
      text += `Os ${champions.pct}% de Campeões devem ser protegidos com benefícios exclusivos. `;
    }
    if (hibernating && hibernating.count > 0 && Number(hibernating.pct) > 20) {
      text += `Atenção: ${hibernating.pct}% da base está Hibernando — considere campanhas agressivas de reativação.`;
    }
    return text;
  }, [clusterCounts, totalClients]);

  const toggleCluster = (name: string) => {
    setSelectedCluster(prev => prev === name ? null : name);
    setPage(0);
  };

  const filtered = useMemo(() => {
    let list = scored;
    if (selectedCluster) {
      list = list.filter(c => c.cluster === selectedCluster);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c => c.nome.toLowerCase().includes(q) || c.id_cliente.includes(q) || c.cluster.toLowerCase().includes(q));
    }
    return list;
  }, [scored, search, selectedCluster]);

  const pageCount = Math.ceil(filtered.length / perPage);
  const pageData = filtered.slice(page * perPage, (page + 1) * perPage);

  const handleBarClick = (data: any) => {
    if (data?.activePayload?.[0]?.payload?.name) {
      toggleCluster(data.activePayload[0].payload.name);
    }
  };


  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">Carregando dados...</div>;
  }

  if (!clientData) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Análise RFV</h1>
          <p className="text-muted-foreground">Análise completa da segmentação de clientes</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/rfv/parametros', { state: { clientData } })}>
          <Settings2 className="mr-2 h-4 w-4" /> Ajustar Parâmetros
        </Button>
      </div>

      {/* Active filter badge */}
      {selectedCluster && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filtro ativo:</span>
          <Badge
            className="cursor-pointer gap-1 text-sm"
            style={{ backgroundColor: clusterColors[selectedCluster], color: '#fff' }}
            onClick={() => setSelectedCluster(null)}
          >
            {selectedCluster} <X className="h-3 w-3" />
          </Badge>
        </div>
      )}

      {/* KPIs */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {[
          { icon: Users, label: 'Total de Clientes', value: totalClients.toLocaleString('pt-BR') },
          { icon: DollarSign, label: 'Valor monetário médio por cliente', value: `R$ ${avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
          { icon: ShoppingCart, label: 'Frequência Média', value: avgFreq.toFixed(1) + ' compras' },
        ].map((kpi, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-accent p-3">
                <kpi.icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{kpi.label}</p>
                <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Analysis */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-base">Análise da Base</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">{analysisText}</p>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="text-base">Distribuição por Cluster</CardTitle>
              <p className="text-xs text-muted-foreground">Clique em uma barra para filtrar</p>
            </div>
          </CardHeader>
          <CardContent>
            <Dialog>
              <div className="flex gap-6 items-start">
                <div className="flex-1 min-w-0">
                  <ResponsiveContainer width="100%" height={310}>
                    <BarChart data={clusterCounts} layout="vertical" margin={{ left: 10, top: 5, bottom: 5, right: 10 }} onClick={handleBarClick} className="cursor-pointer">
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [`${v} clientes`, 'Quantidade']} />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {clusterCounts.map((entry, i) => (
                          <Cell
                            key={i}
                            fill={entry.color}
                            opacity={selectedCluster && selectedCluster !== entry.name ? 0.3 : 1}
                            stroke={selectedCluster === entry.name ? entry.color : 'none'}
                            strokeWidth={selectedCluster === entry.name ? 3 : 0}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {/* Desktop: mini regras clicável */}
                <DialogTrigger asChild>
                  <div className="hidden lg:flex lg:flex-col w-[324px] shrink-0 rounded-md border bg-muted/30 p-2 cursor-pointer hover:bg-muted/50 transition-colors mt-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Regras</p>
                      <span className="text-[8px] text-muted-foreground">clique para expandir</span>
                    </div>
                    <div className="space-y-1">
                      {(() => {
                        const grouped: Record<string, string[]> = {};
                        Object.entries(clusterMap).forEach(([code, name]) => {
                          if (!grouped[name]) grouped[name] = [];
                          grouped[name].push(code);
                        });
                        const scoreColor = (s: string) =>
                          s === '3' ? 'bg-emerald-500 text-white' :
                          s === '2' ? 'bg-orange-400 text-white' :
                          'bg-muted text-muted-foreground';
                        return allClusterNames.map(name => {
                          const codes = grouped[name];
                          if (!codes) return null;
                          const availableWidth = 324 - 16 - 4 - 12 - 70 - 12;
                          const codeWidth = 3 * 14 + 4 + 6;
                          const maxCodes = Math.max(1, Math.floor(availableWidth / codeWidth));
                          const visible = codes.slice(0, maxCodes);
                          const remaining = codes.length - maxCodes;
                          return (
                            <div key={name} className="flex items-center gap-1.5 overflow-hidden">
                              <div className="w-0.5 h-3 rounded-full shrink-0" style={{ backgroundColor: clusterColors[name] }} />
                              <span className="text-[9px] font-medium text-foreground truncate min-w-[70px] max-w-[70px]">{name}</span>
                              <div className="flex gap-1 shrink-0 overflow-hidden flex-nowrap">
                                {visible.map(code => (
                                  <span key={code} className="inline-flex gap-px rounded border border-gray-400 px-0.5 py-0.5 shrink-0">
                                    {code.split('').map((s, i) => (
                                      <span key={i} className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded text-[7px] font-bold ${scoreColor(s)}`}>{s}</span>
                                    ))}
                                  </span>
                                ))}
                                {remaining > 0 && (
                                  <span className="text-[8px] text-muted-foreground font-medium shrink-0">…+{remaining}</span>
                                )}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </DialogTrigger>
                {/* Mobile: botão */}
                <DialogTrigger asChild>
                  <button className="lg:hidden flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors shrink-0">
                    <Settings2 className="h-3.5 w-3.5" /> Regras
                  </button>
                </DialogTrigger>
              </div>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Regras de Classificação</DialogTitle>
                </DialogHeader>
                <div className="space-y-1.5">
                  {(() => {
                    const grouped: Record<string, string[]> = {};
                    Object.entries(clusterMap).forEach(([code, name]) => {
                      if (!grouped[name]) grouped[name] = [];
                      grouped[name].push(code);
                    });
                    const scoreColor = (s: string) =>
                      s === '3' ? 'bg-emerald-500 text-white' :
                      s === '2' ? 'bg-orange-400 text-white' :
                      'bg-muted text-muted-foreground';
                    return allClusterNames.map(name => {
                      const codes = grouped[name];
                      if (!codes) return null;
                      return (
                        <div key={name} className="flex items-center gap-2 rounded border px-2 py-1" style={{ borderLeftWidth: 3, borderLeftColor: clusterColors[name] }}>
                          <span className="text-xs font-semibold text-foreground min-w-[120px]">{name}</span>
                          <div className="flex flex-wrap gap-1">
                            {codes.map(code => (
                              <span key={code} className="inline-flex gap-px rounded border border-gray-400 px-0.5 py-0.5">
                                {code.split('').map((s, i) => (
                                  <span key={i} className={`inline-flex h-4 w-4 items-center justify-center rounded text-[9px] font-bold ${scoreColor(s)}`}>{s}</span>
                                ))}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      {/* Cluster Cards */}
      <h2 className="mb-4 text-xl font-bold text-foreground">Segmentos de Clientes</h2>
      <p className="mb-4 text-xs text-muted-foreground">Clique em um segmento para filtrar e ver o plano de ação</p>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {clusterCounts.map((cluster) => (
          <Card
            key={cluster.name}
            className={`cursor-pointer overflow-hidden transition-all hover:shadow-md ${selectedCluster === cluster.name ? 'ring-2 ring-offset-2' : ''} ${selectedCluster && selectedCluster !== cluster.name ? 'opacity-50' : ''}`}
            style={selectedCluster === cluster.name ? { ringColor: cluster.color } as any : undefined}
            onClick={() => toggleCluster(cluster.name)}
          >
            <div className="h-1.5" style={{ backgroundColor: cluster.color }} />
            <CardContent className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">{cluster.name}</h3>
                <Badge variant="secondary" className="text-xs">{cluster.pct}%</Badge>
              </div>
              <p className="mb-3 text-2xl font-bold text-foreground">{cluster.count}</p>
              <p className="text-xs text-muted-foreground">{clusterActions[cluster.name]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle className="text-base">
              Dados dos Clientes
              {selectedCluster && <span className="ml-2 text-sm font-normal text-muted-foreground">({filtered.length} de {totalClients})</span>}
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, ID ou cluster..."
                className="pl-9"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(0); }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>ID</TableHead>
                <TableHead className="text-center">Recência</TableHead>
                <TableHead className="text-center">Frequência</TableHead>
                <TableHead className="text-center">Valor</TableHead>
                <TableHead className="text-center">R</TableHead>
                <TableHead className="text-center">F</TableHead>
                <TableHead className="text-center">V</TableHead>
                <TableHead>Cluster</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.map((c) => (
                <TableRow key={c.id_cliente}>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{c.id_cliente}</TableCell>
                  <TableCell className="text-center">{c.recencia}d</TableCell>
                  <TableCell className="text-center">{c.frequencia}x</TableCell>
                  <TableCell className="text-center">R$ {c.valor.toLocaleString('pt-BR')}</TableCell>
                  <TableCell className="text-center font-bold">{c.r_score}</TableCell>
                  <TableCell className="text-center font-bold">{c.f_score}</TableCell>
                  <TableCell className="text-center font-bold">{c.v_score}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="text-xs whitespace-nowrap"
                      style={{ borderColor: clusterColors[c.cluster], color: clusterColors[c.cluster] }}
                    >
                      {c.cluster}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {pageCount > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</Button>
              <span className="text-sm text-muted-foreground">
                Página {page + 1} de {pageCount}
              </span>
              <Button variant="outline" size="sm" disabled={page >= pageCount - 1} onClick={() => setPage(page + 1)}>Próxima</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6">
        <Button variant="ghost" onClick={() => navigate('/rfv/parametros', { state: { clientData } })}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Parametrização
        </Button>
      </div>
    </div>
  );
};

export default RFVDashboard;
