import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, RefreshCw, FileText, Shield, Target, Lightbulb, Award, Calendar, ListChecks, DollarSign, Megaphone, Settings, Users, ChevronLeft, ChevronRight, LayoutGrid, BookOpen, Filter, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { generateRFVSummary, scoreClients, defaultPercentileParams } from '@/lib/rfv-logic';
import { generateNBOSummary, classifyNBO } from '@/lib/nbo-logic';
import { generateCXSummary } from '@/lib/cx-logic';
import type { ClientData } from '@/lib/rfv-logic';
import type { CXTicket } from '@/lib/cx-logic';
import { cn } from '@/lib/utils';
import { parseDiagrams, DiagramRenderer, type ParsedDiagram } from '@/components/plan/DiagramRenderer';


interface PlanSection {
  id: string;
  title: string;
  content: string;
}

const sectionIcons: Record<string, any> = {
  sumario: FileText, maturidade: Shield, objetivos: Target, estrutura: Lightbulb,
  estrategia: Award, beneficios: Award, segmentacao: Users, canais: Megaphone,
  operacoes: Settings, custos: DollarSign, cronograma: Calendar, plano5w2h: ListChecks, plano: FileText,
};

const sectionColors: Record<string, string> = {
  sumario: 'border-l-blue-600', maturidade: 'border-l-indigo-600', objetivos: 'border-l-violet-600',
  estrutura: 'border-l-purple-600', estrategia: 'border-l-fuchsia-600', beneficios: 'border-l-pink-600',
  segmentacao: 'border-l-rose-600', canais: 'border-l-orange-600', operacoes: 'border-l-amber-600',
  custos: 'border-l-yellow-600', cronograma: 'border-l-lime-600', plano5w2h: 'border-l-emerald-600',
};

