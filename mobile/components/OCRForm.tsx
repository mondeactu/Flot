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
import type { OCRResult } from '../lib/ocr';

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
      setError('Le kilométrage est obligatoire');
      return;
    }

    if (previousKm !== null && parsedKM <= previousKm) {
      setError(`Kilométrage inférieur au dernier relevé (${previousKm.toLocaleString('fr-FR')} km)`);
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
      <Text style={styles.title}>Vérification du ticket</Text>

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

      <View style={styles.field}>
        <Text style={styles.label}>
          Prix HT (EUR) {isFieldLowConfidence('priceHT') && '⚠️'}
        </Text>
        <TextInput
          style={[styles.input, isFieldLowConfidence('priceHT') && styles.inputWarning]}
          value={priceHT}
          onChangeText={setPriceHT}
          keyboardType="decimal-pad"
          placeholder="0.00"
          returnKeyType="done"
          onSubmitEditing={() => Keyboard.dismiss()}
          accessibilityLabel="Prix hors taxes"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>
          Prix TTC (EUR) {isFieldLowConfidence('priceTTC') && '⚠️'}
        </Text>
        <TextInput
          style={[styles.input, isFieldLowConfidence('priceTTC') && styles.inputWarning]}
          value={priceTTC}
          onChangeText={setPriceTTC}
          keyboardType="decimal-pad"
          placeholder="0.00"
          returnKeyType="done"
          onSubmitEditing={() => Keyboard.dismiss()}
          accessibilityLabel="Prix toutes taxes comprises"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>
          Litres {isFieldLowConfidence('liters') && '⚠️'}
        </Text>
        <TextInput
          style={[styles.input, isFieldLowConfidence('liters') && styles.inputWarning]}
          value={liters}
          onChangeText={setLiters}
          keyboardType="decimal-pad"
          placeholder="0.00"
          returnKeyType="done"
          onSubmitEditing={() => Keyboard.dismiss()}
          accessibilityLabel="Volume en litres"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>
          Kilométrage {isFieldLowConfidence('km') && '⚠️'}
        </Text>
        <TextInput
          style={[styles.input, isFieldLowConfidence('km') && styles.inputWarning]}
          value={km}
          onChangeText={setKm}
          keyboardType="number-pad"
          placeholder="Ex: 125430"
          returnKeyType="done"
          onSubmitEditing={() => Keyboard.dismiss()}
          accessibilityLabel="Kilométrage au compteur"
        />
        {previousKm !== null && (
          <Text style={styles.hint}>Dernier relevé : {previousKm.toLocaleString('fr-FR')} km</Text>
        )}
      </View>

      <TouchableOpacity
        style={[styles.submitButton, (!isValid || loading) && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={!isValid || loading}
        accessibilityLabel="Valider le plein"
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>Valider le plein</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16 },
  title: { fontSize: 20, fontWeight: '700', color: '#333', marginBottom: 16 },
  errorBanner: { backgroundColor: '#FFEBEE', padding: 12, borderRadius: 8, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#D32F2F' },
  errorText: { color: '#D32F2F', fontSize: 14, fontWeight: '500' },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: '#333' },
  inputWarning: { borderColor: '#FF9800', borderWidth: 2, backgroundColor: '#FFF8E1' },
  hint: { fontSize: 12, color: '#888', marginTop: 4 },
  fuelToggle: { flexDirection: 'row', backgroundColor: '#f0f0f0', borderRadius: 10, padding: 3 },
  fuelBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  fuelBtnActive: { backgroundColor: '#2E7D32' },
  fuelBtnText: { fontSize: 15, fontWeight: '600', color: '#888' },
  fuelBtnTextActive: { color: '#fff' },
  submitButton: { backgroundColor: '#2E7D32', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
