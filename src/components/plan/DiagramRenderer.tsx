import React from 'react';

interface DiagramProps {
  items: string[];
}

// ─── Comparison: Editorial cards side-by-side ───

export function ComparisonDiagram({ items }: DiagramProps) {
  const colors = [
    { border: 'border-blue-200', bg: 'bg-blue-50', accent: 'text-blue-700', dot: 'bg-blue-500' },
    { border: 'border-violet-200', bg: 'bg-violet-50', accent: 'text-violet-700', dot: 'bg-violet-500' },
    { border: 'border-emerald-200', bg: 'bg-emerald-50', accent: 'text-emerald-700', dot: 'bg-emerald-500' },
    { border: 'border-amber-200', bg: 'bg-amber-50', accent: 'text-amber-700', dot: 'bg-amber-500' },
  ];
  return (
    <div className="my-5 grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(items.length, 4)}, 1fr)` }}>
      {items.map((item, i) => {
        const label = item.includes(':') ? item.split(':')[0].trim() : item;
        const desc = item.includes(':') ? item.split(':').slice(1).join(':').trim() : '';
        const c = colors[i % colors.length];
        return (
          <div key={i} className={`rounded-lg border ${c.border} ${c.bg} p-4`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2 h-2 rounded-full ${c.dot}`} />
              <span className={`text-sm font-bold ${c.accent}`}>{label}</span>
            </div>
            {desc && <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>}
          </div>
        );
      })}
    </div>
  );
}

// ─── Pyramid: Clean layered blocks ───

export function PyramidDiagram({ items }: DiagramProps) {
  const n = items.length;
  const colors = [
    { bg: 'bg-violet-100', text: 'text-violet-800', border: 'border-violet-200' },
    { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
    { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
    { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' },
  ];

  return (
    <div className="my-5 flex flex-col items-center gap-1">
      {items.map((item, i) => {
        const label = item.includes(':') ? item.split(':')[0].trim() : item;
        const desc = item.includes(':') ? item.split(':').slice(1).join(':').trim() : '';
        const c = colors[i % colors.length];
        const widthPct = 40 + (i / Math.max(n - 1, 1)) * 60;
        return (
          <div
            key={i}
            className={`rounded-md border ${c.border} ${c.bg} px-4 py-2.5 text-center`}
            style={{ width: `${widthPct}%` }}
          >
            <span className={`text-xs font-bold ${c.text}`}>{label}</span>
            {desc && <p className={`text-[10px] mt-0.5 ${c.text} opacity-75`}>{desc}</p>}
          </div>
        );
      })}
    </div>
  );
}

// ─── Funnel: Decreasing width blocks ───

export function FunnelDiagram({ items }: DiagramProps) {
  const n = items.length;
  const colors = [
    { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
    { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
    { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' },
    { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
  ];

  return (
    <div className="my-5 flex flex-col items-center gap-1">
      {items.map((item, i) => {
        const label = item.includes(':') ? item.split(':')[0].trim() : item;
        const desc = item.includes(':') ? item.split(':').slice(1).join(':').trim() : '';
        const c = colors[i % colors.length];
        const widthPct = 100 - (i / Math.max(n - 1, 1)) * 55;
        return (
          <div
            key={i}
            className={`rounded-md border ${c.border} ${c.bg} px-4 py-2.5 text-center`}
            style={{ width: `${widthPct}%` }}
          >
            <span className={`text-xs font-bold ${c.text}`}>{label}</span>
            {desc && <p className={`text-[10px] mt-0.5 ${c.text} opacity-75`}>{desc}</p>}
          </div>
        );
      })}
    </div>
  );
}

// ─── Flow: Horizontal steps with arrows ───

export function FlowDiagram({ items }: DiagramProps) {
  const colors = [
    { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
    { bg: 'bg-teal-50', text: 'text-teal-800', border: 'border-teal-200' },
    { bg: 'bg-cyan-50', text: 'text-cyan-800', border: 'border-cyan-200' },
    { bg: 'bg-sky-50', text: 'text-sky-800', border: 'border-sky-200' },
    { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' },
  ];

  return (
    <div className="my-5 flex items-stretch gap-2 overflow-x-auto pb-2">
      {items.map((item, i) => {
        const label = item.includes(':') ? item.split(':')[0].trim() : item;
        const desc = item.includes(':') ? item.split(':').slice(1).join(':').trim() : '';
        const c = colors[i % colors.length];
        return (
          <React.Fragment key={i}>
            <div className={`flex-1 min-w-[120px] rounded-lg border ${c.border} ${c.bg} p-3 text-center`}>
              <div className={`text-xs font-bold ${c.text} mb-1`}>{label}</div>
              {desc && <p className={`text-[10px] ${c.text} opacity-75 leading-snug`}>{desc}</p>}
            </div>
            {i < items.length - 1 && (
              <div className="flex items-center text-muted-foreground/50 shrink-0">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Gauge: Clean arc ───

export function GaugeDiagram({ items }: DiagramProps) {
  const raw = items[0] || '5';
  const numMatch = raw.match(/\d+/);
  const value = numMatch ? Math.min(10, Math.max(0, parseInt(numMatch[0]))) : 5;
  const label = items[1] || (value <= 3 ? 'Inicial' : value <= 6 ? 'Intermediário' : 'Avançado');
  const angle = -90 + (value / 10) * 180;
  const gaugeColor = value <= 3 ? '#ef4444' : value <= 6 ? '#f59e0b' : '#10b981';

  return (
    <div className="my-5 flex justify-center">
      <div className="bg-muted/20 rounded-xl border border-border/50 px-8 py-4 inline-block">
        <svg viewBox="0 0 200 120" className="w-48 mx-auto" role="img">
          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#e5e7eb" strokeWidth="12" strokeLinecap="round" />
          <path
            d={`M 20 100 A 80 80 0 0 1 ${100 + 80 * Math.cos((angle * Math.PI) / 180)} ${100 - 80 * Math.abs(Math.sin((angle * Math.PI) / 180))}`}
            fill="none" stroke={gaugeColor} strokeWidth="12" strokeLinecap="round"
          />
          <circle cx="100" cy="100" r="4" fill="#374151" />
          <line x1="100" y1="100" x2={100 + 55 * Math.cos((angle * Math.PI) / 180)} y2={100 - 55 * Math.sin((angle * Math.PI) / 180)} stroke="#374151" strokeWidth="2" strokeLinecap="round" />
          <text x="100" y="85" textAnchor="middle" fontSize="22" fontWeight="bold" fill="#1f2937">{value}/10</text>
          <text x="100" y="115" textAnchor="middle" fontSize="10" fill="#6b7280">{label}</text>
        </svg>
      </div>
    </div>
  );
}

type DiagramType = 'pyramid' | 'funnel' | 'flow' | 'comparison' | 'gauge';

const diagramComponents: Record<DiagramType, React.FC<DiagramProps>> = {
  pyramid: PyramidDiagram,
  funnel: FunnelDiagram,
  flow: FlowDiagram,
  comparison: ComparisonDiagram,
  gauge: GaugeDiagram,
};

export interface ParsedDiagram {
  type: DiagramType;
  items: string[];
}

export function parseDiagrams(content: string): (string | ParsedDiagram)[] {
  const regex = /<!--\s*DIAGRAM:\s*(pyramid|funnel|flow|comparison|gauge)\s*\|(.+?)-->/g;
  const parts: (string | ParsedDiagram)[] = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }
    parts.push({
      type: match[1] as DiagramType,
      items: match[2].split('|').map(s => s.trim()).filter(Boolean),
    });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }
  return parts;
}

export function DiagramRenderer({ diagram }: { diagram: ParsedDiagram }) {
  const Component = diagramComponents[diagram.type];
  if (!Component) return null;
  return <Component items={diagram.items} />;
}
