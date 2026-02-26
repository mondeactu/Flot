import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuthStore } from '../../stores/auth.store';
import { supabase } from '../../lib/supabase';
import { recognizeReceipt, type OCRResult } from '../../lib/ocr';
import PhotoCapture from '../../components/PhotoCapture';
import OCRForm from '../../components/OCRForm';
import { addToQueue, savePhotoLocally } from '../../lib/offline-queue';
import { sendLocalNotification } from '../../lib/notifications';
import NetInfo from '@react-native-community/netinfo';

type Step = 'camera' | 'ocr' | 'success';

export default function FuelScreen() {
  const { user, vehicle } = useAuthStore();
  const [step, setStep] = useState<Step>('camera');
  const [ocrLoading, setOcrLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [photoBase64, setPhotoBase64] = useState('');
  const [photoUri, setPhotoUri] = useState('');
  const [previousKm, setPreviousKm] = useState<number | null>(null);

  const fetchPreviousKm = useCallback(async () => {
    if (!vehicle?.id) return;
    const { data } = await supabase
      .from('fuel_fills')
      .select('km_at_fill')
      .eq('vehicle_id', vehicle.id)
      .order('filled_at', { ascending: false })
      .limit(1)
      .single();

    setPreviousKm(data?.km_at_fill ?? null);
  }, [vehicle?.id]);

  const handlePhotoTaken = async (base64: string, uri: string) => {
    setPhotoBase64(base64);
    setPhotoUri(uri);
    setOcrLoading(true);

    try {
      await fetchPreviousKm();
      const result = await recognizeReceipt(base64);
      setOcrResult(result);
      setStep('ocr');
    } catch (err) {
      Alert.alert('Erreur OCR', 'Impossible de lire le ticket. Remplissez les champs manuellement.');
      setOcrResult({
        priceHT: null,
        priceTTC: null,
        liters: null,
        km: null,
        stationName: null,
        rawText: '',
        confidence: {
          priceHT: false,
          priceTTC: false,
          liters: false,
          km: false,
          stationName: false,
        },
      });
      setStep('ocr');
    } finally {
      setOcrLoading(false);
    }
  };

  const handleSubmit = async (data: {
    priceHT: number;
    priceTTC: number;
    liters: number | null;
    km: number;
    stationName: string;
  }) => {
    if (!user?.id || !vehicle?.id) return;
    setSubmitLoading(true);

    try {
      const netState = await NetInfo.fetch();
      const timestamp = Date.now();
      const storagePath = `${vehicle.id}/${timestamp}.jpg`;

      if (netState.isConnected) {
        // Online: upload photo + submit record
        let receiptUrl: string | null = null;

        if (photoBase64) {
          const byteArray = Uint8Array.from(atob(photoBase64), (c) => c.charCodeAt(0));
          const { error: uploadErr } = await supabase.storage
            .from('receipts')
            .upload(storagePath, byteArray, {
              contentType: 'image/jpeg',
              upsert: true,
            });

          if (uploadErr) throw uploadErr;
          receiptUrl = storagePath;
        }

        const { error } = await supabase.from('fuel_fills').insert({
          vehicle_id: vehicle.id,
          driver_id: user.id,
          receipt_photo_url: receiptUrl,
          price_ht: data.priceHT,
          price_ttc: data.priceTTC,
          liters: data.liters,
          km_at_fill: data.km,
          station_name: data.stationName,
        });

        if (error) throw error;

        // Trigger consumption check
        try {
          await supabase.functions.invoke('check-alerts', {
            body: { type: 'high_consumption', fuel_fill_id: 'latest' },
          });
        } catch {
          // Non-blocking
        }
      } else {
        // Offline: save locally
        const localUri = await savePhotoLocally(photoUri, `receipt_${timestamp}.jpg`);
        await addToQueue(
          'fuel_fill',
          {
            vehicle_id: vehicle.id,
            driver_id: user.id,
            price_ht: data.priceHT,
            price_ttc: data.priceTTC,
            liters: data.liters,
            km_at_fill: data.km,
            station_name: data.stationName,
          },
          localUri,
          'receipts',
          storagePath
        );
      }

      await sendLocalNotification('✅ Plein enregistré', `${data.priceTTC.toFixed(2)} € — ${data.km} km`);
      setStep('success');
      setTimeout(() => resetScreen(), 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement';
      Alert.alert('Erreur', msg);
    } finally {
      setSubmitLoading(false);
    }
  };

  const resetScreen = () => {
    setStep('camera');
    setOcrResult(null);
    setPhotoBase64('');
    setPhotoUri('');
    setPreviousKm(null);
  };

  if (step === 'success') {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successEmoji}>✅</Text>
        <Text style={styles.successText}>Plein enregistré !</Text>
      </View>
    );
  }

  if (ocrLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>Lecture en cours...</Text>
      </View>
    );
  }

  if (step === 'ocr' && ocrResult) {
    return (
      <OCRForm
        ocrResult={ocrResult}
        previousKm={previousKm}
        onSubmit={handleSubmit}
        loading={submitLoading}
      />
    );
  }

  return (
    <View style={styles.container}>
      <PhotoCapture onPhotoTaken={handlePhotoTaken} label="Photo du ticket de caisse" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#555' },
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E8F5E9' },
  successEmoji: { fontSize: 64, marginBottom: 16 },
  successText: { fontSize: 22, fontWeight: '700', color: '#2E7D32' },
});
