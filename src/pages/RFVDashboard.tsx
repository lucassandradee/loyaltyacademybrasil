import { useMemo, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Users, DollarSign, ShoppingCart, ArrowLeft, Search, Settings2, X } from 'lucide-react';
import { ClientData, RFVParams, RFVPercentileParams, defaultPercentileParams, scoreClients, allClusterNames, clusterColors, clusterActions } from '@/lib/rfv-logic';
import ActionPlanTabs from '@/components/rfv/ActionPlanTabs';
import { supabase } from '@/integrations/supabase/client';

const RFVDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const locState = location.state as { clientData: ClientData[]; params: RFVParams } | null;
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
  const params = locState?.params || defaultParams;

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

  const handlePieClick = (_: any, index: number) => {
    const visibleClusters = clusterCounts.filter(c => c.count > 0);
    if (visibleClusters[index]) {
      toggleCluster(visibleClusters[index].name);
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
          <h1 className="text-3xl font-bold text-foreground">Dashboard RFV</h1>
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
          { icon: DollarSign, label: 'Ticket Médio Global', value: `R$ ${avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
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
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição por Cluster</CardTitle>
            <p className="text-xs text-muted-foreground">Clique em uma barra para filtrar</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={clusterCounts} layout="vertical" margin={{ left: 20 }} onClick={handleBarClick} className="cursor-pointer">
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 12 }} />
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Composição da Base (%)</CardTitle>
            <p className="text-xs text-muted-foreground">Clique em uma fatia para filtrar</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={clusterCounts.filter(c => c.count > 0)}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, pct }) => `${name}: ${pct}%`}
                  labelLine
                  onClick={handlePieClick}
                  className="cursor-pointer"
                >
                  {clusterCounts.filter(c => c.count > 0).map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.color}
                      opacity={selectedCluster && selectedCluster !== entry.name ? 0.3 : 1}
                      stroke={selectedCluster === entry.name ? '#fff' : 'none'}
                      strokeWidth={selectedCluster === entry.name ? 3 : 0}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [`${v} clientes`, 'Quantidade']} />
              </PieChart>
            </ResponsiveContainer>
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

      {/* Action Plan */}
      <ActionPlanTabs selectedCluster={selectedCluster} />

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
