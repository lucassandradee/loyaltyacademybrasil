import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cluster5W2H, clusterEisenhower, clusterColors } from '@/lib/rfv-logic';

interface ActionPlanTabsProps {
  selectedCluster: string;
}

const ActionPlanTabs = ({ selectedCluster }: ActionPlanTabsProps) => {
  const plans = cluster5W2H[selectedCluster] || [];
  const matrix = clusterEisenhower[selectedCluster];

  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex items-center gap-3">
          <CardTitle className="text-base">Plano de Ação</CardTitle>
          <Badge style={{ backgroundColor: clusterColors[selectedCluster], color: '#fff' }}>
            {selectedCluster}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="5w2h">
          <TabsList>
            <TabsTrigger value="5w2h">5W2H</TabsTrigger>
            <TabsTrigger value="eisenhower">Matriz de Eisenhower</TabsTrigger>
          </TabsList>

          <TabsContent value="5w2h">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[140px]">O quê (What)</TableHead>
                    <TableHead className="min-w-[160px]">Por quê (Why)</TableHead>
                    <TableHead className="min-w-[120px]">Onde (Where)</TableHead>
                    <TableHead className="min-w-[120px]">Quando (When)</TableHead>
                    <TableHead className="min-w-[120px]">Quem (Who)</TableHead>
                    <TableHead className="min-w-[160px]">Como (How)</TableHead>
                    <TableHead className="min-w-[140px]">Quanto (How Much)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{p.what}</TableCell>
                      <TableCell>{p.why}</TableCell>
                      <TableCell>{p.where}</TableCell>
                      <TableCell>{p.when}</TableCell>
                      <TableCell>{p.who}</TableCell>
                      <TableCell>{p.how}</TableCell>
                      <TableCell>{p.howMuch}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="eisenhower">
            {matrix && (
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border-2 border-destructive/30 bg-destructive/5 p-4">
                  <h4 className="mb-3 text-sm font-bold text-destructive">🔴 Urgente + Importante</h4>
                  <p className="mb-2 text-xs text-muted-foreground">Fazer agora</p>
                  <ul className="space-y-2">
                    {matrix.urgentImportant.map((item, i) => (
                      <li key={i} className="text-sm text-foreground">• {item}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4">
                  <h4 className="mb-3 text-sm font-bold text-primary">🔵 Não Urgente + Importante</h4>
                  <p className="mb-2 text-xs text-muted-foreground">Agendar</p>
                  <ul className="space-y-2">
                    {matrix.notUrgentImportant.map((item, i) => (
                      <li key={i} className="text-sm text-foreground">• {item}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-lg border-2 border-amber-500/30 bg-amber-500/5 p-4">
                  <h4 className="mb-3 text-sm font-bold text-amber-600">🟡 Urgente + Não Importante</h4>
                  <p className="mb-2 text-xs text-muted-foreground">Delegar</p>
                  <ul className="space-y-2">
                    {matrix.urgentNotImportant.map((item, i) => (
                      <li key={i} className="text-sm text-foreground">• {item}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-lg border-2 border-muted-foreground/30 bg-muted/50 p-4">
                  <h4 className="mb-3 text-sm font-bold text-muted-foreground">⚪ Não Urgente + Não Importante</h4>
                  <p className="mb-2 text-xs text-muted-foreground">Eliminar ou adiar</p>
                  <ul className="space-y-2">
                    {matrix.notUrgentNotImportant.map((item, i) => (
                      <li key={i} className="text-sm text-foreground">• {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ActionPlanTabs;
