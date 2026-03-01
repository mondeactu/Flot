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
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/auth.store';
import { supabase } from '../../lib/supabase';
import { recognizeReceipt, type OCRResult } from '../../lib/ocr';
import PhotoCapture from '../../components/PhotoCapture';
import OCRForm from '../../components/OCRForm';
import { addToQueue, savePhotoLocally } from '../../lib/offline-queue';
import { sendLocalNotification } from '../../lib/notifications';
import NetInfo from '@react-native-community/netinfo';
import { colors, spacing, radius, typography, shadows } from '../../constants/theme';

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
        <View style={styles.successIcon}>
          <Feather name="check-circle" size={64} color={colors.brand} />
        </View>
        <Text style={styles.successText}>Plein enregistre !</Text>
      </View>
    );
  }

  if (ocrLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.brand} />
        <Text style={styles.loadingText}>Lecture du ticket...</Text>
      </View>
    );
  }

  // Error screen with retry
  if (ocrError) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorIcon}>
          <Feather name="x-circle" size={64} color={colors.error} />
        </View>
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
      <View style={styles.idleIcon}>
        <Feather name="droplet" size={48} color={colors.brand} />
      </View>
      <Text style={styles.idleTitle}>Enregistrer un plein</Text>
      <Text style={styles.idleSubtitle}>
        Prenez en photo votre ticket de caisse
      </Text>
      <TouchableOpacity
        style={styles.scanButton}
        onPress={() => setStep('camera')}
        accessibilityLabel="Scanner un recu"
      >
        <View style={styles.scanButtonRow}>
          <Feather name="camera" size={22} color={colors.inkOnDark} />
          <Text style={styles.scanButtonText}>Scanner un recu</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  loadingText: {
    marginTop: spacing.lg,
    ...typography.body,
    color: colors.inkSecondary,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.successBg,
  },
  successIcon: {
    marginBottom: spacing.lg,
  },
  successText: {
    ...typography.h2,
    color: colors.brand,
  },
  idleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
    padding: spacing.xxxl,
  },
  idleIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.brandLight,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: spacing.lg,
  },
  idleTitle: {
    ...typography.h1,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  idleSubtitle: {
    ...typography.body,
    color: colors.inkSecondary,
    textAlign: 'center',
    marginBottom: spacing.xxxl,
  },
  scanButton: {
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.xxxl,
    paddingVertical: 18,
    borderRadius: radius.lg,
    ...shadows.elevated,
  },
  scanButtonText: {
    color: colors.inkOnDark,
    fontSize: 20,
    fontWeight: '700',
  },
  // Error screen
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.errorBg,
    padding: spacing.xxxl,
  },
  errorIcon: {
    marginBottom: spacing.lg,
  },
  scanButtonRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  errorTitle: {
    ...typography.h3,
    color: colors.error,
    marginBottom: spacing.sm,
  },
  errorSubtitle: {
    ...typography.caption,
    color: colors.inkSecondary,
    textAlign: 'center',
    marginBottom: spacing.xxxl,
  },
  retryButton: {
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  retryButtonText: {
    color: colors.inkOnDark,
    ...typography.h3,
  },
  manualButton: {
    backgroundColor: colors.inkSecondary,
    paddingHorizontal: spacing.xxxl,
    paddingVertical: 14,
    borderRadius: radius.lg,
  },
  manualButtonText: {
    color: colors.inkOnDark,
    ...typography.bodySemibold,
  },
});
