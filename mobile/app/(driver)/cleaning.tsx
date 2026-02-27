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
  Keyboard,
  Image,
} from 'react-native';
import { useAuthStore } from '../../stores/auth.store';
import { supabase } from '../../lib/supabase';
import PhotoCapture from '../../components/PhotoCapture';
import { recognizeCleaningReceipt } from '../../lib/ocr';
import { addToQueue, savePhotoLocally } from '../../lib/offline-queue';
import { sendLocalNotification } from '../../lib/notifications';
import NetInfo from '@react-native-community/netinfo';

type Step = 'idle' | 'receipt_camera' | 'vehicle_camera' | 'summary' | 'success';

export default function CleaningScreen() {
  const { user, vehicle } = useAuthStore();
  const [step, setStep] = useState<Step>('idle');
  const [receiptBase64, setReceiptBase64] = useState('');
  const [receiptUri, setReceiptUri] = useState('');
  const [vehiclePhotoBase64, setVehiclePhotoBase64] = useState('');
  const [vehiclePhotoUri, setVehiclePhotoUri] = useState('');
  const [priceTTC, setPriceTTC] = useState('');
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  const handleReceiptPhoto = async (base64: string, uri: string) => {
    setReceiptBase64(base64);
    setReceiptUri(uri);
    setOcrLoading(true);
    setOcrError(false);

    try {
      const result = await recognizeCleaningReceipt(base64);
      if (result.priceTTC !== null) {
        setPriceTTC(result.priceTTC.toString());
      }
      setStep('vehicle_camera');
    } catch {
      // OCR failed — still move to vehicle photo, user will enter price manually
      setStep('vehicle_camera');
    } finally {
      setOcrLoading(false);
    }
  };

  const handleVehiclePhoto = (base64: string, uri: string) => {
    setVehiclePhotoBase64(base64);
    setVehiclePhotoUri(uri);
    setStep('summary');
  };

  const handleSubmit = async () => {
    if (!user?.id || !vehicle?.id) return;

    const parsedPrice = priceTTC ? parseFloat(priceTTC.replace(',', '.')) : null;
    if (!parsedPrice || parsedPrice <= 0) {
      Alert.alert('Erreur', 'Veuillez saisir le prix TTC du nettoyage');
      return;
    }

    setSubmitLoading(true);
    Keyboard.dismiss();

    try {
      const netState = await NetInfo.fetch();
      const timestamp = Date.now();

      if (netState.isConnected) {
        // Upload receipt photo
        const receiptPath = `${vehicle.id}/${timestamp}_receipt.jpg`;
        const receiptBytes = Uint8Array.from(atob(receiptBase64), (c) => c.charCodeAt(0));
        const { error: receiptUploadErr } = await supabase.storage
          .from('cleanings')
          .upload(receiptPath, receiptBytes, {
            contentType: 'image/jpeg',
            upsert: true,
          });
        if (receiptUploadErr) throw receiptUploadErr;

        // Upload vehicle state photo
        const vehiclePath = `${vehicle.id}/${timestamp}_vehicle.jpg`;
        const vehicleBytes = Uint8Array.from(atob(vehiclePhotoBase64), (c) => c.charCodeAt(0));
        const { error: vehicleUploadErr } = await supabase.storage
          .from('cleanings')
          .upload(vehiclePath, vehicleBytes, {
            contentType: 'image/jpeg',
            upsert: true,
          });
        if (vehicleUploadErr) throw vehicleUploadErr;

        // Insert cleaning record
        const { error } = await supabase.from('cleanings').insert({
          vehicle_id: vehicle.id,
          driver_id: user.id,
          receipt_photo_url: receiptPath,
          vehicle_state_photo_url: vehiclePath,
          price_ttc: parsedPrice,
        });

        if (error) throw error;
      } else {
        // Offline: save photos locally and queue
        const localReceipt = await savePhotoLocally(receiptUri, `cleaning_receipt_${timestamp}.jpg`);
        const localVehicle = await savePhotoLocally(vehiclePhotoUri, `cleaning_vehicle_${timestamp}.jpg`);
        await addToQueue('cleaning', {
          vehicle_id: vehicle.id,
          driver_id: user.id,
          price_ttc: parsedPrice,
          _local_receipt: localReceipt,
          _local_vehicle: localVehicle,
        });
      }

      await sendLocalNotification(
        'Nettoyage enregistre',
        `${parsedPrice.toFixed(2)} EUR`
      );
      setStep('success');
      setTimeout(resetScreen, 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'enregistrement";
      Alert.alert('Erreur', msg);
    } finally {
      setSubmitLoading(false);
    }
  };

  const resetScreen = () => {
    setStep('idle');
    setReceiptBase64('');
    setReceiptUri('');
    setVehiclePhotoBase64('');
    setVehiclePhotoUri('');
    setPriceTTC('');
    setOcrError(false);
  };

  // SUCCESS
  if (step === 'success') {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successEmoji}>✅</Text>
        <Text style={styles.successText}>Nettoyage enregistre !</Text>
      </View>
    );
  }

  // OCR LOADING
  if (ocrLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>Lecture du ticket...</Text>
      </View>
    );
  }

  // IDLE — Start button
  if (step === 'idle') {
    return (
      <View style={styles.idleContainer}>
        <Text style={styles.idleEmoji}>🧹</Text>
        <Text style={styles.idleTitle}>Enregistrer un nettoyage</Text>
        <Text style={styles.idleSubtitle}>
          Prenez en photo votre ticket de caisse
        </Text>
        <TouchableOpacity
          style={styles.scanButton}
          onPress={() => setStep('receipt_camera')}
          accessibilityLabel="Scanner un recu"
        >
          <Text style={styles.scanButtonText}>📷  Scanner un recu</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // RECEIPT CAMERA
  if (step === 'receipt_camera') {
    return (
      <View style={styles.container}>
        <View style={styles.stepBanner}>
          <Text style={styles.stepBannerText}>Etape 1/2 — Ticket de caisse</Text>
        </View>
        <PhotoCapture onPhotoTaken={handleReceiptPhoto} label="Ticket de caisse" />
      </View>
    );
  }

  // VEHICLE CAMERA
  if (step === 'vehicle_camera') {
    return (
      <View style={styles.container}>
        <View style={styles.stepBanner}>
          <Text style={styles.stepBannerText}>Etape 2/2 — Etat du vehicule</Text>
        </View>
        <PhotoCapture onPhotoTaken={handleVehiclePhoto} label="Etat du vehicule" />
      </View>
    );
  }

  // SUMMARY
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.summaryContent}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.summaryTitle}>Resume du nettoyage</Text>

      <View style={styles.photoRow}>
        <View style={styles.photoCard}>
          <Text style={styles.photoCardLabel}>✅ Ticket</Text>
          {receiptUri ? (
            <Image source={{ uri: receiptUri }} style={styles.photoThumb} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text>📄</Text>
            </View>
          )}
        </View>
        <View style={styles.photoCard}>
          <Text style={styles.photoCardLabel}>✅ Vehicule</Text>
          {vehiclePhotoUri ? (
            <Image source={{ uri: vehiclePhotoUri }} style={styles.photoThumb} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text>🚗</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Prix TTC (EUR)</Text>
        <TextInput
          style={styles.input}
          value={priceTTC}
          onChangeText={setPriceTTC}
          keyboardType="decimal-pad"
          placeholder="0.00"
          returnKeyType="done"
          onSubmitEditing={() => Keyboard.dismiss()}
          accessibilityLabel="Prix du nettoyage"
        />
        {!priceTTC && (
          <Text style={styles.hint}>Saisissez le montant du ticket</Text>
        )}
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
  // Idle
  idleContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5', padding: 32 },
  idleEmoji: { fontSize: 72, marginBottom: 16 },
  idleTitle: { fontSize: 24, fontWeight: '800', color: '#333', marginBottom: 8 },
  idleSubtitle: { fontSize: 16, color: '#777', textAlign: 'center', marginBottom: 32 },
  scanButton: { backgroundColor: '#2E7D32', paddingHorizontal: 32, paddingVertical: 18, borderRadius: 14 },
  scanButtonText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  // Step banner
  stepBanner: { backgroundColor: '#2E7D32', paddingVertical: 10, paddingHorizontal: 16 },
  stepBannerText: { color: '#fff', fontWeight: '700', fontSize: 16, textAlign: 'center' },
  // Loading
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#555' },
  // Summary
  summaryContent: { padding: 16, paddingBottom: 32 },
  summaryTitle: { fontSize: 22, fontWeight: '800', color: '#333', marginBottom: 20 },
  photoRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  photoCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#E0E0E0' },
  photoCardLabel: { fontSize: 14, fontWeight: '700', color: '#2E7D32', marginBottom: 8 },
  photoThumb: { width: '100%', height: 120, borderRadius: 8 },
  photoPlaceholder: { width: '100%', height: 120, borderRadius: 8, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  field: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 14, fontSize: 18 },
  hint: { fontSize: 12, color: '#999', marginTop: 4 },
  submitButton: { backgroundColor: '#2E7D32', paddingVertical: 18, borderRadius: 14, alignItems: 'center', marginTop: 8 },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  // Success
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E8F5E9' },
  successEmoji: { fontSize: 64, marginBottom: 16 },
  successText: { fontSize: 22, fontWeight: '700', color: '#2E7D32' },
});
