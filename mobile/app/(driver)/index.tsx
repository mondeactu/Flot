import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Keyboard,
} from 'react-native';
import { useAuthStore } from '../../stores/auth.store';
import { supabase } from '../../lib/supabase';
import { recognizeReceipt, type OCRResult } from '../../lib/ocr';
import PhotoCapture from '../../components/PhotoCapture';
import OCRForm from '../../components/OCRForm';
import { addToQueue, savePhotoLocally } from '../../lib/offline-queue';
import { sendLocalNotification } from '../../lib/notifications';
import NetInfo from '@react-native-community/netinfo';

type Step = 'idle' | 'camera' | 'ocr' | 'success';

export default function FuelScreen() {
  const { user, vehicle } = useAuthStore();
  const [step, setStep] = useState<Step>('idle');
  const [ocrLoading, setOcrLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [ocrError, setOcrError] = useState(false);
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
    setOcrError(false);

    try {
      await fetchPreviousKm();
      const result = await recognizeReceipt(base64);
      setOcrResult(result);
      setStep('ocr');
    } catch (err) {
      setOcrError(true);
    } finally {
      setOcrLoading(false);
    }
  };

  const handleSubmit = async (data: {
    priceHT: number;
    priceTTC: number;
    liters: number | null;
    km: number;
    fuelType: string;
  }) => {
    if (!user?.id || !vehicle?.id) return;
    setSubmitLoading(true);

    try {
      const netState = await NetInfo.fetch();
      const timestamp = Date.now();
      const storagePath = `${vehicle.id}/${timestamp}.jpg`;

      if (netState.isConnected) {
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
          fuel_type: data.fuelType,
        });

        if (error) throw error;

        try {
          await supabase.functions.invoke('check-alerts', {
            body: { type: 'high_consumption', fuel_fill_id: 'latest' },
          });
        } catch {
          // Non-blocking
        }
      } else {
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
            fuel_type: data.fuelType,
          },
          localUri,
          'receipts',
          storagePath
        );
      }

      await sendLocalNotification('Plein enregistre', `${data.priceTTC.toFixed(2)} EUR — ${data.km} km`);
      setStep('success');
      setTimeout(() => resetScreen(), 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'enregistrement";
      Alert.alert('Erreur', msg);
    } finally {
      setSubmitLoading(false);
    }
  };

  const resetScreen = () => {
    setStep('idle');
    setOcrResult(null);
    setOcrError(false);
    setPhotoBase64('');
    setPhotoUri('');
    setPreviousKm(null);
  };

  if (step === 'success') {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successEmoji}>✅</Text>
        <Text style={styles.successText}>Plein enregistre !</Text>
      </View>
    );
  }

  if (ocrLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>Lecture du ticket...</Text>
      </View>
    );
  }

  // Error screen with retry
  if (ocrError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorEmoji}>❌</Text>
        <Text style={styles.errorTitle}>Impossible de lire le ticket</Text>
        <Text style={styles.errorSubtitle}>
          La photo n'est pas assez claire ou le texte est illisible
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setOcrError(false);
            setStep('camera');
          }}
        >
          <Text style={styles.retryButtonText}>Reessayer</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.manualButton}
          onPress={() => {
            setOcrError(false);
            setOcrResult({
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
            });
            setStep('ocr');
          }}
        >
          <Text style={styles.manualButtonText}>Saisir manuellement</Text>
        </TouchableOpacity>
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

  if (step === 'camera') {
    return (
      <View style={styles.container}>
        <PhotoCapture onPhotoTaken={handlePhotoTaken} label="Photo du ticket de caisse" />
      </View>
    );
  }

  // Idle — show scan button
  return (
    <View style={styles.idleContainer}>
      <Text style={styles.idleEmoji}>⛽</Text>
      <Text style={styles.idleTitle}>Enregistrer un plein</Text>
      <Text style={styles.idleSubtitle}>
        Prenez en photo votre ticket de caisse
      </Text>
      <TouchableOpacity
        style={styles.scanButton}
        onPress={() => setStep('camera')}
        accessibilityLabel="Scanner un recu"
      >
        <Text style={styles.scanButtonText}>📷  Scanner un recu</Text>
      </TouchableOpacity>
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
  idleContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5', padding: 32 },
  idleEmoji: { fontSize: 72, marginBottom: 16 },
  idleTitle: { fontSize: 24, fontWeight: '800', color: '#333', marginBottom: 8 },
  idleSubtitle: { fontSize: 16, color: '#777', textAlign: 'center', marginBottom: 32 },
  scanButton: { backgroundColor: '#2E7D32', paddingHorizontal: 32, paddingVertical: 18, borderRadius: 14 },
  scanButtonText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  // Error screen
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF3F3', padding: 32 },
  errorEmoji: { fontSize: 64, marginBottom: 16 },
  errorTitle: { fontSize: 20, fontWeight: '700', color: '#D32F2F', marginBottom: 8 },
  errorSubtitle: { fontSize: 14, color: '#777', textAlign: 'center', marginBottom: 32 },
  retryButton: { backgroundColor: '#2E7D32', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 14, marginBottom: 12 },
  retryButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  manualButton: { backgroundColor: '#757575', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14 },
  manualButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
