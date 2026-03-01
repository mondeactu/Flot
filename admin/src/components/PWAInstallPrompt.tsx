import React, { useEffect, useState } from 'react';
import { Truck, Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!deferredPrompt || dismissed) return null;

  const handleInstall = async () => {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white rounded-2xl shadow-elevated p-4 z-50 flex items-center gap-3 border border-border-light animate-fade-in">
      <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0">
        <Truck size={20} className="text-brand-700" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold text-ink">Installer Flot Admin</p>
        <p className="text-[11px] text-ink-muted">Acces rapide depuis l'ecran d'accueil</p>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <button onClick={() => setDismissed(true)} className="text-xs text-ink-muted hover:text-ink transition-colors">
          Plus tard
        </button>
        <button onClick={handleInstall} className="btn-primary text-xs py-1.5 px-3">
          <Download size={12} /> OK
        </button>
      </div>
    </div>
  );
}
