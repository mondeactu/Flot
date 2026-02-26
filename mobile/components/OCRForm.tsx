import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
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
    stationName: string;
  }) => Promise<void>;
  loading?: boolean;
}

export default function OCRForm({ ocrResult, previousKm, onSubmit, loading }: OCRFormProps) {
  const [priceHT, setPriceHT] = useState(ocrResult.priceHT?.toString() ?? '');
  const [priceTTC, setPriceTTC] = useState(ocrResult.priceTTC?.toString() ?? '');
  const [liters, setLiters] = useState(ocrResult.liters?.toString() ?? '');
  const [km, setKm] = useState(ocrResult.km?.toString() ?? '');
  const [stationName, setStationName] = useState(ocrResult.stationName ?? '');
  const [error, setError] = useState<string | null>(null);

  const isFieldLowConfidence = (field: keyof OCRResult['confidence']) => {
    return !ocrResult.confidence[field];
  };

  const handleSubmit = async () => {
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
      stationName,
    });
  };

  const isValid = priceTTC.length > 0 && priceHT.length > 0 && km.length > 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Vérification du ticket</Text>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>❌ {error}</Text>
        </View>
      )}

      <View style={styles.field}>
        <Text style={styles.label}>
          Prix HT (€) {isFieldLowConfidence('priceHT') && '⚠️'}
        </Text>
        <TextInput
          style={[
            styles.input,
            isFieldLowConfidence('priceHT') && styles.inputWarning,
          ]}
          value={priceHT}
          onChangeText={setPriceHT}
          keyboardType="decimal-pad"
          placeholder="0.00"
          accessibilityLabel="Prix hors taxes"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>
          Prix TTC (€) {isFieldLowConfidence('priceTTC') && '⚠️'}
        </Text>
        <TextInput
          style={[
            styles.input,
            isFieldLowConfidence('priceTTC') && styles.inputWarning,
          ]}
          value={priceTTC}
          onChangeText={setPriceTTC}
          keyboardType="decimal-pad"
          placeholder="0.00"
          accessibilityLabel="Prix toutes taxes comprises"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>
          Litres {isFieldLowConfidence('liters') && '⚠️'}
        </Text>
        <TextInput
          style={[
            styles.input,
            isFieldLowConfidence('liters') && styles.inputWarning,
          ]}
          value={liters}
          onChangeText={setLiters}
          keyboardType="decimal-pad"
          placeholder="0.00"
          accessibilityLabel="Volume en litres"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>
          Kilométrage {isFieldLowConfidence('km') && '⚠️'}
        </Text>
        <TextInput
          style={[
            styles.input,
            isFieldLowConfidence('km') && styles.inputWarning,
          ]}
          value={km}
          onChangeText={setKm}
          keyboardType="number-pad"
          placeholder="Ex: 125430"
          accessibilityLabel="Kilométrage au compteur"
        />
        {previousKm !== null && (
          <Text style={styles.hint}>Dernier relevé : {previousKm.toLocaleString('fr-FR')} km</Text>
        )}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Station</Text>
        <TextInput
          style={styles.input}
          value={stationName}
          onChangeText={setStationName}
          placeholder="Nom de la station"
          accessibilityLabel="Nom de la station"
        />
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
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  errorBanner: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#D32F2F',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    fontWeight: '500',
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  inputWarning: {
    borderColor: '#FF9800',
    borderWidth: 2,
    backgroundColor: '#FFF8E1',
  },
  hint: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
