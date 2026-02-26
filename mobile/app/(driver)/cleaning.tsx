import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useAuthStore } from '../../stores/auth.store';
import { supabase } from '../../lib/supabase';
import PhotoCapture from '../../components/PhotoCapture';
import { recognizeCleaningReceipt } from '../../lib/ocr';
import { addToQueue, savePhotoLocally } from '../../lib/offline-queue';
import { sendLocalNotification } from '../../lib/notifications';
import NetInfo from '@react-native-community/netinfo';

const PHOTO_LABELS = ['Avant', 'Arrière', 'Gauche', 'Droite', 'Intérieur'];
const PHOTO_KEYS = [
  'photo_front_url',
  'photo_rear_url',
  'photo_left_url',
  'photo_right_url',
  'photo_interior_url',
] as const;

type Step = 'photos' | 'receipt' | 'summary' | 'success';

export default function CleaningScreen() {
  const { user, vehicle } = useAuthStore();
  const [step, setStep] = useState<Step>('photos');
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [photos, setPhotos] = useState<Record<string, { base64: string; uri: string }>>({});
  const [receiptBase64, setReceiptBase64] = useState('');
  const [receiptUri, setReceiptUri] = useState('');
  const [priceTTC, setPriceTTC] = useState('');
  const [ocrLoading, setOcrLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  const handleVehiclePhoto = (base64: string, uri: string) => {
    const key = PHOTO_KEYS[currentPhotoIndex];
    setPhotos((prev) => ({ ...prev, [key]: { base64, uri } }));

    if (currentPhotoIndex < 4) {
      setCurrentPhotoIndex(currentPhotoIndex + 1);
    } else {
      setStep('receipt');
    }
  };

  const skipPhoto = () => {
    if (currentPhotoIndex < 4) {
      setCurrentPhotoIndex(currentPhotoIndex + 1);
    } else {
      setStep('receipt');
    }
  };

  const handleReceiptPhoto = async (base64: string, uri: string) => {
    setReceiptBase64(base64);
    setReceiptUri(uri);
    setOcrLoading(true);

    try {
      const result = await recognizeCleaningReceipt(base64);
      if (result.priceTTC !== null) {
        setPriceTTC(result.priceTTC.toString());
      }
    } catch {
      // Manual fallback
    } finally {
      setOcrLoading(false);
      setStep('summary');
    }
  };

  const skipReceipt = () => {
    setStep('summary');
  };

  const handleSubmit = async () => {
    if (!user?.id || !vehicle?.id) return;
    setSubmitLoading(true);

    try {
      const netState = await NetInfo.fetch();
      const timestamp = Date.now();
      const parsedPrice = priceTTC ? parseFloat(priceTTC.replace(',', '.')) : null;

      if (netState.isConnected) {
        const uploadedPhotos: Record<string, string | null> = {};

        // Upload vehicle photos
        for (const key of PHOTO_KEYS) {
          const photo = photos[key];
          if (photo) {
            const path = `${vehicle.id}/${timestamp}_${key}.jpg`;
            const byteArray = Uint8Array.from(atob(photo.base64), (c) => c.charCodeAt(0));
            await supabase.storage.from('cleanings').upload(path, byteArray, {
              contentType: 'image/jpeg',
              upsert: true,
            });
            uploadedPhotos[key] = path;
          } else {
            uploadedPhotos[key] = null;
          }
        }

        // Upload receipt
        let receiptPath: string | null = null;
        if (receiptBase64) {
          receiptPath = `${vehicle.id}/${timestamp}_receipt.jpg`;
          const byteArray = Uint8Array.from(atob(receiptBase64), (c) => c.charCodeAt(0));
          await supabase.storage.from('cleanings').upload(receiptPath, byteArray, {
            contentType: 'image/jpeg',
            upsert: true,
          });
        }

        const { error } = await supabase.from('cleanings').insert({
          vehicle_id: vehicle.id,
          driver_id: user.id,
          receipt_photo_url: receiptPath,
          price_ttc: parsedPrice,
          photo_front_url: uploadedPhotos.photo_front_url,
          photo_rear_url: uploadedPhotos.photo_rear_url,
          photo_left_url: uploadedPhotos.photo_left_url,
          photo_right_url: uploadedPhotos.photo_right_url,
          photo_interior_url: uploadedPhotos.photo_interior_url,
        });

        if (error) throw error;
      } else {
        // Offline: simplified queue
        await addToQueue('cleaning', {
          vehicle_id: vehicle.id,
          driver_id: user.id,
          price_ttc: parsedPrice,
        });
      }

      await sendLocalNotification('✅ Nettoyage enregistré', `${parsedPrice ? parsedPrice.toFixed(2) + ' €' : 'Sans ticket'}`);
      setStep('success');
      setTimeout(resetScreen, 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement';
      Alert.alert('Erreur', msg);
    } finally {
      setSubmitLoading(false);
    }
  };

  const resetScreen = () => {
    setStep('photos');
    setCurrentPhotoIndex(0);
    setPhotos({});
    setReceiptBase64('');
    setReceiptUri('');
    setPriceTTC('');
  };

  if (step === 'success') {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successEmoji}>✅</Text>
        <Text style={styles.successText}>Nettoyage enregistré !</Text>
      </View>
    );
  }

  if (step === 'photos') {
    return (
      <View style={styles.container}>
        <View style={styles.progressBar}>
          <Text style={styles.progressText}>Photo {currentPhotoIndex + 1}/5 — {PHOTO_LABELS[currentPhotoIndex]}</Text>
        </View>
        <PhotoCapture
          onPhotoTaken={handleVehiclePhoto}
          label={PHOTO_LABELS[currentPhotoIndex]}
        />
        <TouchableOpacity style={styles.skipButton} onPress={skipPhoto} accessibilityLabel="Passer cette photo">
          <Text style={styles.skipText}>Passer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (step === 'receipt') {
    if (ocrLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text style={styles.loadingText}>Lecture du ticket...</Text>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <PhotoCapture onPhotoTaken={handleReceiptPhoto} label="Ticket de caisse (optionnel)" />
        <TouchableOpacity style={styles.skipButton} onPress={skipReceipt} accessibilityLabel="Passer le ticket">
          <Text style={styles.skipText}>Passer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Summary
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.summaryContent}>
      <Text style={styles.summaryTitle}>Résumé du nettoyage</Text>

      <View style={styles.summaryRow}>
        {PHOTO_LABELS.map((label, i) => (
          <View key={label} style={styles.photoCheck}>
            <Text style={styles.checkmark}>{photos[PHOTO_KEYS[i]] ? '✅' : '⬜'}</Text>
            <Text style={styles.photoLabel}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Prix TTC (€)</Text>
        <TextInput
          style={styles.input}
          value={priceTTC}
          onChangeText={setPriceTTC}
          keyboardType="decimal-pad"
          placeholder="0.00"
          accessibilityLabel="Prix du nettoyage"
        />
      </View>

      <TouchableOpacity
        style={[styles.submitButton, submitLoading && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={submitLoading}
        accessibilityLabel="Valider le nettoyage"
      >
        {submitLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>Valider le nettoyage</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  progressBar: { backgroundColor: '#2E7D32', paddingVertical: 8, paddingHorizontal: 16 },
  progressText: { color: '#fff', fontWeight: '700', fontSize: 16, textAlign: 'center' },
  skipButton: { backgroundColor: '#757575', paddingVertical: 12, alignItems: 'center' },
  skipText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#555' },
  summaryContent: { padding: 16 },
  summaryTitle: { fontSize: 20, fontWeight: '700', color: '#333', marginBottom: 16 },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  photoCheck: { flexDirection: 'row', alignItems: 'center', width: '45%' },
  checkmark: { fontSize: 18, marginRight: 6 },
  photoLabel: { fontSize: 14, color: '#555' },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  submitButton: { backgroundColor: '#2E7D32', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E8F5E9' },
  successEmoji: { fontSize: 64, marginBottom: 16 },
  successText: { fontSize: 22, fontWeight: '700', color: '#2E7D32' },
});
