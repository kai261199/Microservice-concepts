import React, { useState } from 'react';
import { useTheme } from '../ThemeContext';
import {
  Crown, Sparkles, RefreshCw, Clock, Mailbox, ShieldCheck,
  ArrowRight, Zap, GitBranch, Wrench, Swords, Link2, Shield, Cog,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface ConceptNode {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string;
  shortDesc: string;
  theory: string[];
  relationships: { target: string; label: string; relIcon: LucideIcon }[];
}

const CONCEPTS: ConceptNode[] = [
  {
    id: 'orchestration',
    name: 'Orchestration',
    icon: Crown,
    color: '#f59e0b',
    shortDesc: 'Một Saga/Orchestrator điều phối toàn bộ flow giữa các service.',
    theory: [
      'Orchestrator (Saga State Machine) nắm toàn bộ logic flow, biết service nào cần gọi tiếp.',
      'Gửi COMMAND (point-to-point) trực tiếp đến service đích qua message queue.',
      'Dễ debug, trace, handle lỗi vì flow tập trung 1 nơi.',
      'Trade-off: Single point of knowledge (không phải single point of failure vì stateless + durable).',
      'MassTransit StateMachine lưu state vào DB → crash restart không mất state.',
    ],
    relationships: [
      { target: 'saga', label: 'Implements bằng Saga', relIcon: Wrench },
      { target: 'choreography', label: 'Đối lập (centralized vs decentralized)', relIcon: Swords },
    ],
  },
  {
    id: 'choreography',
    name: 'Choreography',
    icon: Sparkles,
    color: '#10b981',
    shortDesc: 'Các service tự phản ứng với events, không cần ai điều phối.',
    theory: [
      'Mỗi service publish EVENT lên message bus → ai subscribe thì tự xử lý.',
      'Loose coupling tối đa: service không biết ai đang lắng nghe.',
      'Phù hợp flow đơn giản (2-3 service). Flow phức tạp → khó trace, debug.',
      'Không có "brain" tập trung → business logic phân tán nhiều nơi.',
      'Ví dụ: OrderCreated → InventoryService tự nghe → ReserveStock.',
    ],
    relationships: [
      { target: 'orchestration', label: 'Đối lập: không có orchestrator', relIcon: Swords },
      { target: 'eventual-consistency', label: 'Đạt eventual consistency qua events', relIcon: Link2 },
    ],
  },
  {
    id: 'saga',
    name: 'Saga Pattern',
    icon: RefreshCw,
    color: '#6366f1',
    shortDesc: 'Chuỗi local transactions thay thế distributed transaction.',
    theory: [
      'Mỗi service thực hiện local transaction riêng (không lock cross-service).',
      'Nếu 1 step fail → chạy compensating transactions để rollback các step trước.',
      'Compensating ≠ rollback: không undo mà tạo transaction ngược (ví dụ: ReleaseStock).',
      'Khác 2PC (Two-Phase Commit): không cần coordinator lock resource, performance tốt hơn.',
      'Saga state lưu persistent (DB/Redis) → durable qua crash.',
      'ACD properties: Atomicity (compensating) + Consistency (eventual) + Durability (persistent state). Thiếu Isolation.',
    ],
    relationships: [
      { target: 'orchestration', label: 'Thường dùng Orchestration để implement', relIcon: Wrench },
      { target: 'eventual-consistency', label: 'Đảm bảo eventual consistency', relIcon: Link2 },
      { target: 'outbox', label: 'Mỗi step dùng Outbox gửi event', relIcon: Cog },
    ],
  },
  {
    id: 'eventual-consistency',
    name: 'Eventual Consistency',
    icon: Clock,
    color: '#8b5cf6',
    shortDesc: 'Data giữa các service sẽ consistent SAU MỘT KHOẢNG THỜI GIAN.',
    theory: [
      'CAP Theorem: Distributed system chỉ chọn được 2/3 (Consistency, Availability, Partition tolerance).',
      'Microservices chọn AP (Availability + Partition tolerance) → sacrifice strong consistency.',
      'Eventual = "cuối cùng sẽ consistent", không phải "ngay lập tức".',
      'Window of inconsistency: khoảng thời gian data chưa sync xong giữa services.',
      'Cần design UI/UX cho trường hợp data chưa consistent (loading states, retry).',
      'BASE model: Basically Available, Soft state, Eventually consistent (đối lập ACID).',
    ],
    relationships: [
      { target: 'saga', label: 'Saga là cách đạt eventual consistency', relIcon: Wrench },
      { target: 'outbox', label: 'Outbox đảm bảo events chắc chắn gửi', relIcon: Shield },
    ],
  },
  {
    id: 'outbox',
    name: 'Outbox Pattern',
    icon: Mailbox,
    color: '#ec4899',
    shortDesc: 'Lưu event + data cùng 1 DB transaction, gửi async sau.',
    theory: [
      'Problem: Save data OK → publish event FAIL = mất event = inconsistency vĩnh viễn.',
      'Solution: Lưu event vào OutboxMessage table CÙNG transaction với business data.',
      'Background job (polling/CDC) đọc OutboxMessage → publish lên message bus.',
      'Đảm bảo at-least-once delivery: event CHẮC CHẮN sẽ được gửi.',
      'Trade-off: thêm latency (background job interval), thêm complexity.',
      'CDC (Change Data Capture) như Debezium có thể thay polling cho throughput cao.',
    ],
    relationships: [
      { target: 'inbox', label: 'Cặp đôi: Outbox gửi → Inbox nhận', relIcon: Link2 },
      { target: 'eventual-consistency', label: 'Building block cho eventual consistency', relIcon: Cog },
      { target: 'saga', label: 'Mỗi Saga step publish qua Outbox', relIcon: Cog },
    ],
  },
  {
    id: 'inbox',
    name: 'Inbox + Idempotency',
    icon: ShieldCheck,
    color: '#06b6d4',
    shortDesc: 'Track message đã xử lý, tránh xử lý trùng khi retry.',
    theory: [
      'Message broker (RabbitMQ/Kafka) đảm bảo at-least-once → có thể deliver trùng.',
      'Inbox table lưu MessageId của message đã xử lý thành công.',
      'Nhận message → check MessageId trong Inbox → trùng thì skip, mới thì xử lý.',
      'Idempotency: xử lý 1 lần hay N lần → kết quả giống nhau.',
      'Idempotency key thường là MessageId hoặc combination (OrderId + Action).',
      'Quan trọng cho consumer: ReserveStock chạy 2 lần → không trừ stock 2 lần.',
    ],
    relationships: [
      { target: 'outbox', label: 'Consumer-side counterpart của Outbox', relIcon: Link2 },
      { target: 'saga', label: 'Mỗi Saga consumer cần Inbox', relIcon: Shield },
    ],
  },
];

/* ── Relationship diagram data ── */
const DIAGRAM_NODES = [
  { id: 'orchestration', x: 450, y: 60 },
  { id: 'choreography', x: 120, y: 60 },
  { id: 'saga', x: 285, y: 210 },
  { id: 'eventual-consistency', x: 510, y: 360 },
  { id: 'outbox', x: 120, y: 400 },
  { id: 'inbox', x: 380, y: 520 },
];

interface DiagramEdge {
  from: string;
  to: string;
  icon: LucideIcon;
  style?: string;
}

const DIAGRAM_EDGES: DiagramEdge[] = [
  { from: 'orchestration', to: 'saga', icon: Wrench },
  { from: 'choreography', to: 'eventual-consistency', icon: Link2, style: 'dashed' },
  { from: 'saga', to: 'eventual-consistency', icon: Link2 },
  { from: 'saga', to: 'outbox', icon: Cog },
  { from: 'outbox', to: 'inbox', icon: Link2 },
  { from: 'outbox', to: 'eventual-consistency', icon: Cog },
  { from: 'inbox', to: 'saga', icon: Shield },
  { from: 'orchestration', to: 'choreography', icon: Swords, style: 'dashed' },
];

export const ConceptTheory: React.FC = () => {
  const { isDark, t } = useTheme();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [activeNode, setActiveNode] = useState<string | null>(null);

  const getNode = (id: string) => DIAGRAM_NODES.find(n => n.id === id)!;
  const getConcept = (id: string) => CONCEPTS.find(c => c.id === id)!;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
      {/* LEFT: Relationship Map */}
      <div style={{
        borderRadius: 16, overflow: 'hidden',
        background: isDark ? 'rgba(40,42,54,0.8)' : 'rgba(255,255,255,0.8)',
        backdropFilter: 'blur(20px)',
        border: `1px solid ${t.border}`,
        padding: 20,
        position: 'sticky', top: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <GitBranch size={16} color={t.accent} />
          <span style={{ fontWeight: 800, fontSize: 14, color: t.text, letterSpacing: -0.3 }}>
            Concept Relationship Map
          </span>
        </div>
        <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 12 }}>
          Click vào concept để xem chi tiết bên phải →
        </div>
        <svg width="100%" height={580} viewBox="0 0 620 580" style={{ display: 'block' }}>
          <defs>
            <marker id="theory-arrow" viewBox="0 0 10 8" refX="10" refY="4" markerWidth="7" markerHeight="5" orient="auto-start-reverse">
              <path d="M0 0 L10 4 L0 8 z" fill={isDark ? '#6272a4' : '#94a3b8'} />
            </marker>
            <marker id="theory-arrow-hl" viewBox="0 0 10 8" refX="10" refY="4" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
              <path d="M0 0 L10 4 L0 8 z" fill={isDark ? '#bd93f9' : '#6366f1'} />
            </marker>
            <filter id="node-glow-theory">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Edges with icons */}
          {DIAGRAM_EDGES.map((edge, i) => {
            const from = getNode(edge.from);
            const to = getNode(edge.to);
            const fromC = getConcept(edge.from);
            const mx = (from.x + to.x) / 2;
            const my = (from.y + to.y) / 2;
            const isHighlighted = activeNode === edge.from || activeNode === edge.to
              || expanded === edge.from || expanded === edge.to;
            const EdgeIcon = edge.icon;
            return (
              <g key={i}>
                <line
                  x1={from.x} y1={from.y + 20} x2={to.x} y2={to.y - 20}
                  stroke={isHighlighted ? fromC.color : (isDark ? '#6272a4' : '#94a3b8')}
                  strokeWidth={isHighlighted ? 2.5 : 1.2}
                  strokeDasharray={edge.style === 'dashed' ? '6 4' : 'none'}
                  markerEnd={isHighlighted ? 'url(#theory-arrow-hl)' : 'url(#theory-arrow)'}
                  opacity={isHighlighted ? 1 : (isDark ? 0.5 : 0.7)}
                  style={{ transition: 'all 0.3s ease' }}
                />
                {/* Icon badge on edge midpoint */}
                <circle cx={mx} cy={my} r={12}
                  fill={isDark ? '#282a36' : '#f8fafc'}
                  stroke={isHighlighted ? fromC.color : (isDark ? '#44475a' : '#e2e8f0')}
                  strokeWidth={1.5}
                  style={{ transition: 'all 0.3s ease' }}
                />
                <foreignObject x={mx - 7} y={my - 7} width={14} height={14}>
                  <EdgeIcon size={14} color={isHighlighted ? fromC.color : (isDark ? '#6272a4' : '#94a3b8')} />
                </foreignObject>
              </g>
            );
          })}

          {/* Nodes */}
          {DIAGRAM_NODES.map(node => {
            const concept = getConcept(node.id);
            const Icon = concept.icon;
            const isActive = activeNode === node.id;
            const isSelected = expanded === node.id;
            return (
              <g key={node.id}
                onMouseEnter={() => setActiveNode(node.id)}
                onMouseLeave={() => setActiveNode(null)}
                onClick={() => setExpanded(expanded === node.id ? null : node.id)}
                style={{ cursor: 'pointer' }}
              >
                {(isActive || isSelected) && (
                  <circle cx={node.x} cy={node.y} r={30} fill={concept.color} opacity={0.12}
                    filter="url(#node-glow-theory)">
                    {isActive && <animate attributeName="r" values="30;36;30" dur="2s" repeatCount="indefinite" />}
                  </circle>
                )}
                <circle cx={node.x} cy={node.y} r={24}
                  fill={isDark ? (isSelected ? `${concept.color}20` : '#44475a') : (isSelected ? `${concept.color}10` : 'white')}
                  stroke={concept.color}
                  strokeWidth={isSelected ? 3 : isActive ? 2.5 : 2}
                  style={{ transition: 'all 0.3s ease' }}
                />
                <foreignObject x={node.x - 10} y={node.y - 10} width={20} height={20}>
                  <Icon size={20} color={concept.color} />
                </foreignObject>
                <text x={node.x} y={node.y + 42} textAnchor="middle" fontSize={11} fontWeight={700}
                  fill={isActive || isSelected ? concept.color : t.text}
                  style={{ transition: 'fill 0.3s ease' }}>
                  {concept.name}
                </text>
                {isSelected && (
                  <rect x={node.x - 4} y={node.y + 47} width={8} height={3} rx={1.5} fill={concept.color} />
                )}
              </g>
            );
          })}
        </svg>

        {/* Icon legend */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8,
          padding: '10px 12px', borderRadius: 10,
          background: isDark ? 'rgba(68,71,90,0.4)' : 'rgba(241,245,249,0.6)',
        }}>
          {([
            { icon: Wrench, label: 'Implements' },
            { icon: Swords, label: 'Đối lập' },
            { icon: Link2, label: 'Liên kết' },
            { icon: Shield, label: 'Bảo vệ' },
            { icon: Cog, label: 'Sử dụng' },
          ] as { icon: LucideIcon; label: string }[]).map(item => {
            const ItemIcon = item.icon;
            return (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <ItemIcon size={12} color={t.textMuted} />
                <span style={{ fontSize: 9, color: t.textMuted, fontWeight: 600 }}>{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT: Deep Dive */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Zap size={16} color={t.accent} />
          <span style={{ fontWeight: 800, fontSize: 14, color: t.text, letterSpacing: -0.3 }}>
            Deep Dive
          </span>
          {!expanded && (
            <span style={{ fontSize: 11, color: t.textMuted, marginLeft: 4 }}>
              ← Chọn concept từ map
            </span>
          )}
        </div>

        {expanded ? (() => {
          const concept = CONCEPTS.find(c => c.id === expanded);
          if (!concept) return null;
          const Icon = concept.icon;
          return (
            <div style={{
              borderRadius: 16,
              background: isDark ? 'rgba(68,71,90,0.5)' : 'rgba(255,255,255,0.8)',
              backdropFilter: 'blur(20px)',
              border: `2px solid ${concept.color}40`,
              overflow: 'hidden',
              animation: 'fadeIn 0.3s ease',
              boxShadow: `0 4px 24px ${concept.color}15`,
            }}>
              {/* Header */}
              <div style={{
                padding: '18px 20px',
                display: 'flex', alignItems: 'center', gap: 12,
                borderBottom: `1px solid ${concept.color}20`,
                background: isDark ? `${concept.color}08` : `${concept.color}05`,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: `${concept.color}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={20} color={concept.color} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 16, color: concept.color }}>
                    {concept.name}
                  </div>
                  <div style={{ fontSize: 12, color: t.textSecondary, marginTop: 2 }}>
                    {concept.shortDesc}
                  </div>
                </div>
              </div>

              {/* Theory bullets */}
              <div style={{ padding: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                  Lý thuyết chi tiết
                </div>
                <div style={{
                  background: isDark ? 'rgba(40,42,54,0.6)' : 'rgba(241,245,249,0.8)',
                  borderRadius: 12, padding: 16, marginBottom: 20,
                }}>
                  {concept.theory.map((line, i) => (
                    <div key={i} style={{
                      display: 'flex', gap: 10, marginBottom: i < concept.theory.length - 1 ? 10 : 0,
                      fontSize: 12, lineHeight: 1.7, color: t.text,
                    }}>
                      <span style={{
                        color: concept.color, fontWeight: 800, flexShrink: 0,
                        width: 20, height: 20, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: `${concept.color}12`, fontSize: 10,
                      }}>
                        {i + 1}
                      </span>
                      <span>{line}</span>
                    </div>
                  ))}
                </div>

                {/* Relationships */}
                {concept.relationships.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                      Mối quan hệ
                    </div>
                    {concept.relationships.map((rel, i) => {
                      const target = CONCEPTS.find(c => c.id === rel.target)!;
                      const RelIcon = rel.relIcon;
                      return (
                        <button key={i}
                          onClick={() => setExpanded(rel.target)}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                            padding: '10px 14px', marginBottom: 6, borderRadius: 10,
                            background: isDark ? 'rgba(68,71,90,0.4)' : 'rgba(241,245,249,0.6)',
                            border: `1px solid ${isDark ? '#44475a' : '#e2e8f0'}`,
                            cursor: 'pointer', textAlign: 'left',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <div style={{
                            width: 28, height: 28, borderRadius: 8,
                            background: `${target.color}12`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}>
                            <RelIcon size={14} color={target.color} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 12, color: target.color }}>
                              {target.name}
                            </div>
                            <div style={{ fontSize: 11, color: t.textSecondary, marginTop: 1 }}>
                              {rel.label}
                            </div>
                          </div>
                          <ArrowRight size={14} color={t.textMuted} />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })() : (
          /* Empty state */
          <div style={{
            padding: '60px 20px', textAlign: 'center', borderRadius: 16,
            background: isDark ? 'rgba(68,71,90,0.3)' : 'rgba(255,255,255,0.5)',
            border: `2px dashed ${t.border}`,
          }}>
            <GitBranch size={40} color={t.textMuted} style={{ marginBottom: 12 }} />
            <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 4 }}>
              Chọn concept từ map bên trái
            </div>
            <div style={{ fontSize: 12, color: t.textMuted }}>
              Click vào node để xem lý thuyết chi tiết
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
