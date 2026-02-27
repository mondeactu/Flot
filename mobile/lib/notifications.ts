import { Platform } from 'react-native';
import { supabase } from './supabase';

// Only import native modules on non-web platforms
let Notifications: typeof import('expo-notifications') | null = null;
let Device: typeof import('expo-device') | null = null;

if (Platform.OS !== 'web') {
  Notifications = require('expo-notifications');
  Device = require('expo-device');

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function registerForPushNotifications(userId: string): Promise<string | null> {
  if (Platform.OS === 'web' || !Notifications || !Device) {
    console.log('Push notifications are not supported on web.');
    return null;
  }

  if (!Device.isDevice) {
    console.warn('Les notifications push nécessitent un appareil physique.');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Permission de notification refusée.');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Flot',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2E7D32',
    });
  }

  const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
  if (!projectId) {
    console.error('EXPO_PUBLIC_PROJECT_ID manquant');
    return null;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;

    const { error } = await supabase
      .from('profiles')
      .update({ expo_push_token: token })
      .eq('id', userId);

    if (error) {
      console.error('Erreur lors de la sauvegarde du token push :', error.message);
    }

    return token;
  } catch (err) {
    console.error("Erreur lors de l'obtention du token push :", err);
    return null;
  }
}

export function addNotificationReceivedListener(
  callback: (notification: any) => void
) {
  if (Platform.OS === 'web' || !Notifications) return { remove: () => {} };
  return Notifications.addNotificationReceivedListener(callback);
}

export function addNotificationResponseListener(
  callback: (response: any) => void
) {
  if (Platform.OS === 'web' || !Notifications) return { remove: () => {} };
  return Notifications.addNotificationResponseReceivedListener(callback);
}

export async function sendLocalNotification(title: string, body: string) {
  if (Platform.OS === 'web' || !Notifications) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: 'default',
    },
    trigger: { type: 'timeInterval' as const, seconds: 1 },
  });
}
