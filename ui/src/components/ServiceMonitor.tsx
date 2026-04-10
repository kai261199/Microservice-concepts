import React from 'react';
import { Product, OrderResult, Payment, StockReservation } from '../types';
import {
  Package, Warehouse, CreditCard, ClipboardList,
  Clock, CheckCircle2, XCircle, RotateCcw, Loader2,
} from 'lucide-react';

interface Props {
  products: Product[];
  order: OrderResult | null;
  payment: Payment | null;
  reservations: StockReservation[];
}

export const ServiceMonitor: React.FC<Props> = ({ products, order, payment, reservations }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <MonitorCard title="Order Service" port="5001" color="#6366f1"
        icon={<Package size={14} />} visible>
        {order ? (
          <div style={{ fontSize: 12 }}>
            <Row label="Order ID" value={order.orderId.slice(0, 8) + '…'} />
            <Row label="Status" value={<StatusBadge status={order.status} />} />
            <Row label="Amount" value={`$${order.totalAmount.toFixed(2)}`} />
            {order.failureReason && (
              <Row label="Reason" value={<span style={{ color: '#ef4444' }}>{order.failureReason}</span>} />
            )}
            <Row label="Created" value={new Date(order.createdAt).toLocaleTimeString()} />
          </div>
        ) : (
          <div style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 11 }}>Waiting for order…</div>
        )}
      </MonitorCard>

      <MonitorCard title="Inventory Service" port="5003" color="#8b5cf6"
        icon={<Warehouse size={14} />} visible>
        <div style={{ fontSize: 12 }}>
          {products.length === 0 && (
            <div style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 11 }}>No connection</div>
          )}
          {products.map((p) => (
            <div key={p.id} style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '4px 0', borderBottom: '1px solid #f1f5f9',
            }}>
              <span style={{ color: '#64748b', fontSize: 11 }}>{p.name}</span>
              <span style={{
                fontWeight: 700, fontSize: 11,
                color: p.stockQuantity > 0 ? '#10b981' : '#ef4444',
              }}>
                {p.stockQuantity}
              </span>
            </div>
          ))}
        </div>
      </MonitorCard>

      <MonitorCard title="Payment Service" port="5036" color="#ec4899"
        icon={<CreditCard size={14} />} visible>
        {payment ? (
          <div style={{ fontSize: 12 }}>
            <Row label="Payment ID" value={payment.id.slice(0, 8) + '…'} />
            <Row label="Status" value={<StatusBadge status={payment.status} />} />
            <Row label="Amount" value={`$${payment.amount.toFixed(2)}`} />
            {payment.failureReason && (
              <Row label="Reason" value={<span style={{ color: '#ef4444' }}>{payment.failureReason}</span>} />
            )}
          </div>
        ) : (
          <div style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 11 }}>Waiting for payment…</div>
        )}
      </MonitorCard>

      <MonitorCard title="Stock Reservations" port="" color="#f59e0b"
        icon={<ClipboardList size={14} />} visible>
        <div style={{ fontSize: 12 }}>
          {reservations.length === 0 && (
            <div style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 11 }}>No reservations yet</div>
          )}
          {reservations.map((r) => (
            <div key={r.id} style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '4px 0', borderBottom: '1px solid #f1f5f9',
            }}>
              <span style={{ color: '#64748b', fontSize: 11 }}>Qty: {r.quantity}</span>
              <span style={{
                fontWeight: 600, fontSize: 11, display: 'flex', alignItems: 'center', gap: 4,
                color: r.isReleased ? '#f97316' : '#10b981',
              }}>
                {r.isReleased ? <><RotateCcw size={10} /> Released</> : <><CheckCircle2 size={10} /> Reserved</>}
              </span>
            </div>
          ))}
        </div>
      </MonitorCard>
    </div>
  );
};

const MonitorCard: React.FC<{
  title: string; port: string; color: string; icon: React.ReactNode;
  visible: boolean; children: React.ReactNode;
}> = ({ title, port, color, icon, visible, children }) => (
  <div style={{
    borderRadius: 14, overflow: 'hidden',
    background: 'white',
    border: `1px solid ${visible ? color + '20' : '#e8ecf0'}`,
    borderLeft: `3px solid ${visible ? color : '#e2e8f0'}`,
    boxShadow: visible ? `0 2px 12px ${color}10, 0 1px 3px rgba(0,0,0,0.05)` : '0 1px 3px rgba(0,0,0,0.04)',
    opacity: visible ? 1 : 0.4,
    transition: 'all 0.4s ease',
  }}>
    <div style={{
      padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      background: `${color}08`, borderBottom: `1px solid ${color}10`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color }}>{icon}</span>
        <span style={{ fontWeight: 700, fontSize: 11, color }}>{title}</span>
      </div>
      {port && <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>:{port}</span>}
    </div>
    <div style={{ padding: '10px 14px' }}>{children}</div>
  </div>
);

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', padding: '3px 0',
    borderBottom: '1px solid #f1f5f9',
  }}>
    <span style={{ color: '#94a3b8', fontSize: 11 }}>{label}</span>
    <span style={{ fontWeight: 600, fontSize: 11, color: '#334155' }}>{value}</span>
  </div>
);

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config: Record<string, { color: string; icon: React.ReactNode }> = {
    Pending:            { color: '#f59e0b', icon: <Clock size={10} /> },
    Completed:          { color: '#10b981', icon: <CheckCircle2 size={10} /> },
    Failed:             { color: '#ef4444', icon: <XCircle size={10} /> },
    StockReserving:     { color: '#8b5cf6', icon: <Loader2 size={10} /> },
    PaymentProcessing:  { color: '#ec4899', icon: <Loader2 size={10} /> },
    Compensating:       { color: '#f97316', icon: <RotateCcw size={10} /> },
  };
  const c = config[status] || { color: '#64748b', icon: null };
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700,
      background: `${c.color}12`, color: c.color,
      display: 'inline-flex', alignItems: 'center', gap: 4,
    }}>
      {c.icon} {status}
    </span>
  );
};
