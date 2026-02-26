import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';

interface PhotoCaptureProps {
  onPhotoTaken: (base64: string, uri: string) => void;
  label?: string;
}

export default function PhotoCapture({ onPhotoTaken, label }: PhotoCaptureProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState<{ uri: string; base64: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permText}>L'accès à la caméra est nécessaire</Text>
        <TouchableOpacity
          style={styles.permButton}
          onPress={requestPermission}
          accessibilityLabel="Autoriser la caméra"
        >
          <Text style={styles.permButtonText}>Autoriser la caméra</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePhoto = async () => {
    if (!cameraRef.current) return;
    setLoading(true);
    try {
      const result = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });

      if (!result) return;

      // Resize for OCR
      const manipulated = await ImageManipulator.manipulateAsync(
        result.uri,
        [{ resize: { width: 1200 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      setPhoto({ uri: manipulated.uri, base64: manipulated.base64 ?? '' });
    } catch (err) {
      console.error('Erreur photo :', err);
    } finally {
      setLoading(false);
    }
  };

  const retake = () => setPhoto(null);

  const confirm = () => {
    if (photo) {
      onPhotoTaken(photo.base64, photo.uri);
    }
  };

  if (photo) {
    return (
      <View style={styles.previewContainer}>
        <Image source={{ uri: photo.uri }} style={styles.preview} />
        <View style={styles.previewButtons}>
          <TouchableOpacity
            style={[styles.button, styles.retakeButton]}
            onPress={retake}
            accessibilityLabel="Recommencer la photo"
          >
            <Text style={styles.retakeText}>Recommencer</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.confirmButton]}
            onPress={confirm}
            accessibilityLabel="Utiliser cette photo"
          >
            <Text style={styles.confirmText}>Utiliser cette photo</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.cameraContainer}>
      {label && <Text style={styles.label}>{label}</Text>}
      <CameraView ref={cameraRef} style={styles.camera} facing="back">
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}
      </CameraView>
      <TouchableOpacity
        style={styles.captureButton}
        onPress={takePhoto}
        disabled={loading}
        accessibilityLabel="Prendre la photo"
      >
        <Text style={styles.captureText}>📷 Prendre la photo</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  permButton: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cameraContainer: {
    flex: 1,
  },
  label: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  camera: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 16,
    alignItems: 'center',
  },
  captureText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  previewContainer: {
    flex: 1,
  },
  preview: {
    flex: 1,
    resizeMode: 'contain',
  },
  previewButtons: {
    flexDirection: 'row',
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  retakeButton: {
    backgroundColor: '#757575',
  },
  retakeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#2E7D32',
  },
  confirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
