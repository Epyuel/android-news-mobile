import Constants, { ExecutionEnvironment } from 'expo-constants';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Platform } from 'react-native';
import { db } from '@/constants/firebase-client';

type NotificationsModule = typeof import('expo-notifications');

function getNotificationsModule(): NotificationsModule | null {
  if (Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return null;
  return require('expo-notifications') as NotificationsModule;
}

export function configureNotifications(onResponse: (response: import('expo-notifications').NotificationResponse) => void) {
  const notifications = getNotificationsModule();
  if (!notifications) return;

  notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  const lastResponse = notifications.getLastNotificationResponse();
  if (lastResponse) onResponse(lastResponse);
  const subscription = notifications.addNotificationResponseReceivedListener(onResponse);
  return () => subscription.remove();
}

export async function registerForPushNotifications() {
  const Notifications = getNotificationsModule();
  if (!Notifications) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'General',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#003e47',
    });
  }

  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) return false;

  const deviceToken = await Notifications.getDevicePushTokenAsync();
  const token = typeof deviceToken.data === 'string' ? deviceToken.data : JSON.stringify(deviceToken.data);

  await setDoc(doc(db, 'deviceTokens', token), {
    token,
    type: deviceToken.type,
    platform: Platform.OS,
    enabled: true,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  return true;
}
