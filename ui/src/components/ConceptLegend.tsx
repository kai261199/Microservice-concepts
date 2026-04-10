import React from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Crown, Sparkles, RefreshCw, Clock, Mailbox, ShieldCheck,
} from 'lucide-react';
import { useTheme } from '../ThemeContext';

interface ConceptInfo {
  name: string;
  icon: LucideIcon;
  color: string;
  problem: string;
  solution: string;
}

const CONCEPTS: ConceptInfo[] = [
  {
    name: 'Orchestration',
    icon: Crown,
    color: '#f59e0b',
    problem: 'Ai điều phối flow giữa nhiều service?',
    solution: 'Saga State Machine gửi COMMAND trực tiếp cho từng service.',
  },
  {
    name: 'Choreography',
    icon: Sparkles,
    color: '#10b981',
    problem: 'Làm sao service phản ứng mà không cần ai chỉ đạo?',
    solution: 'Service publish EVENT → ai lắng nghe thì tự xử lý.',
  },
  {
    name: 'Saga',
    icon: RefreshCw,
    color: '#6366f1',
    problem: 'Không thể dùng 1 DB transaction cho nhiều service?',
    solution: 'Chuỗi local transactions. Fail → compensating transaction rollback.',
  },
  {
    name: 'Eventual Consistency',
    icon: Clock,
    color: '#8b5cf6',
    problem: 'Mỗi service 1 DB → data không consistent ngay?',
    solution: 'Chấp nhận tạm inconsistent → data eventually consistent.',
  },
  {
    name: 'Outbox',
    icon: Mailbox,
    color: '#ec4899',
    problem: 'Save OK nhưng publish event fail → mất event?',
    solution: 'Lưu event + data cùng DB transaction. Background job gửi lên bus.',
  },
  {
    name: 'Inbox + Idempotency',
    icon: ShieldCheck,
    color: '#06b6d4',
    problem: 'RabbitMQ retry → consumer xử lý trùng?',
    solution: 'Track MessageId trong InboxState. Trùng → skip.',
  },
];

interface Props {
  activeConcept: string | null;
}

export const ConceptLegend: React.FC<Props> = ({ activeConcept }) => {
  const { isDark, t } = useTheme();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontWeight: 700, fontSize: 12, color: t.accent, letterSpacing: 0.5, textTransform: 'uppercase' }}>
        Concepts
      </div>
      {CONCEPTS.map((c) => {
        const isActive = activeConcept?.includes(c.name);
        const Icon = c.icon;
        return (
          <div
            key={c.name}
            style={{
              padding: '10px 14px',
              borderRadius: 14,
              background: isDark
                ? (isActive ? 'rgba(68,71,90,0.8)' : 'rgba(68,71,90,0.4)')
                : (isActive ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.5)'),
              backdropFilter: 'blur(20px)',
              border: `1.5px solid ${isActive ? c.color + '50' : t.border}`,
              transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
              transform: isActive ? 'scale(1.02)' : 'scale(1)',
              boxShadow: isActive ? `0 4px 20px ${c.color}15` : '0 2px 8px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{
                width: 24, height: 24, borderRadius: 8,
                background: isActive ? `${c.color}15` : (isDark ? '#44475a' : '#f1f5f9'),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.3s ease',
              }}>
                <Icon size={13} color={isActive ? c.color : t.textMuted} />
              </div>
              <span style={{
                fontWeight: 700, fontSize: 12,
                color: isActive ? c.color : t.text,
                transition: 'color 0.3s ease',
              }}>
                {c.name}
              </span>
            </div>
            <div style={{ fontSize: 10, color: t.textSecondary, marginBottom: 2, paddingLeft: 32 }}>
              <strong style={{ color: t.text }}>Q:</strong> {c.problem}
            </div>
            <div style={{
              fontSize: 10, paddingLeft: 32,
              color: isActive ? t.text : t.textSecondary,
              transition: 'color 0.3s ease',
            }}>
              <strong style={{ color: t.text }}>A:</strong> {c.solution}
            </div>
          </div>
        );
      })}
    </div>
  );
};
