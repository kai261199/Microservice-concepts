import React, { useState } from 'react';
import { FlowStep } from '../types';
import { useTheme } from '../ThemeContext';
import type { LucideIcon } from 'lucide-react';
import {
  Monitor, Package, Workflow, Warehouse, CreditCard,
  Zap, Mail, MousePointer, Undo2, Check, X,
} from 'lucide-react';

/* ── Swim lane config ── */
const LANES = ['client', 'order', 'saga', 'inventory', 'payment'] as const;
type Lane = (typeof LANES)[number];

const LANE_META: Record<Lane, { label: string; icon: LucideIcon; color: string; gradient: string }> = {
  client:    { label: 'Client',     icon: Monitor,    color: '#10b981', gradient: 'linear-gradient(135deg, #d1fae5, #a7f3d0)' },
  order:     { label: 'Order',  icon: Package,    color: '#6366f1', gradient: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)' },
  saga:      { label: 'Saga',       icon: Workflow,   color: '#f59e0b', gradient: 'linear-gradient(135deg, #fef3c7, #fde68a)' },
  inventory: { label: 'Inventory',  icon: Warehouse,  color: '#8b5cf6', gradient: 'linear-gradient(135deg, #ede9fe, #ddd6fe)' },
  payment:   { label: 'Payment',    icon: CreditCard, color: '#ec4899', gradient: 'linear-gradient(135deg, #fce7f3, #fbcfe8)' },
};

const TYPE_ICON: Record<string, LucideIcon> = {
  command: Zap,
  event: Mail,
  action: MousePointer,
  compensating: Undo2,
};

interface Props {
  steps: FlowStep[];
  currentStepIndex: number;
  isAnimating: boolean;
}

const LANE_W = 260;
const NODE_H = 80;
const ROW_GAP = 100;
const HEADER_H = 56;
const PAD_TOP = 24;

