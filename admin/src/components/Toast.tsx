import React, { useEffect, useState, useCallback } from 'react';

export interface ToastItem {
  id: string;
  type: 'fuel' | 'cleaning' | 'incident';
  title: string;
  message: string;
}

const ICONS: Record<string, string> = {
  fuel: '⛽',
  cleaning: '🧹',
  incident: '⚠️',
};

const COLORS: Record<string, string> = {
  fuel: 'border-l-green-500 bg-green-50',
  cleaning: 'border-l-blue-500 bg-blue-50',
  incident: 'border-l-red-500 bg-red-50',
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

    // Auto-dismiss after 5s
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  useEffect(() => {
    addToastGlobal = addToast;
    return () => {
      addToastGlobal = null;
    };
  }, [addToast]);

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto border-l-4 rounded-lg shadow-lg p-4 flex items-start gap-3 animate-slide-in ${COLORS[toast.type] || 'bg-white border-l-gray-400'}`}
          role="alert"
        >
          <span className="text-xl">{ICONS[toast.type] || '📌'}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-800">{toast.title}</p>
            <p className="text-xs text-gray-600 mt-0.5 truncate">{toast.message}</p>
          </div>
          <button
            onClick={() => dismiss(toast.id)}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          >
            x
          </button>
        </div>
      ))}
    </div>
  );
}
