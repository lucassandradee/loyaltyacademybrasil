import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Users, DollarSign, ShoppingCart, ArrowLeft, Search, Settings2 } from 'lucide-react';
import { ClientData, RFVParams, ScoredClient, scoreClients, allClusterNames, clusterColors, clusterActions } from '@/lib/rfv-logic';

const RFVDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { clientData: ClientData[]; params: RFVParams } | null;
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const perPage = 10;

  const scored = useMemo(() => {
    if (!state) return [];
    return scoreClients(state.clientData, state.params);
  }, [state]);

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

  const filtered = useMemo(() => {
    if (!search) return scored;
    const q = search.toLowerCase();
    return scored.filter(c => c.nome.toLowerCase().includes(q) || c.id_cliente.includes(q) || c.cluster.toLowerCase().includes(q));
  }, [scored, search]);

  const pageCount = Math.ceil(filtered.length / perPage);
  const pageData = filtered.slice(page * perPage, (page + 1) * perPage);

  if (!state) {
    navigate('/rfv');
    return null;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard RFV</h1>
          <p className="text-muted-foreground">Análise completa da segmentação de clientes</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/rfv/parametros', { state: { clientData: state.clientData } })}>
          <Settings2 className="mr-2 h-4 w-4" /> Ajustar Parâmetros
        </Button>
      </div>

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

      {/* Charts */}
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição por Cluster</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={clusterCounts} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => [`${v} clientes`, 'Quantidade']} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {clusterCounts.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Composição da Base (%)</CardTitle>
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
                >
                  {clusterCounts.filter(c => c.count > 0).map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
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
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {clusterCounts.map((cluster) => (
          <Card key={cluster.name} className="overflow-hidden">
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

      {/* Analysis */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-base">Análise da Base</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">{analysisText}</p>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle className="text-base">Dados dos Clientes</CardTitle>
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
        <Button variant="ghost" onClick={() => navigate('/rfv/parametros', { state: { clientData: state.clientData } })}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Parametrização
        </Button>
      </div>
    </div>
  );
};

export default RFVDashboard;
