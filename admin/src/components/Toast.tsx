import React, { useEffect, useState, useCallback } from 'react';
import { Fuel, Sparkles, AlertTriangle, X } from 'lucide-react';

export interface ToastItem {
  id: string;
  type: 'fuel' | 'cleaning' | 'incident';
  title: string;
  message: string;
}

const ICONS: Record<string, React.ReactNode> = {
  fuel: <Fuel size={18} className="text-brand-700" />,
  cleaning: <Sparkles size={18} className="text-blue-600" />,
  incident: <AlertTriangle size={18} className="text-red-500" />,
};

const COLORS: Record<string, string> = {
  fuel: 'border-l-brand-600',
  cleaning: 'border-l-blue-500',
  incident: 'border-l-red-500',
};

let addToastGlobal: ((toast: Omit<ToastItem, 'id'>) => void) | null = null;

export function showToast(toast: Omit<ToastItem, 'id'>) {
  addToastGlobal?.(toast);
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  useEffect(() => {
    addToastGlobal = addToast;
    return () => { addToastGlobal = null; };
  }, [addToast]);

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto border-l-4 bg-white rounded-xl shadow-elevated p-4 flex items-start gap-3 animate-slide-in ${COLORS[toast.type] || 'border-l-gray-400'}`}
          role="alert"
        >
          <span className="flex-shrink-0 mt-0.5">{ICONS[toast.type] || <AlertTriangle size={18} className="text-ink-muted" />}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-ink">{toast.title}</p>
            <p className="text-xs text-ink-secondary mt-0.5 truncate">{toast.message}</p>
          </div>
          <button onClick={() => dismiss(toast.id)} className="text-ink-faint hover:text-ink-secondary flex-shrink-0 transition-colors">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
