import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Keyboard,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { OCRResult } from '../lib/ocr';
import { colors, spacing, radius, typography, shadows } from '../constants/theme';

interface OCRFormProps {
  ocrResult: OCRResult;
  previousKm: number | null;
  onSubmit: (data: {
    priceHT: number;
    priceTTC: number;
    liters: number | null;
    km: number;
    fuelType: string;
  }) => Promise<void>;
  loading?: boolean;
}

export default function OCRForm({ ocrResult, previousKm, onSubmit, loading }: OCRFormProps) {
  const [priceHT, setPriceHT] = useState(ocrResult.priceHT?.toString() ?? '');
  const [priceTTC, setPriceTTC] = useState(ocrResult.priceTTC?.toString() ?? '');
  const [liters, setLiters] = useState(ocrResult.liters?.toString() ?? '');
  const [km, setKm] = useState(ocrResult.km?.toString() ?? '');
  const [fuelType, setFuelType] = useState<string>(ocrResult.fuelType ?? 'diesel');
  const [error, setError] = useState<string | null>(null);

  const isFieldLowConfidence = (field: keyof OCRResult['confidence']) => {
    return !ocrResult.confidence[field];
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();
    setError(null);

    const parsedHT = parseFloat(priceHT.replace(',', '.'));
    const parsedTTC = parseFloat(priceTTC.replace(',', '.'));
    const parsedLiters = liters ? parseFloat(liters.replace(',', '.')) : null;
    const parsedKM = parseInt(km, 10);

    if (isNaN(parsedTTC) || parsedTTC <= 0) {
      setError('Le prix TTC est obligatoire');
      return;
    }

    if (isNaN(parsedHT) || parsedHT <= 0) {
      setError('Le prix HT est obligatoire');
      return;
    }

    if (isNaN(parsedKM) || parsedKM <= 0) {
      setError('Le kilometrage est obligatoire');
      return;
    }

    if (previousKm !== null && parsedKM <= previousKm) {
      setError(`Kilometrage inferieur au dernier releve (${previousKm.toLocaleString('fr-FR')} km)`);
      return;
    }

    await onSubmit({
      priceHT: parsedHT,
      priceTTC: parsedTTC,
      liters: parsedLiters,
      km: parsedKM,
      fuelType,
    });
  };

  const isValid = priceTTC.length > 0 && priceHT.length > 0 && km.length > 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Verification du ticket</Text>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Fuel type selector */}
      <View style={styles.field}>
        <Text style={styles.label}>Type de carburant</Text>
        <View style={styles.fuelToggle}>
          <TouchableOpacity
            style={[styles.fuelBtn, fuelType === 'diesel' && styles.fuelBtnActive]}
            onPress={() => setFuelType('diesel')}
          >
            <Text style={[styles.fuelBtnText, fuelType === 'diesel' && styles.fuelBtnTextActive]}>Diesel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.fuelBtn, fuelType === 'essence' && styles.fuelBtnActive]}
            onPress={() => setFuelType('essence')}
          >
            <Text style={[styles.fuelBtnText, fuelType === 'essence' && styles.fuelBtnTextActive]}>Essence</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.field}>
          <Text style={styles.label}>
            Prix HT (EUR) {isFieldLowConfidence('priceHT') && <Feather name="alert-triangle" size={14} color={colors.warning} />}
          </Text>
          <TextInput
            style={[styles.input, isFieldLowConfidence('priceHT') && styles.inputWarning]}
            value={priceHT}
            onChangeText={setPriceHT}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={colors.inkFaint}
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
            accessibilityLabel="Prix hors taxes"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>
            Prix TTC (EUR) {isFieldLowConfidence('priceTTC') && <Feather name="alert-triangle" size={14} color={colors.warning} />}
          </Text>
          <TextInput
            style={[styles.input, isFieldLowConfidence('priceTTC') && styles.inputWarning]}
            value={priceTTC}
            onChangeText={setPriceTTC}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={colors.inkFaint}
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
            accessibilityLabel="Prix toutes taxes comprises"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>
            Litres {isFieldLowConfidence('liters') && <Feather name="alert-triangle" size={14} color={colors.warning} />}
          </Text>
          <TextInput
            style={[styles.input, isFieldLowConfidence('liters') && styles.inputWarning]}
            value={liters}
            onChangeText={setLiters}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={colors.inkFaint}
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
            accessibilityLabel="Volume en litres"
          />
        </View>

        <View style={styles.fieldLast}>
          <Text style={styles.label}>
            Kilometrage {isFieldLowConfidence('km') && <Feather name="alert-triangle" size={14} color={colors.warning} />}
          </Text>
          <TextInput
            style={[styles.input, isFieldLowConfidence('km') && styles.inputWarning]}
            value={km}
            onChangeText={setKm}
            keyboardType="number-pad"
            placeholder="Ex: 125430"
            placeholderTextColor={colors.inkFaint}
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
            accessibilityLabel="Kilometrage au compteur"
          />
          {previousKm !== null && (
            <Text style={styles.hint}>Dernier releve : {previousKm.toLocaleString('fr-FR')} km</Text>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.submitButton, (!isValid || loading) && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={!isValid || loading}
        accessibilityLabel="Valider le plein"
      >
        {loading ? (
          <ActivityIndicator color={colors.inkOnDark} />
        ) : (
          <Text style={styles.submitText}>Valider le plein</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg },
  title: { ...typography.h2, color: colors.ink, marginBottom: spacing.lg },
  errorBanner: {
    backgroundColor: colors.errorBg,
    padding: spacing.md,
    borderRadius: radius.sm,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  errorText: { color: colors.error, fontSize: 14, fontWeight: '500' },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.card,
  },
  field: { marginBottom: spacing.lg },
  fieldLast: { marginBottom: 0 },
  label: { ...typography.bodyMedium, color: colors.inkSecondary, marginBottom: spacing.sm },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.borderInput,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.ink,
  },
  inputWarning: { borderColor: colors.warning, borderWidth: 2, backgroundColor: colors.warningBg },
  hint: { ...typography.caption, color: colors.inkSecondary, marginTop: spacing.xs },
  fuelToggle: {
    flexDirection: 'row',
    backgroundColor: colors.border,
    borderRadius: radius.md,
    padding: 3,
  },
  fuelBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  fuelBtnActive: { backgroundColor: colors.brand },
  fuelBtnText: { ...typography.bodySemibold, color: colors.inkMuted },
  fuelBtnTextActive: { color: colors.inkOnDark },
  submitButton: {
    backgroundColor: colors.brand,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.lg,
    ...shadows.card,
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: colors.inkOnDark, fontSize: 18, fontWeight: '700' },
});
