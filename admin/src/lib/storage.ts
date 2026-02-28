import JSZip from 'jszip';
import { supabase } from './supabase';

const STORAGE_LIMIT_MB = 500;
const WARNING_THRESHOLD_MB = 450;
const BUCKETS = ['receipts', 'cleanings', 'incidents'] as const;

export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn = 3600
): Promise<string | null> {
  if (!path) return null;

  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      console.error(`Erreur URL signée (${bucket}/${path}) :`, error.message);
      return null;
    }

    return data.signedUrl;
  } catch (err) {
    console.error('Erreur getSignedUrl :', err);
    return null;
  }
}

export async function getMultipleSignedUrls(
  bucket: string,
  paths: (string | null)[]
): Promise<(string | null)[]> {
  const results = await Promise.all(
    paths.map((path) => (path ? getSignedUrl(bucket, path) : Promise.resolve(null)))
  );
  return results;
}

// ── Storage monitoring ──

export interface StorageStats {
  totalMB: number;
  buckets: { name: string; sizeMB: number; fileCount: number }[];
  overThreshold: boolean;
}

export async function getStorageStats(): Promise<StorageStats> {
  const bucketStats: StorageStats['buckets'] = [];
  let totalBytes = 0;

  for (const bucket of BUCKETS) {
    const { data: files, error } = await supabase.storage.from(bucket).list('', { limit: 10000 });
    if (error || !files) {
      bucketStats.push({ name: bucket, sizeMB: 0, fileCount: 0 });
      continue;
    }

    // List nested folders (plates)
    let allFiles: { name: string; size: number; folder: string }[] = [];
    for (const item of files) {
      if (!item.metadata) {
        // It's a folder — list its contents
        const { data: nested } = await supabase.storage.from(bucket).list(item.name, { limit: 10000 });
        if (nested) {
          for (const f of nested) {
            if (f.metadata) {
              allFiles.push({ name: `${item.name}/${f.name}`, size: (f.metadata as any).size || 0, folder: item.name });
            }
          }
        }
      } else {
        allFiles.push({ name: item.name, size: (item.metadata as any).size || 0, folder: '' });
      }
    }

    const bucketBytes = allFiles.reduce((sum, f) => sum + f.size, 0);
    totalBytes += bucketBytes;
    bucketStats.push({
      name: bucket,
      sizeMB: Math.round((bucketBytes / (1024 * 1024)) * 100) / 100,
      fileCount: allFiles.length,
    });
  }

  const totalMB = Math.round((totalBytes / (1024 * 1024)) * 100) / 100;
  return { totalMB, buckets: bucketStats, overThreshold: totalMB >= WARNING_THRESHOLD_MB };
}

// ── ZIP export + cleanup ──

interface VehiclePhotoMap {
  [plate: string]: {
    carburant: { path: string; bucket: string }[];
    nettoyage: { path: string; bucket: string }[];
    incident: { path: string; bucket: string }[];
  };
}

export async function exportPhotosAndCleanup(
  onProgress?: (msg: string) => void
): Promise<Blob> {
  const log = (msg: string) => onProgress?.(msg);

  log('Collecte des donnees...');

  // Fetch all records with photos
  const [fillsRes, cleaningsRes, incidentsRes] = await Promise.all([
    supabase.from('fuel_fills').select('id, receipt_photo_url, vehicles!inner(plate)'),
    supabase.from('cleanings').select('id, receipt_photo_url, vehicle_state_photo_url, vehicles!inner(plate)'),
    supabase.from('incidents').select('id, photo_url, vehicles!inner(plate)'),
  ]);

  const photoMap: VehiclePhotoMap = {};
  const ensurePlate = (plate: string) => {
    if (!photoMap[plate]) photoMap[plate] = { carburant: [], nettoyage: [], incident: [] };
  };

  // Fuel fills
  for (const row of (fillsRes.data ?? []) as any[]) {
    const plate = row.vehicles?.plate;
    if (!plate) continue;
    ensurePlate(plate);
    if (row.receipt_photo_url) {
      photoMap[plate].carburant.push({ path: row.receipt_photo_url, bucket: 'receipts' });
    }
  }

  // Cleanings
  for (const row of (cleaningsRes.data ?? []) as any[]) {
    const plate = row.vehicles?.plate;
    if (!plate) continue;
    ensurePlate(plate);
    if (row.receipt_photo_url) {
      photoMap[plate].nettoyage.push({ path: row.receipt_photo_url, bucket: 'cleanings' });
    }
    if (row.vehicle_state_photo_url) {
      photoMap[plate].nettoyage.push({ path: row.vehicle_state_photo_url, bucket: 'cleanings' });
    }
  }

  // Incidents
  for (const row of (incidentsRes.data ?? []) as any[]) {
    const plate = row.vehicles?.plate;
    if (!plate) continue;
    ensurePlate(plate);
    if (row.photo_url) {
      photoMap[plate].incident.push({ path: row.photo_url, bucket: 'incidents' });
    }
  }

  // Build ZIP
  log('Creation du ZIP...');
  const zip = new JSZip();
  let downloaded = 0;
  let totalPhotos = 0;

  for (const plate of Object.keys(photoMap)) {
    for (const cat of ['carburant', 'nettoyage', 'incident'] as const) {
      totalPhotos += photoMap[plate][cat].length;
    }
  }

  for (const plate of Object.keys(photoMap)) {
    for (const cat of ['carburant', 'nettoyage', 'incident'] as const) {
      const photos = photoMap[plate][cat];
      for (let i = 0; i < photos.length; i++) {
        const { path, bucket } = photos[i];
        const { data } = await supabase.storage.from(bucket).download(path);
        if (data) {
          const ext = path.split('.').pop() || 'jpg';
          const fileName = `${plate}/${cat}/${cat}_${i + 1}.${ext}`;
          zip.file(fileName, data);
        }
        downloaded++;
        log(`Telechargement ${downloaded}/${totalPhotos}...`);
      }
    }
  }

  log('Compression du ZIP...');
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });

  // Cleanup — delete all files from storage
  log('Nettoyage du stockage...');
  for (const bucket of BUCKETS) {
    const { data: topLevel } = await supabase.storage.from(bucket).list('', { limit: 10000 });
    if (!topLevel) continue;

    for (const item of topLevel) {
      if (!item.metadata) {
        // Folder — list and delete contents
        const { data: nested } = await supabase.storage.from(bucket).list(item.name, { limit: 10000 });
        if (nested && nested.length > 0) {
          const paths = nested.map((f) => `${item.name}/${f.name}`);
          await supabase.storage.from(bucket).remove(paths);
        }
      } else {
        await supabase.storage.from(bucket).remove([item.name]);
      }
    }
  }

  log('Termine !');
  return blob;
}
