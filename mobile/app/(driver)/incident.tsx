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
import ActionCard from '../../components/ActionCard';
import PhotoCapture from '../../components/PhotoCapture';
import { addToQueue, savePhotoLocally } from '../../lib/offline-queue';
import NetInfo from '@react-native-community/netinfo';

const INCIDENT_TYPES = [
  { key: 'panne', emoji: '🔧', label: 'Panne mécanique' },
  { key: 'accident', emoji: '💥', label: 'Accident / choc' },
  { key: 'degat', emoji: '🔍', label: 'Dégât constaté' },
  { key: 'amende', emoji: '📋', label: 'Amende' },
  { key: 'pneu', emoji: '🔴', label: 'Pneu crevé' },
  { key: 'autre', emoji: '📝', label: 'Autre' },
] as const;

export default function IncidentScreen() {
  const { user, vehicle } = useAuthStore();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [incidentDate, setIncidentDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [showCamera, setShowCamera] = useState(false);
  const [photoBase64, setPhotoBase64] = useState('');
  const [photoUri, setPhotoUri] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!selectedType || !description.trim() || !user?.id || !vehicle?.id) {
      Alert.alert('Erreur', 'Veuillez sélectionner un type et saisir une description.');
      return;
    }

    setLoading(true);
    try {
      const netState = await NetInfo.fetch();
      const timestamp = Date.now();
      const parsedAmount = amount ? parseFloat(amount.replace(',', '.')) : null;

      if (netState.isConnected) {
        let photoUrl: string | null = null;

        if (photoBase64) {
          const path = `${vehicle.id}/${timestamp}_incident.jpg`;
          const byteArray = Uint8Array.from(atob(photoBase64), (c) => c.charCodeAt(0));
          await supabase.storage.from('incidents').upload(path, byteArray, {
            contentType: 'image/jpeg',
            upsert: true,
          });
          photoUrl = path;
        }

        const { error } = await supabase.from('incidents').insert({
          vehicle_id: vehicle.id,
          driver_id: user.id,
          type: selectedType,
          description: description.trim(),
          amount: parsedAmount,
          incident_date: incidentDate,
          photo_url: photoUrl,
        });

        if (error) throw error;
      } else {
        const localUri = photoUri
          ? await savePhotoLocally(photoUri, `incident_${timestamp}.jpg`)
          : undefined;

        await addToQueue(
          'incident',
          {
            vehicle_id: vehicle.id,
            driver_id: user.id,
            type: selectedType,
            description: description.trim(),
            amount: parsedAmount,
            incident_date: incidentDate,
          },
          localUri,
          localUri ? 'incidents' : undefined,
          localUri ? `${vehicle.id}/${timestamp}_incident.jpg` : undefined
        );
      }

      Alert.alert('✅ Signalement envoyé', 'L\'administrateur sera notifié.');
      resetForm();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de l\'envoi';
      Alert.alert('Erreur', msg);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedType(null);
    setDescription('');
    setAmount('');
    setIncidentDate(new Date().toISOString().split('T')[0]);
    setPhotoBase64('');
    setPhotoUri('');
    setShowCamera(false);
  };

  if (showCamera) {
    return (
      <PhotoCapture
        label="Photo de l'incident"
        onPhotoTaken={(base64, uri) => {
          setPhotoBase64(base64);
          setPhotoUri(uri);
          setShowCamera(false);
        }}
      />
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Signaler un problème</Text>

      <Text style={styles.sectionTitle}>Type</Text>
      {INCIDENT_TYPES.map((type) => (
        <ActionCard
          key={type.key}
          emoji={type.emoji}
          label={type.label}
          selected={selectedType === type.key}
          onPress={() => setSelectedType(type.key)}
          color="#D32F2F"
        />
      ))}

      <View style={styles.field}>
        <Text style={styles.label}>Date de l'incident</Text>
        <TextInput
          style={styles.input}
          value={incidentDate}
          onChangeText={setIncidentDate}
          placeholder="AAAA-MM-JJ"
          accessibilityLabel="Date de l'incident"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Décrivez le problème..."
          multiline
          numberOfLines={4}
          accessibilityLabel="Description du problème"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Montant (€) {selectedType === 'amende' ? '*' : '(optionnel)'}</Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0.00"
          accessibilityLabel="Montant"
        />
      </View>

      <TouchableOpacity
        style={styles.photoButton}
        onPress={() => setShowCamera(true)}
        accessibilityLabel="Ajouter une photo"
      >
        <Text style={styles.photoButtonText}>
          {photoBase64 ? '📷 Photo prise ✅' : '📷 Ajouter une photo (optionnel)'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.submitButton, (loading || !selectedType || !description.trim()) && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={loading || !selectedType || !description.trim()}
        accessibilityLabel="Envoyer le signalement"
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>Envoyer le signalement</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', color: '#333', marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#555', marginBottom: 8, marginTop: 8 },
  field: { marginTop: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: '#333' },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  photoButton: { backgroundColor: '#E0E0E0', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 16 },
  photoButtonText: { fontSize: 16, fontWeight: '600', color: '#555' },
  submitButton: { backgroundColor: '#D32F2F', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
