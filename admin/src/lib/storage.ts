import { supabase } from './supabase';

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