const areaBadgeColors: Record<string, string> = {
  'RFV': 'bg-blue-100 text-blue-800 border-blue-200',
  'NBO': 'bg-purple-100 text-purple-800 border-purple-200',
  'CX': 'bg-orange-100 text-orange-800 border-orange-200',
  'Estratégico': 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

const timelineColors = [
  { bg: 'bg-blue-500', light: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
  { bg: 'bg-violet-500', light: 'bg-violet-50 border-violet-200', text: 'text-violet-700' },
  { bg: 'bg-emerald-500', light: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
  { bg: 'bg-amber-500', light: 'bg-amber-50 border-amber-200', text: 'text-amber-700' },
  { bg: 'bg-rose-500', light: 'bg-rose-50 border-rose-200', text: 'text-rose-700' },
  { bg: 'bg-cyan-500', light: 'bg-cyan-50 border-cyan-200', text: 'text-cyan-700' },
];

// ─── Markdown helpers ───

function markdownToHtml(md: string): string {
  if (!md) return '';
  if (md.trim().startsWith('{') || md.trim().startsWith('```json')) return '<p><em>Conteúdo sendo processado...</em></p>';

  let html = md
    .replace(/^#### (.+)$/gm, '<h4 class="mt-4 mb-2 text-sm font-semibold text-foreground flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-primary inline-block"></span>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3 class="mt-5 mb-2 text-base font-semibold text-foreground border-b pb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="mt-6 mb-3 text-lg font-bold text-foreground flex items-center gap-2"><span class="w-2 h-5 rounded bg-primary inline-block"></span>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-foreground">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Tables
  const tableRegex = /(\|.+\|(?:\r?\n)?)+/g;
  html = html.replace(tableRegex, (tableBlock) => {
    const rows = tableBlock.trim().split('\n').filter(r => r.trim());
    if (rows.length < 2) return tableBlock;
    const isSepar = (r: string) => /^\|[\s-:]+\|$/.test(r.trim().replace(/\|/g, '|'));
    const dataRows = rows.filter(r => !isSepar(r));
    if (dataRows.length === 0) return '';
    const parse = (r: string) => r.split('|').slice(1, -1).map(c => c.trim());
    const headerCells = parse(dataRows[0]);
    const bodyRows = dataRows.slice(1);
    let t = '<div class="overflow-x-auto my-4 rounded-lg border"><table class="w-full text-sm"><thead><tr>';
    headerCells.forEach(c => { t += `<th class="px-3 py-2.5 text-left font-semibold bg-primary/10 text-foreground border-b">${c}</th>`; });
    t += '</tr></thead><tbody>';
    bodyRows.forEach((r, i) => {
      const cells = parse(r);
      const stripe = i % 2 === 0 ? 'bg-card' : 'bg-muted/30';
      t += `<tr class="${stripe} hover:bg-muted/50 transition-colors">`;
      cells.forEach((c, ci) => {
        const areaMatch = ci === 0 && areaBadgeColors[c];
        if (areaMatch) {
          t += `<td class="px-3 py-2 border-b"><span class="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${areaBadgeColors[c]}">${c}</span></td>`;
        } else {
          t += `<td class="px-3 py-2 border-b text-muted-foreground">${c}</td>`;
        }
      });
      t += '</tr>';
    });
    t += '</tbody></table></div>';
    return t;
  });

  html = html
    .replace(/^- (.+)$/gm, '<li class="flex items-start gap-2 mb-1.5"><span class="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0"></span><span>$1</span></li>')
    .replace(/^• (.+)$/gm, '<li class="flex items-start gap-2 mb-1.5"><span class="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0"></span><span>$1</span></li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="mb-1.5 ml-4 list-decimal">$1</li>')
    .replace(/\n\n/g, '</p><p class="mb-3 leading-relaxed">')
    .replace(/\n/g, '<br/>');

  html = html.replace(/(<li[\s\S]*?<\/li>(?:<br\/>)?)+/g, (m) => '<ul class="my-3 space-y-1">' + m.replace(/<br\/>/g, '') + '</ul>');
  return '<div class="space-y-1"><p class="mb-3 leading-relaxed">' + html + '</p></div>';
}

function extractSummary(md: string, maxLen = 180): string {
  if (!md) return '';
  const plain = md.replace(/#{1,4}\s*/g, '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/^\|.*\|$/gm, '').replace(/^[-:]+$/gm, '').replace(/\n+/g, ' ').trim();
  return plain.length > maxLen ? plain.slice(0, maxLen) + '…' : plain;
}

// ─── Timeline parser ───

interface TimelinePhase {
  name: string;
  period: string;
  milestones: string[];
}

function parseTimeline(md: string): TimelinePhase[] {
  const phases: TimelinePhase[] = [];
  const parts = md.split(/^## /gm).filter(Boolean);
  for (const part of parts) {
    const lines = part.trim().split('\n');
    const name = lines[0]?.trim() || '';
    if (!name) continue;
    const periodMatch = part.match(/\*\*Período:\*\*\s*(.+)/i) || part.match(/Período:\s*(.+)/i) || part.match(/\*\*(.+?meses?.*?)\*\*/i);
    const period = periodMatch ? periodMatch[1].trim() : '';
    const milestones = lines.filter(l => /^[-•]/.test(l.trim())).map(l => l.replace(/^[-•]\s*/, '').trim()).filter(Boolean);
    if (name) phases.push({ name, period, milestones });
  }
  return phases;
}

// ─── 5W2H parser ───

interface Action5W2H {
  area: string;
  oQue: string;
  porQue: string;
  onde: string;
  quando: string;
  quem: string;
  como: string;
  quanto: string;
}

function parse5W2H(md: string): Action5W2H[] {
  const actions: Action5W2H[] = [];
  const lines = md.split('\n').filter(l => l.trim().startsWith('|'));
  const dataLines = lines.filter(l => !/^\|[\s-:]+\|$/.test(l.trim().replace(/\|/g, '|')));
  // skip header row
  for (let i = 1; i < dataLines.length; i++) {
    const cells = dataLines[i].split('|').slice(1, -1).map(c => c.trim());
    if (cells.length >= 7) {
      actions.push({
        area: cells[0] || 'Estratégico',
        oQue: cells[1] || '',
        porQue: cells[2] || '',
        onde: cells[3] || '',
        quando: cells[4] || '',
        quem: cells[5] || '',
        como: cells[6] || '',
        quanto: cells[7] || '',
      });
    }
  }
  return actions;
}

function parseSectionsFromContent(planContent: any): PlanSection[] {
  if (!planContent) return [];
  if (planContent.sections && Array.isArray(planContent.sections)) {
    const first = planContent.sections[0];
    if (first?.content && !first.content.trim().startsWith('{')) return planContent.sections;
  }
  if (typeof planContent === 'string') {
    try { return parseSectionsFromContent(JSON.parse(planContent)); } catch { return [{ id: 'plano', title: 'Plano Estratégico', content: planContent }]; }
  }
  return [];
}

// ─── Visual renderers ───

function TimelineView({ content }: { content: string }) {
  const phases = parseTimeline(content);
  if (phases.length === 0) return <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }} />;

  return (
    <div className="relative pl-8">
      <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary via-primary/60 to-primary/20" />
      {phases.map((phase, i) => {
        const color = timelineColors[i % timelineColors.length];
        return (
          <div key={i} className="relative mb-6 last:mb-0">
            <div className={cn('absolute -left-[18px] top-1 w-4 h-4 rounded-full border-2 border-background', color.bg)} />
            <div className={cn('ml-4 rounded-lg border p-4', color.light)}>
              <div className="flex items-center justify-between mb-2">
                <h3 className={cn('font-bold text-sm', color.text)}>{phase.name}</h3>
                {phase.period && (
                  <Badge variant="outline" className={cn('text-xs', color.text)}>{phase.period}</Badge>
                )}
              </div>
              {phase.milestones.length > 0 && (
                <ul className="space-y-1.5">
                  {phase.milestones.map((m, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className={cn('h-4 w-4 mt-0.5 shrink-0', color.text)} />
                      <span>{m}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ActionPlan5W2H({ content }: { content: string }) {
  const actions = parse5W2H(content);
  const [filter, setFilter] = useState<string>('Todos');

  if (actions.length === 0) return <div dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }} />;

  const areas = ['Todos', ...Array.from(new Set(actions.map(a => a.area)))];
  const filtered = filter === 'Todos' ? actions : actions.filter(a => a.area === filter);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {areas.map(area => (
          <button
            key={area}
            onClick={() => setFilter(area)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
              filter === area
                ? 'bg-primary text-primary-foreground border-primary'
                : areaBadgeColors[area] || 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
            )}
          >
            <Filter className="inline h-3 w-3 mr-1" />
            {area} {area !== 'Todos' && `(${actions.filter(a => a.area === area).length})`}
          </button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {filtered.map((action, i) => (
          <div key={i} className="rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold', areaBadgeColors[action.area] || 'bg-muted text-muted-foreground')}>
                {action.area}
              </span>
              {action.quando && <span className="text-xs text-muted-foreground">{action.quando}</span>}
            </div>
            <h4 className="font-semibold text-sm text-foreground mb-1">{action.oQue}</h4>
            <p className="text-xs text-muted-foreground mb-2">{action.porQue}</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {action.onde && <div><span className="font-medium text-foreground">Onde:</span> {action.onde}</div>}
              {action.quem && <div><span className="font-medium text-foreground">Quem:</span> {action.quem}</div>}
              {action.como && <div className="col-span-2"><span className="font-medium text-foreground">Como:</span> {action.como}</div>}
              {action.quanto && <div className="col-span-2"><span className="font-medium text-foreground">Investimento:</span> {action.quanto}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Section renderer ───

function SectionContent({ section }: { section: PlanSection }) {
  if (section.id === 'cronograma') return <TimelineView content={section.content} />;
  if (section.id === 'plano5w2h') return <ActionPlan5W2H content={section.content} />;

  return (
    <div
      className="prose prose-sm max-w-none text-muted-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_h4]:text-foreground [&_strong]:text-foreground"
      dangerouslySetInnerHTML={{ __html: markdownToHtml(section.content) }}
    />
  );
}

// ─── Main component ───

const Resultado = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sections, setSections] = useState<PlanSection[]>([]);
  const [activeSection, setActiveSection] = useState(0);
  const [hasLab, setHasLab] = useState(false);
  const [viewMode, setViewMode] = useState<'canvas' | 'detail'>('canvas');

  useEffect(() => {
    if (sections.length > 0) {
      localStorage.setItem('plan_sections_ready', 'true');
      window.dispatchEvent(new Event('plan-sections-ready'));
      if (!window.location.hash && sections[0]) window.location.hash = sections[0].id;
    }
    return () => { localStorage.removeItem('plan_sections_ready'); };
  }, [sections]);

  useEffect(() => {
    const handler = (e: Event) => {
      const sectionId = (e as CustomEvent).detail;
      const idx = sections.findIndex(s => s.id === sectionId);
      if (idx >= 0) { setActiveSection(idx); setViewMode('detail'); }
    };
    window.addEventListener('plan-navigate', handler);
    return () => window.removeEventListener('plan-navigate', handler);
  }, [sections]);

  useEffect(() => {
    if (sections[activeSection]) window.location.hash = sections[activeSection].id;
  }, [activeSection, sections]);

  const loadAndGenerate = async (forceRegenerate = false) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate('/login'); return; }

    if (!forceRegenerate) {
      const { data: existingPlan } = await supabase.from('generated_plans').select('plan_content').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (existingPlan?.plan_content) {
        const parsed = parseSectionsFromContent(existingPlan.plan_content);
        if (parsed.length > 0 && parsed[0].content && !parsed[0].content.trim().startsWith('{') && !parsed[0].content.trim().startsWith('```')) {
          setSections(parsed); setHasLab(true); setLoading(false); return;
        }
      }
    }

    const [profileRes, diagRes, rfvRes, cxRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('diagnostic_responses').select('answers').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('rfv_uploads').select('client_data').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('cx_uploads').select('ticket_data').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);

    const profile = profileRes.data;
    const diagAnswers = diagRes.data?.answers as Record<string, any> | null;
    const labAnswers = diagAnswers?.lab || diagAnswers || null;
    if (!labAnswers || (typeof labAnswers === 'object' && Object.keys(labAnswers).length === 0)) {
      setHasLab(false); setLoading(false); return;
    }
    setHasLab(true);

    let rfvSummary = '', nboSummary = '', cxSummary = '';
    if (rfvRes.data?.client_data) {
      const cd = rfvRes.data.client_data as unknown as ClientData[];
      rfvSummary = generateRFVSummary(scoreClients(cd, defaultPercentileParams(3)));
      nboSummary = generateNBOSummary(classifyNBO(cd));
    }
    if (cxRes.data?.ticket_data) cxSummary = generateCXSummary(cxRes.data.ticket_data as unknown as CXTicket[]);

    setGenerating(true); setLoading(false);
    try {
      const { data: funcData, error: funcError } = await supabase.functions.invoke('generate-plan', {
        body: { profile, labAnswers, rfvSummary, nboSummary, cxSummary },
      });
      if (funcError) throw new Error(funcError.message);
      if (funcData?.error) throw new Error(funcData.error);
      const planSections = parseSectionsFromContent(funcData);
      setSections(planSections);
      const userId = (await supabase.auth.getUser()).data.user!.id;
      await supabase.from('generated_plans').delete().eq('user_id', userId);
      await supabase.from('generated_plans').insert({ user_id: userId, plan_content: JSON.parse(JSON.stringify({ sections: planSections })) });
    } catch (err: any) {
      console.error('Plan generation error:', err);
      toast({ title: 'Erro ao gerar plano', description: err.message || 'Tente novamente.', variant: 'destructive' });
    } finally { setGenerating(false); }
  };

  useEffect(() => { loadAndGenerate(); }, []);

  const handleRegenerate = () => { setSections([]); setActiveSection(0); setGenerating(true); loadAndGenerate(true); };

  const handleDownloadPDF = async () => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF('p', 'mm', 'a4');
      const w = doc.internal.pageSize.getWidth();
      const maxW = w - 28;
      const BRAND_BLUE: [number, number, number] = [30, 64, 175];
      const DARK_GRAY: [number, number, number] = [51, 51, 51];
      const LIGHT_GRAY: [number, number, number] = [245, 245, 245];

      const checkBreak = (yy: number, needed: number) => {
        if (yy + needed > doc.internal.pageSize.getHeight() - 25) { doc.addPage(); return 28; }
        return yy;
      };

      // Cover
      doc.setFillColor(...BRAND_BLUE);
      doc.rect(0, 0, w, 50, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('Plano Estratégico de Loyalty', 14, 28);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text('Relatório personalizado — Framework LAB', 14, 38);
      doc.text(new Date().toLocaleDateString('pt-BR'), 14, 45);
      let y = 60;

      for (const section of sections) {
        y = checkBreak(y, 20);
        // Section title
        doc.setFillColor(...BRAND_BLUE);
        doc.rect(14, y, 3, 8, 'F');
        doc.setTextColor(...DARK_GRAY);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        const titleLines = doc.splitTextToSize(section.title, maxW - 10);
        titleLines.forEach((line: string) => { doc.text(line, 20, y + 6); y += 6; });
        y += 8;

        // 5W2H as autoTable
        if (section.id === 'plano5w2h') {
          const actions = parse5W2H(section.content);
          if (actions.length > 0) {
            autoTable(doc, {
              startY: y,
              head: [['Área', 'O Quê', 'Por Quê', 'Onde', 'Quando', 'Quem', 'Como', 'Quanto']],
              body: actions.map(a => [a.area, a.oQue, a.porQue, a.onde, a.quando, a.quem, a.como, a.quanto]),
              margin: { left: 14, right: 14 },
              headStyles: { fillColor: [...BRAND_BLUE] as [number, number, number], fontSize: 7, cellPadding: 2 },
              bodyStyles: { fontSize: 7, textColor: [...DARK_GRAY] as [number, number, number], cellPadding: 2 },
              alternateRowStyles: { fillColor: [...LIGHT_GRAY] as [number, number, number] },
              columnStyles: { 0: { cellWidth: 18, fontStyle: 'bold' } },
              styles: { overflow: 'linebreak' },
            });
            y = (doc as any).lastAutoTable.finalY + 10;
            continue;
          }
        }

        // Cronograma as autoTable
        if (section.id === 'cronograma') {
          const phases = parseTimeline(section.content);
          if (phases.length > 0) {
            const rows: string[][] = [];
            phases.forEach(p => {
              p.milestones.forEach((m, mi) => {
                rows.push([mi === 0 ? p.name : '', mi === 0 ? p.period : '', m]);
              });
              if (p.milestones.length === 0) rows.push([p.name, p.period, '—']);
            });
            autoTable(doc, {
              startY: y,
              head: [['Fase', 'Período', 'Marco']],
              body: rows,
              margin: { left: 14, right: 14 },
              headStyles: { fillColor: [...BRAND_BLUE] as [number, number, number], fontSize: 8 },
              bodyStyles: { fontSize: 8, textColor: [...DARK_GRAY] as [number, number, number] },
              alternateRowStyles: { fillColor: [...LIGHT_GRAY] as [number, number, number] },
              columnStyles: { 0: { cellWidth: 45, fontStyle: 'bold' }, 1: { cellWidth: 30 } },
            });
            y = (doc as any).lastAutoTable.finalY + 10;
            continue;
          }
        }

        // Detect markdown tables and render with autoTable
        const tableMatch = section.content.match(/(\|.+\|(?:\r?\n)?){3,}/g);
        if (tableMatch) {
          // text before table
          const beforeTable = section.content.split(tableMatch[0])[0];
          if (beforeTable.trim()) {
            const pt = beforeTable.replace(/#{1,4}\s*/g, '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/^- /gm, '• ');
            doc.setTextColor(80, 80, 80); doc.setFontSize(9); doc.setFont('helvetica', 'normal');
            const tl = doc.splitTextToSize(pt, maxW);
            for (const line of tl) { y = checkBreak(y, 5); doc.text(line, 14, y); y += 4.2; }
            y += 4;
          }

          // render each table
          for (const tb of tableMatch) {
            const tRows = tb.trim().split('\n').filter(r => r.trim().startsWith('|'));
            const isSepar = (r: string) => /^\|[\s-:]+\|$/.test(r.trim().replace(/\|/g, '|'));
            const dRows = tRows.filter(r => !isSepar(r));
            if (dRows.length >= 2) {
              const parse = (r: string) => r.split('|').slice(1, -1).map(c => c.trim());
              const head = [parse(dRows[0])];
              const body = dRows.slice(1).map(r => parse(r));
              y = checkBreak(y, 20);
              autoTable(doc, {
                startY: y,
                head, body,
                margin: { left: 14, right: 14 },
                headStyles: { fillColor: [...BRAND_BLUE] as [number, number, number], fontSize: 8 },
                bodyStyles: { fontSize: 8, textColor: [...DARK_GRAY] as [number, number, number] },
                alternateRowStyles: { fillColor: [...LIGHT_GRAY] as [number, number, number] },
              });
              y = (doc as any).lastAutoTable.finalY + 6;
            }
          }

          // text after last table
          const afterTable = section.content.split(tableMatch[tableMatch.length - 1])[1];
          if (afterTable?.trim()) {
            const pt = afterTable.replace(/#{1,4}\s*/g, '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/^- /gm, '• ');
            doc.setTextColor(80, 80, 80); doc.setFontSize(9); doc.setFont('helvetica', 'normal');
            const tl = doc.splitTextToSize(pt, maxW);
            for (const line of tl) { y = checkBreak(y, 5); doc.text(line, 14, y); y += 4.2; }
          }
          y += 10;
          continue;
        }

        // Plain text
        const plainText = section.content
          .replace(/#{1,4}\s*/g, '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1')
          .replace(/^\|.*\|$/gm, '').replace(/^[-:]+$/gm, '').replace(/^- /gm, '• ').replace(/^\d+\. /gm, '→ ');

        doc.setTextColor(80, 80, 80);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(plainText, maxW);
        for (const line of lines) {
          y = checkBreak(y, 5);
          doc.text(line, 14, y);
          y += 4.2;
        }
        y += 10;
      }

      // Headers & footers
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        if (i > 1) {
          doc.setFillColor(...BRAND_BLUE);
          doc.rect(0, 0, w, 14, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.text('Loyalty Academy Brasil — Plano Estratégico', 14, 9);
          doc.text(`${i}/${totalPages}`, w - 14, 9, { align: 'right' });
        }
        const h = doc.internal.pageSize.getHeight();
        doc.setDrawColor(...BRAND_BLUE);
        doc.setLineWidth(0.3);
        doc.line(14, h - 12, w - 14, h - 12);
        doc.setFontSize(7);
        doc.setTextColor(120, 120, 120);
        doc.text('Documento gerado pela Plataforma Loyalty Academy Brasil', 14, h - 8);
      }

      doc.save('Plano_Estrategico_Loyalty_LAB.pdf');
      toast({ title: 'PDF gerado com sucesso!', description: `${totalPages} páginas exportadas.` });
    } catch (err) {
      console.error('PDF error:', err);
      toast({ title: 'Erro ao gerar PDF', variant: 'destructive' });
    }
  };

  if (loading) return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="text-lg font-medium text-muted-foreground">Carregando plano estratégico...</p>
    </div>
  );

  if (!hasLab) return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 px-4">
      <FileText className="h-16 w-16 text-muted-foreground" />
      <h2 className="text-2xl font-bold text-foreground">Framework LAB não preenchido</h2>
      <p className="text-muted-foreground text-center max-w-md">Complete primeiro o Formulário LAB.</p>
      <Button onClick={() => navigate('/lab-framework')} size="lg" className="mt-4">Ir para Formulário LAB</Button>
    </div>
  );

  if (generating && sections.length === 0) return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="text-lg font-medium text-muted-foreground">Gerando seu plano estratégico com IA...</p>
      <p className="text-sm text-muted-foreground">Isso pode levar até 60 segundos</p>
    </div>
  );

  const currentSection = sections[activeSection];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Plano Estratégico de Loyalty</h1>
          <p className="mt-1 text-muted-foreground">Gerado por IA com base nos seus dados e no Framework LAB</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-lg border overflow-hidden">
            <button
              onClick={() => setViewMode('canvas')}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors', viewMode === 'canvas' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Canvas
            </button>
            <button
              onClick={() => setViewMode('detail')}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors', viewMode === 'detail' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}
            >
              <BookOpen className="h-3.5 w-3.5" /> Leitura
            </button>
          </div>
          <Button onClick={handleDownloadPDF} variant="outline" size="sm" className="gap-2" disabled={sections.length === 0}>
            <Download className="h-4 w-4" /> PDF Completo
          </Button>
          <Button onClick={handleRegenerate} disabled={generating} variant="outline" size="sm" className="gap-2">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Regenerar
          </Button>
        </div>
      </div>

      {/* Canvas Mode */}
      {viewMode === 'canvas' && sections.length > 0 && (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sections.map((section, idx) => {
            const Icon = sectionIcons[section.id] || FileText;
            const borderColor = sectionColors[section.id] || 'border-l-primary';
            return (
              <button
                key={section.id}
                onClick={() => { setActiveSection(idx); setViewMode('detail'); }}
                className={cn(
                  'group text-left rounded-lg border border-l-4 bg-card p-4 shadow-sm hover:shadow-md transition-all hover:scale-[1.02]',
                  borderColor
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-4 w-4 text-primary shrink-0" />
                  <h3 className="text-xs font-semibold text-foreground leading-tight line-clamp-2">{section.title}</h3>
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground line-clamp-5">{extractSummary(section.content, 200)}</p>
                <span className="mt-2 inline-block text-[10px] font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">Ler mais →</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Detail Mode */}
      {viewMode === 'detail' && currentSection && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                {(() => { const Icon = sectionIcons[currentSection.id] || FileText; return <Icon className="h-6 w-6 text-primary" />; })()}
                <CardTitle className="text-xl">{currentSection.title}</CardTitle>
              </div>
              <p className="text-xs text-muted-foreground">Seção {activeSection + 1} de {sections.length}</p>
            </CardHeader>
            <CardContent>
              <SectionContent section={currentSection} />
            </CardContent>
          </Card>
          <div className="mt-4 flex items-center justify-between">
            <Button variant="outline" disabled={activeSection === 0} onClick={() => setActiveSection(activeSection - 1)} className="gap-1">
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setViewMode('canvas')} className="text-xs gap-1">
              <LayoutGrid className="h-3.5 w-3.5" /> Voltar ao Canvas
            </Button>
            <Button variant="outline" disabled={activeSection >= sections.length - 1} onClick={() => setActiveSection(activeSection + 1)} className="gap-1">
              Próximo <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}

      {sections.length > 0 && (
        <div className="mt-8 text-center">
          <Button size="lg" onClick={() => navigate('/plano-final')} className="h-12 px-8">Ir para Visão Consolidada</Button>
        </div>
      )}
    </div>
  );
};

export default Resultado;
