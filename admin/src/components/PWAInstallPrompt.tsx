import React, { useEffect, useState } from 'react';
import { Truck } from 'lucide-react';

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
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white border border-gray-200 rounded-xl shadow-lg p-4 z-50 flex items-center gap-3">
      <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0"><Truck size={20} className="text-green-700" /></div>
      <div className="flex-1">
        <p className="text-sm font-bold text-gray-800">Installer Flot Admin</p>
        <p className="text-xs text-gray-500">Acces rapide depuis l'ecran d'accueil</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => setDismissed(true)}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Plus tard
        </button>
        <button
          onClick={handleInstall}
          className="bg-green-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-green-800"
        >
          Installer
        </button>
      </div>
    </div>
  );
}
