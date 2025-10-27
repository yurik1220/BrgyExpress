import React, { useEffect } from 'react';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { initNotificationSystem } from '@/lib/notificationHandler';

const NotificationInitializer: React.FC = () => {
    const { isSignedIn } = useAuth();
    const { user } = useUser();
    const router = useRouter();

    useEffect(() => {
        let cleanup: (() => void) | undefined;

        const setupNotifications = async () => {
            try {
                if (isSignedIn && user?.id) {
                    cleanup = await initNotificationSystem(user.id, router);
                    if (cleanup) {
                        console.log('🔔 Notifications initialized for user:', user.id);
                    } else {
                        console.warn('⚠️ Notifications not available for user:', user.id);
                    }
                }
            } catch (error) {
                // Suppress error logging for notification setup
                // Don't crash the app if notifications fail
            }
        };

        setupNotifications();

        return () => {
            cleanup?.();
        };
    }, [isSignedIn, user?.id, router]);

    return null; // This component doesn't render anything
};

export default NotificationInitializer;








