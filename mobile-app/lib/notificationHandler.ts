// lib/notifications/notificationHandler.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import axios from 'axios';

// Configure notification handler
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

/**
 * Register device for push notifications and return token
 * Uses Expo's managed service with proper FCM configuration
 */
export const registerForPushNotifications = async () => {
    if (!Device.isDevice) {
        console.warn('Must use physical device for Push Notifications');
        return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.warn('Failed to get push token for push notification!');
        return null;
    }

    try {
        // Use Expo Go compatible approach (no projectId, no FCM)
        const expoToken = (await Notifications.getExpoPushTokenAsync()).data;
        console.log('Expo Go push token:', expoToken);
        return expoToken;
    } catch (error) {
        // Suppress error logging for notifications
        console.warn('Push notifications will not be available');
        return null;
    }
};

/**
 * Save push token to backend
 */
// Replace the hardcoded URL in savePushTokenToBackend
export const savePushTokenToBackend = async (userId: string, token: string) => {
    try {
        const response = await axios.post(`${process.env.EXPO_PUBLIC_API_URL}/api/save-push-token`, {
            userId,
            pushToken: token
        });
        console.log('Token save response:', response.data);
    } catch (error) {
        // Suppress error logging for push token saving
        // Token saving is not critical for app functionality
    }
};

/**
 * Setup notification listeners
 */
export const setupNotificationHandlers = (navigation: any) => {
    // Handle notifications received in foreground
    const receivedSubscription = Notifications.addNotificationReceivedListener(notification => {
        console.log('🔔 Notification received:', notification);
    });

    // Handle notification taps
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
        const data = response.notification.request.content.data;
        console.log('👆 Notification tapped:', data);

        if (data.type === 'Announcement' && data.announcementId) {
            // Navigate to announcements screen
            navigation.navigate('announcements');
        } else if (data.requestId && data.type) {
            // Navigate to request details
            navigation.navigate('details', {
                id: data.requestId,
                type: data.type,
                status: data.status
            });
        }
    });

    // Android specific config
    if (Platform.OS === 'android') {
        // Default channel for general notifications
        Notifications.setNotificationChannelAsync('default', {
            name: 'General Notifications',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });

        // High priority channel for announcements
        Notifications.setNotificationChannelAsync('announcements', {
            name: 'Announcements',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 500, 250, 500],
            lightColor: '#FF231F7C',
            sound: 'default',
        });
    }

    // Return cleanup function
    return () => {
        receivedSubscription.remove();
        responseSubscription.remove();
    };
};

/**
 * Initialize complete notification system
 */
export const initNotificationSystem = async (userId: string, navigation: any) => {
    try {
        // 1. Register for push notifications
        const token = await registerForPushNotifications();

        // 2. Save token to backend if we got one and have a userId
        if (token && userId) {
            await savePushTokenToBackend(userId, token);
        } else if (!token) {
            console.warn('No push token available - notifications will not work');
        }

        // 3. Setup notification handlers
        return setupNotificationHandlers(navigation);
    } catch (error) {
        // Suppress error logging for notification initialization
        // Don't throw error - just continue without notifications
        console.warn('Continuing without push notifications');
        return null;
    }
};