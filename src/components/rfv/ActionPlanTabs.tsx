import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Download } from 'lucide-react';
import { cluster5W2H, clusterEisenhower, clusterColors, allClusterNames } from '@/lib/rfv-logic';
import * as XLSX from 'xlsx';

interface ActionPlanTabsProps {
  selectedCluster: string | null;
}

const ALL_FILTER = 'Todos';

const ActionPlanTabs = ({ selectedCluster }: ActionPlanTabsProps) => {
  const [filterCluster, setFilterCluster] = useState(ALL_FILTER);

  // Determine which clusters to show
  const activeFilter = selectedCluster || filterCluster;
  const clustersToShow = activeFilter === ALL_FILTER ? allClusterNames : [activeFilter];

  const handleDownloadExcel = () => {
    const wb = XLSX.utils.book_new();

    // 5W2H sheet
    const w2hRows: any[] = [];
    clustersToShow.forEach(name => {
      const plans = cluster5W2H[name] || [];
      plans.forEach(p => {
        w2hRows.push({
          'Segmento': name,
          'O quê (What)': p.what,
          'Por quê (Why)': p.why,
          'Onde (Where)': p.where,
          'Quando (When)': p.when,
          'Quem (Who)': p.who,
          'Como (How)': p.how,
          'Quanto (How Much)': p.howMuch,
        });
      });
    });
    const ws1 = XLSX.utils.json_to_sheet(w2hRows);
    ws1['!cols'] = [{ wch: 25 }, { wch: 35 }, { wch: 35 }, { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 40 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, ws1, '5W2H');

    // Eisenhower sheet
    const eRows: any[] = [];
    clustersToShow.forEach(name => {
      const m = clusterEisenhower[name];
      if (!m) return;
      const addItems = (quadrant: string, items: string[]) => {
        items.forEach(item => {
          eRows.push({ 'Segmento': name, 'Quadrante': quadrant, 'Ação': item });
        });
      };
      addItems('🔴 Urgente + Importante', m.urgentImportant);
      addItems('🔵 Não Urgente + Importante', m.notUrgentImportant);
      addItems('🟡 Urgente + Não Importante', m.urgentNotImportant);
      addItems('⚪ Não Urgente + Não Importante', m.notUrgentNotImportant);
    });
    const ws2 = XLSX.utils.json_to_sheet(eRows);
    ws2['!cols'] = [{ wch: 25 }, { wch: 35 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'Matriz Eisenhower');

    XLSX.writeFile(wb, 'plano-de-acao-rfv.xlsx');
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <CardTitle className="text-base">Plano de Ação</CardTitle>
            {selectedCluster ? (
              <Badge style={{ backgroundColor: clusterColors[selectedCluster], color: '#fff' }}>
                {selectedCluster}
              </Badge>
            ) : (
              <Select value={filterCluster} onValueChange={setFilterCluster}>
                <SelectTrigger className="w-[240px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER}>Todos os segmentos</SelectItem>
                  {allClusterNames.map(name => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={handleDownloadExcel}>
            <Download className="mr-2 h-4 w-4" /> Baixar Excel
          </Button>
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
                    <TableHead className="min-w-[120px]">Segmento</TableHead>
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
                  {clustersToShow.map(clusterName => {
                    const plans = cluster5W2H[clusterName] || [];
                    return plans.map((p, i) => (
                      <TableRow key={`${clusterName}-${i}`}>
                        {i === 0 && (
                          <TableCell rowSpan={plans.length} className="align-top">
                            <Badge
                              variant="outline"
                              className="text-xs whitespace-nowrap"
                              style={{ borderColor: clusterColors[clusterName], color: clusterColors[clusterName] }}
                            >
                              {clusterName}
                            </Badge>
                          </TableCell>
                        )}
                        <TableCell className="font-medium">{p.what}</TableCell>
                        <TableCell>{p.why}</TableCell>
                        <TableCell>{p.where}</TableCell>
                        <TableCell>{p.when}</TableCell>
                        <TableCell>{p.who}</TableCell>
                        <TableCell>{p.how}</TableCell>
                        <TableCell>{p.howMuch}</TableCell>
                      </TableRow>
                    ));
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="eisenhower">
            <div className="space-y-6">
              {clustersToShow.map(clusterName => {
                const matrix = clusterEisenhower[clusterName];
                if (!matrix) return null;
                return (
                  <div key={clusterName}>
                    {clustersToShow.length > 1 && (
                      <div className="mb-3">
                        <Badge
                          variant="outline"
                          className="text-xs"
                          style={{ borderColor: clusterColors[clusterName], color: clusterColors[clusterName] }}
                        >
                          {clusterName}
                        </Badge>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <EisenhowerQuadrant
                        title="🔴 Urgente + Importante"
                        subtitle="Fazer agora"
                        items={matrix.urgentImportant}
                        borderClass="border-destructive/30"
                        bgClass="bg-destructive/5"
                        titleClass="text-destructive"
                      />
                      <EisenhowerQuadrant
                        title="🔵 Não Urgente + Importante"
                        subtitle="Agendar"
                        items={matrix.notUrgentImportant}
                        borderClass="border-primary/30"
                        bgClass="bg-primary/5"
                        titleClass="text-primary"
                      />
                      <EisenhowerQuadrant
                        title="🟡 Urgente + Não Importante"
                        subtitle="Delegar"
                        items={matrix.urgentNotImportant}
                        borderClass="border-amber-500/30"
                        bgClass="bg-amber-500/5"
                        titleClass="text-amber-600"
                      />
                      <EisenhowerQuadrant
                        title="⚪ Não Urgente + Não Importante"
                        subtitle="Eliminar ou adiar"
                        items={matrix.notUrgentNotImportant}
                        borderClass="border-muted-foreground/30"
                        bgClass="bg-muted/50"
                        titleClass="text-muted-foreground"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

function EisenhowerQuadrant({ title, subtitle, items, borderClass, bgClass, titleClass }: {
  title: string; subtitle: string; items: string[];
  borderClass: string; bgClass: string; titleClass: string;
}) {
  return (
    <div className={`rounded-lg border-2 ${borderClass} ${bgClass} p-4`}>
      <h4 className={`mb-3 text-sm font-bold ${titleClass}`}>{title}</h4>
      <p className="mb-2 text-xs text-muted-foreground">{subtitle}</p>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-foreground">
            <Checkbox id={`${title}-${i}`} className="mt-0.5" />
            <label htmlFor={`${title}-${i}`} className="cursor-pointer leading-tight">{item}</label>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ActionPlanTabs;