export const FlowDiagram: React.FC<Props> = ({ steps, currentStepIndex, isAnimating }) => {
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);
  const { isDark, t } = useTheme();

  const laneX = (s: Lane) => LANES.indexOf(s) * LANE_W + LANE_W / 2;
  const rowY = (i: number) => HEADER_H + PAD_TOP + i * ROW_GAP + NODE_H / 2;

  const svgW = LANES.length * LANE_W;
  const svgH = HEADER_H + PAD_TOP + steps.length * ROW_GAP + 32;

  return (
    <div>
      {/* Active step detail card - above graph for easier following */}
      {currentStepIndex >= 0 && currentStepIndex < steps.length && (() => {
        const step = steps[currentStepIndex];
        const meta = LANE_META[step.service as Lane];
        const TypeIcon = TYPE_ICON[step.type];
        return (
          <div style={{
            marginBottom: 16, padding: '16px 20px', borderRadius: 16,
            background: isDark ? 'rgba(68,71,90,0.7)' : 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)',
            border: `2px solid ${meta.color}30`,
            boxShadow: `0 4px 20px ${meta.color}10`,
            animation: 'fadeIn 0.3s ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              {TypeIcon && <TypeIcon size={18} color={meta.color} />}
              <span style={{
                fontWeight: 700, fontSize: 14, color: meta.color,
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                Step {currentStepIndex + 1}: {step.label}
              </span>
              <span style={{
                padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                background: `${meta.color}15`, color: meta.color,
                border: `1px solid ${meta.color}25`,
              }}>
                {step.concept}
              </span>
            </div>
            <div style={{ fontSize: 13, color: t.text, lineHeight: 1.7 }}>
              {step.description}
            </div>
          </div>
        );
      })()}
      <div style={{ overflowX: 'auto' }}>
      <svg
        width="100%"
        height={svgH}
        viewBox={`0 0 ${svgW} ${svgH}`}
        style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif", display: 'block', minWidth: svgW }}
      >
        <defs>
          {/* Gradients for lanes */}
          <linearGradient id="lane-client" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="lane-order" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="lane-saga" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="lane-inventory" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="lane-payment" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ec4899" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0.02" />
          </linearGradient>

          {/* Arrow markers */}
          {['done', 'active', 'future', 'fail', 'comp'].map(type => {
            const colors: Record<string, string> = {
              done: '#10b981', active: '#6366f1', future: '#cbd5e1', fail: '#ef4444', comp: '#f97316',
            };
            return (
              <marker key={type} id={`arr-${type}`} viewBox="0 0 10 8" refX="10" refY="4"
                markerWidth="8" markerHeight="6" orient="auto-start-reverse">
                <path d="M0 0 L10 4 L0 8 z" fill={colors[type]} />
              </marker>
            );
          })}

          {/* Glow filters */}
          <filter id="glow-node">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="shadow-sm">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#6366f1" floodOpacity="0.12" />
          </filter>
          <filter id="shadow-hover">
            <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#6366f1" floodOpacity="0.2" />
          </filter>

          {/* Processing animation gradient */}
          <linearGradient id="processing-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0">
              <animate attributeName="offset" values="0;1" dur="1.5s" repeatCount="indefinite" />
            </stop>
            <stop offset="30%" stopColor="#6366f1" stopOpacity="0.3">
              <animate attributeName="offset" values="0.3;1.3" dur="1.5s" repeatCount="indefinite" />
            </stop>
            <stop offset="60%" stopColor="#6366f1" stopOpacity="0">
              <animate attributeName="offset" values="0.6;1.6" dur="1.5s" repeatCount="indefinite" />
            </stop>
          </linearGradient>
        </defs>

        {/* ── Lane backgrounds ── */}
        {LANES.map((lane) => {
          const x = laneX(lane);
          return (
            <g key={`lane-${lane}`}>
              <rect
                x={x - LANE_W / 2 + 2} y={HEADER_H}
                width={LANE_W - 4} height={svgH - HEADER_H}
                rx={12} fill={`url(#lane-${lane})`}
              />
              <line
                x1={x} y1={HEADER_H + 12} x2={x} y2={svgH - 12}
                stroke={LANE_META[lane].color} strokeWidth={1}
                strokeDasharray="3 6" opacity={0.2}
              />
            </g>
          );
        })}

        {/* ── Lane headers (glass pill) ── */}
        {LANES.map((lane) => {
          const meta = LANE_META[lane];
          const x = laneX(lane);
          return (
            <g key={`header-${lane}`}>
              <rect
                x={x - 90} y={8} width={180} height={40}
                rx={20} fill="white" fillOpacity={0.95}
                stroke={meta.color} strokeWidth={1.5} strokeOpacity={0.3}
                filter="url(#shadow-sm)"
              />
              <text x={x} y={33} textAnchor="middle" fontSize={12} fontWeight={700}
                fill={meta.color}>
                {meta.label}
              </text>
            </g>
          );
        })}

        {/* ── Edges ── */}
        {steps.map((step, i) => {
          if (i === 0) return null;
          const prev = steps[i - 1];
          const x1 = laneX(prev.service as Lane);
          const y1 = rowY(i - 1) + NODE_H / 2 + 4;
          const x2 = laneX(step.service as Lane);
          const y2 = rowY(i) - NODE_H / 2 - 4;

          const isDone = i < currentStepIndex;
          const isActive = i === currentStepIndex;
          const isFail = step.id === 'payment-failed' || step.id === 'stock-failed' || step.id === 'failed';
          const isComp = step.type === 'compensating';
          const isFuture = i > currentStepIndex;

          const color = isFuture ? '#cbd5e1' : isComp ? '#f97316' : isFail ? '#ef4444'
            : isActive ? '#6366f1' : '#10b981';
          const markerType = isFuture ? 'future' : isComp ? 'comp' : isFail ? 'fail'
            : isActive ? 'active' : 'done';

          const midY = (y1 + y2) / 2;
          const d = x1 !== x2
            ? `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`
            : `M ${x1} ${y1} L ${x2} ${y2}`;

          return (
            <g key={`edge-${i}`}>
              {/* Shadow edge for depth */}
              {!isFuture && (
                <path d={d} fill="none" stroke={color} strokeWidth={4} opacity={0.1} />
              )}
              {/* Main edge */}
              <path
                d={d} fill="none" stroke={color}
                strokeWidth={isFuture ? 1.5 : 2.5}
                strokeDasharray={isFuture ? '6 6' : isActive && isAnimating ? '8 4' : 'none'}
                markerEnd={`url(#arr-${markerType})`}
                opacity={isFuture && isAnimating ? 0.25 : 1}
                style={{ transition: 'all 0.5s ease' }}
              >
                {isActive && isAnimating && (
                  <animate attributeName="stroke-dashoffset" from="24" to="0" dur="0.6s" repeatCount="indefinite" />
                )}
              </path>
              {/* Animated particle on active edge */}
              {isActive && isAnimating && (
                <circle r={4} fill={color} opacity={0.8}>
                  <animateMotion dur="1s" repeatCount="indefinite" path={d} />
                </circle>
              )}
            </g>
          );
        })}

        {/* ── Nodes ── */}
        {steps.map((step, i) => {
          const lane = step.service as Lane;
          const meta = LANE_META[lane];
          const cx = laneX(lane);
          const cy = rowY(i);
          const isActive = i === currentStepIndex;
          const isDone = i < currentStepIndex;
          const isFuture = i > currentStepIndex;
          const isFail = step.id === 'payment-failed' || step.id === 'stock-failed' || step.id === 'failed';
          const isComp = step.type === 'compensating';
          const isHovered = hoveredStep === i;

          const nodeW = LANE_W - 20;
          const nodeX = cx - nodeW / 2;
          const nodeY = cy - NODE_H / 2;

          const TypeIcon = TYPE_ICON[step.type];

          return (
            <g
              key={`node-${i}`}
              onMouseEnter={() => setHoveredStep(i)}
              onMouseLeave={() => setHoveredStep(null)}
              style={{ cursor: 'pointer' }}
            >
              {/* Active processing: bottom progress bar + subtle left glow */}
              {isActive && isAnimating && (
                <>
                  <rect
                    x={nodeX} y={nodeY + NODE_H - 3}
                    width={nodeW} height={3}
                    rx={1.5} fill={meta.color} opacity={0.15}
                  />
                  <rect
                    x={nodeX} y={nodeY + NODE_H - 3}
                    width={nodeW * 0.4} height={3}
                    rx={1.5} fill={meta.color}
                  >
                    <animate attributeName="x" values={`${nodeX};${nodeX + nodeW * 0.6};${nodeX}`} dur="1.5s" repeatCount="indefinite" />
                  </rect>
                </>
              )}

              {/* Card background - restored with proper styling */}
              <rect
                x={nodeX} y={nodeY}
                width={nodeW} height={NODE_H}
                rx={12}
                fill={isFuture ? '#f8fafc' : 'white'}
                fillOpacity={isFuture ? 0.6 : 1}
                stroke={isFuture ? '#e2e8f0' : isActive ? meta.color : isFail ? '#fca5a5' : isComp ? '#fdba74' : isDone ? '#86efac' : '#e2e8f0'}
                strokeWidth={isActive ? 2 : 1}
                filter={isActive ? 'url(#glow-node)' : isHovered ? 'url(#shadow-hover)' : 'url(#shadow-sm)'}
                style={{ transition: 'all 0.4s ease' }}
              />

              {/* Step indicator circle */}
              <circle
                cx={nodeX + 22} cy={cy - 12}
                r={12}
                fill={isFuture ? '#e2e8f0' : isActive ? meta.color : isFail ? '#ef4444' : isComp ? '#f97316' : '#10b981'}
                stroke="white" strokeWidth={2}
              />
              {isDone ? (
                isFail ? (
                  <g transform={`translate(${nodeX + 16}, ${cy - 18})`}>
                    <X size={12} color="white" />
                  </g>
                ) : (
                  <g transform={`translate(${nodeX + 16}, ${cy - 18})`}>
                    <Check size={12} color="white" />
                  </g>
                )
              ) : (
                <text x={nodeX + 22} y={cy - 8} textAnchor="middle" fill="white" fontSize={10} fontWeight={700}>
                  {i + 1}
                </text>
              )}

              {/* Type icon */}
              {TypeIcon && (
                <g transform={`translate(${nodeX + 40}, ${cy - 18})`}>
                  <TypeIcon size={14} color={isFuture ? '#64748b' : isActive ? meta.color : '#475569'} />
                </g>
              )}

              {/* Label */}
              <text
                x={nodeX + 58} y={cy - 8}
                fontSize={11.5} fontWeight={700}
                fill={isFuture ? '#64748b' : isActive ? meta.color : '#0f172a'}
                style={{ fontFamily: "'JetBrains Mono', 'Cascadia Code', monospace", letterSpacing: '-0.3px' }}
              >
                {step.label.length > 28 ? step.label.slice(0, 28) + '…' : step.label}
              </text>

              {/* Concept badge */}
              <rect
                x={nodeX + 14} y={cy + 8}
                width={nodeW - 28} height={22}
                rx={11}
                fill={isFuture ? '#f1f5f9' : isActive ? meta.color : isDone ? '#dbeafe' : '#f1f5f9'}
                fillOpacity={isFuture ? 0.6 : isActive ? 0.12 : 0.8}
                stroke={isFuture ? '#e2e8f0' : isActive ? meta.color : 'transparent'}
                strokeWidth={isActive ? 1 : 0}
                strokeOpacity={0.3}
              />
              <text
                x={nodeX + nodeW / 2} y={cy + 23}
                textAnchor="middle" fontSize={9.5} fontWeight={600}
                fill={isFuture ? '#64748b' : isActive ? meta.color : '#4f46e5'}
              >
                {step.concept.length > 30 ? step.concept.slice(0, 30) + '…' : step.concept}
              </text>

              {/* Tooltip rendered in separate layer below for z-index */}
            </g>
          );
        })}

        {/* ── Tooltip layer (rendered last = always on top) ── */}
        {hoveredStep !== null && hoveredStep < steps.length && (() => {
          const step = steps[hoveredStep];
          const lane = step.service as Lane;
          const cx = laneX(lane);
          const cy = rowY(hoveredStep);
          const nodeY = cy - NODE_H / 2;
          const isFuture = hoveredStep > currentStepIndex;
          if (isFuture) return null;
          const tooltipW = 360;
          const tooltipH = 90;
          let tooltipX = cx - tooltipW / 2;
          if (tooltipX < 8) tooltipX = 8;
          if (tooltipX + tooltipW > svgW - 8) tooltipX = svgW - tooltipW - 8;
          const tooltipY = nodeY + NODE_H + 14;
          const meta = LANE_META[lane];
          return (
            <g style={{ pointerEvents: 'none' }}>
              <rect
                x={tooltipX} y={tooltipY}
                width={tooltipW} height={tooltipH}
                rx={12} fill={isDark ? '#44475a' : 'white'}
                stroke={meta.color} strokeWidth={1} strokeOpacity={0.25}
                filter="url(#shadow-hover)"
              />
              <foreignObject x={tooltipX + 14} y={tooltipY + 8} width={tooltipW - 28} height={tooltipH - 16}>
                <div style={{ fontFamily: "'Inter','Segoe UI',sans-serif" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: meta.color, marginBottom: 4,
                    fontFamily: "'JetBrains Mono','Cascadia Code',monospace" }}>
                    {step.label}
                  </div>
                  <div style={{ fontSize: 11, color: isDark ? '#cbd5e1' : '#475569', lineHeight: 1.4, wordWrap: 'break-word' as const }}>
                    {step.description}
                  </div>
                </div>
              </foreignObject>
            </g>
          );
        })()}
      </svg>
      </div>
    </div>
  );
};
