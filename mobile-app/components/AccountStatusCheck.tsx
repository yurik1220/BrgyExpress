import React, { useEffect, useState } from 'react';
import { Alert, View, Text } from 'react-native';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { fetchAPI } from '@/lib/fetch';

interface AccountStatusCheckProps {
    children: React.ReactNode;
}

const AccountStatusCheck: React.FC<AccountStatusCheckProps> = ({ children }) => {
    const { isSignedIn, signOut } = useAuth();
    const { user } = useUser();
    const router = useRouter();
    const [isAccountDisabled, setIsAccountDisabled] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const [checkDisabled, setCheckDisabled] = useState(false);
    const [failureCount, setFailureCount] = useState(0);

    useEffect(() => {
        const checkAccountStatus = async () => {
            if (!isSignedIn || !user?.id) {
                setIsAccountDisabled(false);
                return;
            }

            // If check is disabled due to repeated failures, skip the check
            if (checkDisabled) {
                console.log('Account status check disabled due to repeated failures');
                setIsAccountDisabled(false);
                return;
            }

            setIsChecking(true);
            try {
                // Call backend API to check user status with timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
                
                await fetchAPI(`${process.env.EXPO_PUBLIC_API_URL}/api/users/${user.id}`, {
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                setIsAccountDisabled(false);
                // Reset failure count on successful check
                setFailureCount(0);
            } catch (error: any) {
                // AGGRESSIVE APPROACH: Only show "Account Disabled" for very specific cases
                // Check if this is a REAL account disabled error (must have both 403 AND specific message)
                const isRealAccountDisabled = (
                    error.message.includes('403') && 
                    error.message.includes('Account Disabled') &&
                    error.message.includes('Please contact Barangay')
                );

                if (isRealAccountDisabled) {
                    // Only show account disabled for very specific error message
                    console.log('Real account disabled detected:', error.message);
                    setIsAccountDisabled(true);
                    Alert.alert(
                        'Account Disabled',
                        'Account Disabled. Please contact Barangay',
                        [
                            {
                                text: 'OK',
                                onPress: async () => {
                                    await signOut();
                                    router.replace('/(auth)/welcome');
                                }
                            }
                        ]
                    );
                } else {
                    // EVERYTHING ELSE - don't disable account
                    console.warn('Account status check failed (not account disabled), allowing user to continue:', {
                        errorMessage: error.message,
                        errorCode: error.code,
                        errorType: typeof error
                    });
                    setIsAccountDisabled(false);
                    
                    // Increment failure count and disable check if too many failures
                    const newFailureCount = failureCount + 1;
                    setFailureCount(newFailureCount);
                    
                    if (newFailureCount >= 3) {
                        console.warn('Too many account status check failures, disabling check to prevent false account disabled alerts');
                        setCheckDisabled(true);
                    }
                }
            } finally {
                setIsChecking(false);
            }
        };

        checkAccountStatus();
    }, [isSignedIn, user?.id, signOut, router]);

    // Show loading screen while checking account status
    if (isChecking) {
        return (
            <View style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: '#f8fafc'
            }}>
                <View style={{
                    width: 40,
                    height: 40,
                    borderWidth: 4,
                    borderColor: '#e5e7eb',
                    borderTopColor: '#3b82f6',
                    borderRadius: 20,
                    // Note: Animation would need to be handled with Animated API in React Native
                }} />
                <Text style={{ marginTop: 16, color: '#6b7280' }}>Checking account status...</Text>
            </View>
        );
    }

    // Don't render children if account is disabled
    if (isAccountDisabled) {
        return null;
    }

    return <>{children}</>;
};

export default AccountStatusCheck;
