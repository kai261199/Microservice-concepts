import {
  Crown, Sparkles, RefreshCw, Clock, Mailbox, ShieldCheck,
  GitMerge, Database, Layers, ArrowRightLeft, Map, Repeat,
  Server, MessageSquare, Zap, Lock,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface KnowledgeTopic {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string;
  category: 'concept' | 'library' | 'pattern';
}

export const KNOWLEDGE_CATEGORIES = [
  { id: 'concept' as const, label: '🧠 Concepts', desc: 'Các khái niệm kiến trúc cốt lõi' },
  { id: 'library' as const, label: '📦 Libraries', desc: 'Thư viện & công cụ .NET thường dùng' },
  { id: 'pattern' as const, label: '🏗️ Patterns', desc: 'Design patterns cho microservices' },
];

export const KNOWLEDGE_TOPICS: KnowledgeTopic[] = [
  // ── CONCEPTS ──
  { id: 'orchestration', name: 'Orchestration', icon: Crown, color: '#f59e0b', category: 'concept' },
  { id: 'choreography', name: 'Choreography', icon: Sparkles, color: '#10b981', category: 'concept' },
  { id: 'event-sourcing', name: 'Event Sourcing', icon: Database, color: '#8b5cf6', category: 'concept' },
  { id: 'eventual-consistency', name: 'Eventual Consistency', icon: Clock, color: '#6366f1', category: 'concept' },
  { id: 'distributed-transaction', name: 'Distributed Transaction (2PC)', icon: Lock, color: '#dc2626', category: 'concept' },
  // ── LIBRARIES ──
  { id: 'ef-core', name: 'Entity Framework Core', icon: Database, color: '#3b82f6', category: 'library' },
  { id: 'mediatr', name: 'MediatR', icon: ArrowRightLeft, color: '#f97316', category: 'library' },
  { id: 'automapper', name: 'AutoMapper', icon: Map, color: '#14b8a6', category: 'library' },
  { id: 'rabbitmq', name: 'RabbitMQ', icon: MessageSquare, color: '#ff6600', category: 'library' },
  { id: 'redis', name: 'Redis', icon: Zap, color: '#ef4444', category: 'library' },
  // ── PATTERNS ──
  { id: 'saga', name: 'Saga Pattern', icon: RefreshCw, color: '#6366f1', category: 'pattern' },
  { id: 'cqrs', name: 'CQRS Pattern', icon: GitMerge, color: '#ec4899', category: 'pattern' },
  { id: 'repository', name: 'Repository Pattern', icon: Layers, color: '#8b5cf6', category: 'pattern' },
  { id: 'outbox', name: 'Outbox Pattern', icon: Mailbox, color: '#ec4899', category: 'pattern' },
  { id: 'inbox', name: 'Inbox Pattern', icon: ShieldCheck, color: '#06b6d4', category: 'pattern' },
];
