import React from 'react';
import { cn } from '@/lib/utils';

interface DiagramProps {
  items: string[];
}

const pyramidColors = [
  { fill: '#7c3aed', text: 'white' },
  { fill: '#8b5cf6', text: 'white' },
  { fill: '#a78bfa', text: 'white' },
  { fill: '#c4b5fd', text: '#4c1d95' },
  { fill: '#ddd6fe', text: '#4c1d95' },
];

export function PyramidDiagram({ items }: DiagramProps) {
  const n = items.length;
  const h = 220;
  const rowH = h / n;
  const minW = 80;
  const maxW = 360;

  return (
    <div className="my-6 flex justify-center">
      <svg viewBox={`0 0 400 ${h + 10}`} className="w-full max-w-md" role="img">
        {items.map((item, i) => {
          const topW = minW + ((maxW - minW) * i) / Math.max(n - 1, 1);
          const botW = i === n - 1 ? maxW : minW + ((maxW - minW) * (i + 1)) / Math.max(n - 1, 1);
          const cx = 200;
          const y1 = i * rowH;
          const y2 = y1 + rowH;
          const color = pyramidColors[i % pyramidColors.length];
          const points = `${cx - topW / 2},${y1} ${cx + topW / 2},${y1} ${cx + botW / 2},${y2} ${cx - botW / 2},${y2}`;
          const label = item.includes(':') ? item.split(':')[0].trim() : item;
          const desc = item.includes(':') ? item.split(':').slice(1).join(':').trim() : '';
          return (
            <g key={i}>
              <polygon points={points} fill={color.fill} stroke="white" strokeWidth="2" />
              <text x={cx} y={y1 + rowH / 2 - (desc ? 4 : 0)} textAnchor="middle" dominantBaseline="central" fill={color.text} fontSize="12" fontWeight="bold">
                {label}
              </text>
              {desc && (
                <text x={cx} y={y1 + rowH / 2 + 12} textAnchor="middle" dominantBaseline="central" fill={color.text} fontSize="9" opacity="0.85">
                  {desc.length > 40 ? desc.slice(0, 40) + '…' : desc}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

const funnelColors = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];

export function FunnelDiagram({ items }: DiagramProps) {
  const n = items.length;
  const rowH = 50;
  const h = n * rowH;
  const maxW = 360;

  return (
    <div className="my-6 flex justify-center">
      <svg viewBox={`0 0 400 ${h + 10}`} className="w-full max-w-md" role="img">
        {items.map((item, i) => {
          const w = maxW - (i * (maxW - 100)) / Math.max(n - 1, 1);
          const x = (400 - w) / 2;
          const y = i * rowH;
          const color = funnelColors[i % funnelColors.length];
          const label = item.includes(':') ? item.split(':')[0].trim() : item;
          const desc = item.includes(':') ? item.split(':').slice(1).join(':').trim() : '';
          return (
            <g key={i}>
              <rect x={x} y={y + 2} width={w} height={rowH - 4} rx="6" fill={color} />
              <text x={200} y={y + rowH / 2 - (desc ? 4 : 0)} textAnchor="middle" dominantBaseline="central" fill="white" fontSize="12" fontWeight="bold">
                {label}
              </text>
              {desc && (
                <text x={200} y={y + rowH / 2 + 12} textAnchor="middle" dominantBaseline="central" fill="white" fontSize="9" opacity="0.85">
                  {desc.length > 45 ? desc.slice(0, 45) + '…' : desc}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

const flowColors = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0'];

export function FlowDiagram({ items }: DiagramProps) {
  const n = items.length;
  const boxW = 140;
  const boxH = 56;
  const gap = 30;
  const totalW = n * boxW + (n - 1) * gap;
  const svgW = Math.max(totalW + 20, 400);

  return (
    <div className="my-6 overflow-x-auto">
      <svg viewBox={`0 0 ${svgW} ${boxH + 20}`} className="w-full min-w-[500px]" role="img">
        {items.map((item, i) => {
          const x = 10 + i * (boxW + gap);
          const color = flowColors[i % flowColors.length];
          const label = item.includes(':') ? item.split(':')[0].trim() : item;
          const desc = item.includes(':') ? item.split(':').slice(1).join(':').trim() : '';
          return (
            <g key={i}>
              <rect x={x} y={10} width={boxW} height={boxH} rx="8" fill={color} />
              <text x={x + boxW / 2} y={10 + boxH / 2 - (desc ? 5 : 0)} textAnchor="middle" dominantBaseline="central" fill="white" fontSize="11" fontWeight="bold">
                {label.length > 18 ? label.slice(0, 18) + '…' : label}
              </text>
              {desc && (
                <text x={x + boxW / 2} y={10 + boxH / 2 + 11} textAnchor="middle" dominantBaseline="central" fill="white" fontSize="8" opacity="0.9">
                  {desc.length > 22 ? desc.slice(0, 22) + '…' : desc}
                </text>
              )}
              {i < n - 1 && (
                <polygon points={`${x + boxW + 5},${10 + boxH / 2 - 6} ${x + boxW + gap - 5},${10 + boxH / 2} ${x + boxW + 5},${10 + boxH / 2 + 6}`} fill="#6b7280" />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function ComparisonDiagram({ items }: DiagramProps) {
  const compColors = ['#2563eb', '#7c3aed', '#059669', '#d97706'];
  return (
    <div className="my-6 grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(items.length, 4)}, 1fr)` }}>
      {items.map((item, i) => {
        const label = item.includes(':') ? item.split(':')[0].trim() : item;
        const desc = item.includes(':') ? item.split(':').slice(1).join(':').trim() : '';
        const color = compColors[i % compColors.length];
        return (
          <div key={i} className="rounded-xl p-4 text-center text-white shadow-lg" style={{ backgroundColor: color }}>
            <div className="text-sm font-bold mb-1">{label}</div>
            {desc && <div className="text-xs opacity-90 leading-relaxed">{desc}</div>}
          </div>
        );
      })}
    </div>
  );
}

export function GaugeDiagram({ items }: DiagramProps) {
  const raw = items[0] || '5';
  const numMatch = raw.match(/\d+/);
  const value = numMatch ? Math.min(10, Math.max(0, parseInt(numMatch[0]))) : 5;
  const label = items[1] || (value <= 3 ? 'Inicial' : value <= 6 ? 'Intermediário' : 'Avançado');
  const angle = -90 + (value / 10) * 180;
  const gaugeColor = value <= 3 ? '#ef4444' : value <= 6 ? '#f59e0b' : '#10b981';

  return (
    <div className="my-6 flex justify-center">
      <svg viewBox="0 0 200 130" className="w-full max-w-xs" role="img">
        {/* Background arc */}
        <path d="M 20 110 A 80 80 0 0 1 180 110" fill="none" stroke="#e5e7eb" strokeWidth="16" strokeLinecap="round" />
        {/* Value arc */}
        <path
          d={`M 20 110 A 80 80 0 0 1 ${100 + 80 * Math.cos((angle * Math.PI) / 180)} ${110 - 80 * Math.abs(Math.sin((angle * Math.PI) / 180))}`}
          fill="none" stroke={gaugeColor} strokeWidth="16" strokeLinecap="round"
        />
        {/* Needle */}
        <line x1="100" y1="110" x2={100 + 60 * Math.cos((angle * Math.PI) / 180)} y2={110 - 60 * Math.sin((angle * Math.PI) / 180)} stroke="#374151" strokeWidth="3" strokeLinecap="round" />
        <circle cx="100" cy="110" r="6" fill="#374151" />
        {/* Value text */}
        <text x="100" y="95" textAnchor="middle" fontSize="24" fontWeight="bold" fill="#1f2937">{value}</text>
        <text x="100" y="125" textAnchor="middle" fontSize="10" fill="#6b7280">{label}</text>
        {/* Min/Max labels */}
        <text x="20" y="125" textAnchor="middle" fontSize="8" fill="#9ca3af">0</text>
        <text x="180" y="125" textAnchor="middle" fontSize="8" fill="#9ca3af">10</text>
      </svg>
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
