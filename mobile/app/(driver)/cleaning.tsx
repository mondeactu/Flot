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
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/auth.store';
import { supabase } from '../../lib/supabase';
import PhotoCapture from '../../components/PhotoCapture';
import { recognizeCleaningReceipt } from '../../lib/ocr';
import { addToQueue, savePhotoLocally } from '../../lib/offline-queue';
import { sendLocalNotification } from '../../lib/notifications';
import NetInfo from '@react-native-community/netinfo';
import { colors, spacing, radius, typography, shadows } from '../../constants/theme';

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
        <View style={styles.successIcon}>
          <Feather name="check-circle" size={64} color={colors.brand} />
        </View>
        <Text style={styles.successText}>Nettoyage enregistre !</Text>
      </View>
    );
  }

  // OCR LOADING
  if (ocrLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.brand} />
        <Text style={styles.loadingText}>Lecture du ticket...</Text>
      </View>
    );
  }

  // IDLE — Start button
  if (step === 'idle') {
    return (
      <View style={styles.idleContainer}>
        <View style={styles.idleIcon}>
          <Feather name="refresh-cw" size={48} color={colors.brand} />
        </View>
        <Text style={styles.idleTitle}>Enregistrer un nettoyage</Text>
        <Text style={styles.idleSubtitle}>
          Prenez en photo votre ticket de caisse
        </Text>
        <TouchableOpacity
          style={styles.scanButton}
          onPress={() => setStep('receipt_camera')}
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

  // RECEIPT CAMERA
  if (step === 'receipt_camera') {
    return (
      <View style={styles.container}>
        <View style={styles.stepBanner}>
          <Text style={styles.stepBannerText}>Etape 1/2 -- Ticket de caisse</Text>
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
          <Text style={styles.stepBannerText}>Etape 2/2 -- Etat du vehicule</Text>
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
          <View style={styles.photoCardHeader}>
            <Feather name="check-circle" size={14} color={colors.brand} />
            <Text style={styles.photoCardLabel}>Ticket</Text>
          </View>
          {receiptUri ? (
            <Image source={{ uri: receiptUri }} style={styles.photoThumb} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Feather name="file" size={24} color={colors.inkMuted} />
            </View>
          )}
        </View>
        <View style={styles.photoCard}>
          <View style={styles.photoCardHeader}>
            <Feather name="check-circle" size={14} color={colors.brand} />
            <Text style={styles.photoCardLabel}>Vehicule</Text>
          </View>
          {vehiclePhotoUri ? (
            <Image source={{ uri: vehiclePhotoUri }} style={styles.photoThumb} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Feather name="truck" size={24} color={colors.inkMuted} />
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
          placeholderTextColor={colors.inkFaint}
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
          <ActivityIndicator color={colors.inkOnDark} />
        ) : (
          <Text style={styles.submitText}>Valider le nettoyage</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  // Idle
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
    alignItems: 'center',
    justifyContent: 'center',
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
  scanButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scanButtonText: {
    color: colors.inkOnDark,
    fontSize: 20,
    fontWeight: '700',
  },
  // Step banner
  stepBanner: {
    backgroundColor: colors.brand,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  stepBannerText: {
    color: colors.inkOnDark,
    fontWeight: '700',
    ...typography.bodySemibold,
    textAlign: 'center',
  },
  // Loading
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
  // Summary
  summaryContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  summaryTitle: {
    ...typography.h2,
    color: colors.ink,
    marginBottom: spacing.xl,
  },
  photoRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  photoCard: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  photoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  photoCardLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.brand,
  },
  photoThumb: {
    width: '100%',
    height: 120,
    borderRadius: radius.sm,
  },
  photoPlaceholder: {
    width: '100%',
    height: 120,
    borderRadius: radius.sm,
    backgroundColor: colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  field: {
    marginBottom: spacing.xl,
  },
  label: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.inkSecondary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.borderInput,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 18,
    color: colors.ink,
  },
  hint: {
    ...typography.caption,
    fontSize: 12,
    color: colors.inkMuted,
    marginTop: spacing.xs,
  },
  submitButton: {
    backgroundColor: colors.brand,
    paddingVertical: 18,
    borderRadius: radius.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
    ...shadows.elevated,
  },
  submitDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: colors.inkOnDark,
    ...typography.h3,
  },
  // Success
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
});
