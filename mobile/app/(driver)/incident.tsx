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
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/auth.store';
import { supabase } from '../../lib/supabase';
import ActionCard from '../../components/ActionCard';
import PhotoCapture from '../../components/PhotoCapture';
import { addToQueue, savePhotoLocally } from '../../lib/offline-queue';
import NetInfo from '@react-native-community/netinfo';
import { colors, spacing, radius, typography, shadows } from '../../constants/theme';

const INCIDENT_TYPES = [
  { key: 'panne', icon: 'tool' as const, label: 'Panne mecanique' },
  { key: 'accident', icon: 'zap' as const, label: 'Accident / choc' },
  { key: 'degat', icon: 'search' as const, label: 'Degat constate' },
  { key: 'amende', icon: 'file-text' as const, label: 'Amende' },
  { key: 'pneu', icon: 'circle' as const, label: 'Pneu creve' },
  { key: 'autre', icon: 'edit-3' as const, label: 'Autre' },
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
      Alert.alert('Erreur', 'Veuillez selectionner un type et saisir une description.');
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

      Alert.alert('Signalement envoye', 'L\'administrateur sera notifie.');
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
      <Text style={styles.title}>Signaler un probleme</Text>

      <Text style={styles.sectionTitle}>Type</Text>
      {INCIDENT_TYPES.map((type) => (
        <ActionCard
          key={type.key}
          icon={<Feather name={type.icon} size={20} color={selectedType === type.key ? colors.error : colors.inkSecondary} />}
          label={type.label}
          selected={selectedType === type.key}
          onPress={() => setSelectedType(type.key)}
          color={colors.error}
        />
      ))}

      <View style={styles.field}>
        <Text style={styles.label}>Date de l'incident</Text>
        <TextInput
          style={styles.input}
          value={incidentDate}
          onChangeText={setIncidentDate}
          placeholder="AAAA-MM-JJ"
          placeholderTextColor={colors.inkFaint}
          accessibilityLabel="Date de l'incident"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Decrivez le probleme..."
          placeholderTextColor={colors.inkFaint}
          multiline
          numberOfLines={4}
          accessibilityLabel="Description du probleme"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Montant (EUR) {selectedType === 'amende' ? '*' : '(optionnel)'}</Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={colors.inkFaint}
          accessibilityLabel="Montant"
        />
      </View>

      <TouchableOpacity
        style={styles.photoButton}
        onPress={() => setShowCamera(true)}
        accessibilityLabel="Ajouter une photo"
      >
        <View style={styles.photoButtonRow}>
          <Feather name="camera" size={18} color={colors.inkSecondary} />
          <Text style={styles.photoButtonText}>
            {photoBase64 ? 'Photo prise' : 'Ajouter une photo (optionnel)'}
          </Text>
          {photoBase64 ? <Feather name="check-circle" size={18} color={colors.brand} /> : null}
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.submitButton, (loading || !selectedType || !description.trim()) && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={loading || !selectedType || !description.trim()}
        accessibilityLabel="Envoyer le signalement"
      >
        {loading ? (
          <ActivityIndicator color={colors.inkOnDark} />
        ) : (
          <Text style={styles.submitText}>Envoyer le signalement</Text>
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
  content: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  title: {
    ...typography.h2,
    color: colors.ink,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.bodySemibold,
    color: colors.inkSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  field: {
    marginTop: spacing.lg,
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
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.ink,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  photoButton: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.lg,
    ...shadows.card,
  },
  photoButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  photoButtonText: {
    ...typography.bodySemibold,
    color: colors.inkSecondary,
  },
  submitButton: {
    backgroundColor: colors.error,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    alignItems: 'center',
    marginTop: spacing.xl,
    ...shadows.elevated,
  },
  submitDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: colors.inkOnDark,
    ...typography.h3,
  },
});
