import React, { useEffect, useState } from 'react';
import { getSignedUrl } from '../lib/storage';

interface PhotoViewerProps {
  bucket: string;
  path: string | null;
  alt?: string;
  className?: string;
}

export default function PhotoViewer({ bucket, path, alt = 'Photo', className = '' }: PhotoViewerProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!path) {
      setLoading(false);
      return;
    }
    getSignedUrl(bucket, path).then((u) => {
      setUrl(u);
      setLoading(false);
    });
  }, [bucket, path]);

  if (!path) return <span className="text-ink-faint text-sm">Pas de photo</span>;
  if (loading) return <div className="w-16 h-16 bg-surface animate-pulse rounded" />;
  if (!url) return <span className="text-red-400 text-sm">Erreur photo</span>;

  return (
    <>
      <img
        src={url}
        alt={alt}
        className={`cursor-pointer rounded object-cover ${className || 'w-16 h-16'}`}
        onClick={() => setFullscreen(true)}
        loading="lazy"
      />
      {fullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setFullscreen(false)}
        >
          <img
            src={url}
            alt={alt}
            className="max-w-full max-h-full rounded-lg shadow-2xl"
          />
          <button
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors"
            onClick={() => setFullscreen(false)}
          >
            <span className="text-white text-lg font-light">X</span>
          </button>
        </div>
      )}
    </>
  );
}
