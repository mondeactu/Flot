const VISION_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY!;
const VISION_URL = `https://vision.googleapis.com/v1/images:annotate?key=${VISION_API_KEY}`;

export interface OCRResult {
  priceHT: number | null;
  priceTTC: number | null;
  liters: number | null;
  km: number | null;
  fuelType: string | null;
  rawText: string;
  confidence: {
    priceHT: boolean;
    priceTTC: boolean;
    liters: boolean;
    km: boolean;
    fuelType: boolean;
  };
}

function parseNumber(text: string): number | null {
  const cleaned = text.replace(',', '.').replace(/\s/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function findNearbyValue(
  fullText: string,
  keywords: string[],
  pattern: RegExp
): { value: number | null; confident: boolean } {
  const lines = fullText.split('\n');

  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    const hasKeyword = keywords.some((kw) => lowerLine.includes(kw));
    if (hasKeyword) {
      const match = line.match(pattern);
      if (match) {
        return { value: parseNumber(match[0]), confident: true };
      }
    }
  }

  // Fallback: search entire text
  const match = fullText.match(pattern);
  if (match) {
    return { value: parseNumber(match[0]), confident: false };
  }

  return { value: null, confident: false };
}

function detectFuelType(fullText: string): { value: string | null; confident: boolean } {
  const lower = fullText.toLowerCase();

  const dieselKeywords = ['diesel', 'gazole', 'gasoil', 'gas-oil', 'gnr', 'b7', 'xtl'];
  const essenceKeywords = ['essence', 'sp95', 'sp98', 'sp 95', 'sp 98', 'e10', 'e85', 'sans plomb', 'super', 'e5'];

  const hasDiesel = dieselKeywords.some((kw) => lower.includes(kw));
  const hasEssence = essenceKeywords.some((kw) => lower.includes(kw));

  if (hasDiesel && !hasEssence) return { value: 'diesel', confident: true };
  if (hasEssence && !hasDiesel) return { value: 'essence', confident: true };
  if (hasDiesel && hasEssence) return { value: 'diesel', confident: false };

  return { value: null, confident: false };
}

export async function recognizeReceipt(base64Image: string): Promise<OCRResult> {
  const body = {
    requests: [
      {
        image: { content: base64Image },
        features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
      },
    ],
  };

  const response = await fetch(VISION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erreur OCR : ${response.status} — ${errorText}`);
  }

  const data = await response.json();
  const annotations = data.responses?.[0]?.textAnnotations;

  if (!annotations || annotations.length === 0) {
    return {
      priceHT: null,
      priceTTC: null,
      liters: null,
      km: null,
      fuelType: null,
      rawText: '',
      confidence: {
        priceHT: false,
        priceTTC: false,
        liters: false,
        km: false,
        fuelType: false,
      },
    };
  }

  const fullText = annotations[0].description || '';

  // Detect fuel type from OCR text
  const fuelTypeResult = detectFuelType(fullText);

  // HT price
  const htResult = findNearbyValue(
    fullText,
    ['ht', 'h.t.', 'hors taxe', 'hors taxes'],
    /\d+[.,]\d{2}/
  );

  // TTC price
  const ttcResult = findNearbyValue(
    fullText,
    ['ttc', 't.t.c.', 'total', 'à payer', 'a payer', 'montant'],
    /\d+[.,]\d{2}/
  );

  // Liters
  const litersResult = findNearbyValue(
    fullText,
    ['l', 'litres', 'litre', 'volume', 'qté'],
    /\d+[.,]\d{2,3}/
  );

  // KM
  const kmResult = findNearbyValue(
    fullText,
    ['km', 'kilométrage', 'kilometrage', 'odomètre'],
    /\d{4,6}/
  );

  return {
    priceHT: htResult.value,
    priceTTC: ttcResult.value,
    liters: litersResult.value,
    km: kmResult.value,
    fuelType: fuelTypeResult.value,
    rawText: fullText,
    confidence: {
      priceHT: htResult.confident,
      priceTTC: ttcResult.confident,
      liters: litersResult.confident,
      km: kmResult.confident,
      fuelType: fuelTypeResult.confident,
    },
  };
}

export async function recognizeCleaningReceipt(base64Image: string): Promise<{
  priceTTC: number | null;
  confident: boolean;
}> {
  const result = await recognizeReceipt(base64Image);
  return {
    priceTTC: result.priceTTC,
    confident: result.confidence.priceTTC,
  };
}
