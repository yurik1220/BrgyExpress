import React, { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import Modal from 'react-native-modal';
import { View, Text } from 'react-native';
import CustomButton from './CustomButton';
import LoadingScreen from './LoadingScreen';

interface UserStatusCheckerProps {
  children: React.ReactNode;
}

const UserStatusChecker: React.FC<UserStatusCheckerProps> = ({ children }) => {
  const { isSignedIn, signOut, getToken } = useAuth();
  const router = useRouter();
  const [showAccountDisabledModal, setShowAccountDisabledModal] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const checkUserStatus = async () => {
      if (!isSignedIn) {
        setIsChecking(false);
        return;
      }

      setIsChecking(true);
      try {
        const token = await getToken();
        if (!token) {
          setIsChecking(false);
          return;
        }

        const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/users/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const userData = await response.json();
          
          // Check if user account is disabled
          if (userData.status === 'disabled') {
            await signOut();
            setShowAccountDisabledModal(true);
          }
        }
      } catch (error) {
        console.log('User status check failed:', error);
        // If status check fails, continue normally
      } finally {
        setIsChecking(false);
      }
    };

    // Only check once when user becomes signed in
    if (isSignedIn) {
      checkUserStatus();
    }
  }, [isSignedIn]);

  if (isChecking) {
    return <LoadingScreen message="Checking account status..." />;
  }

  return (
    <>
      {children}
      
      {/* Modal: Account Disabled */}
      <Modal isVisible={showAccountDisabledModal}>
        <View className="bg-white px-7 py-9 rounded-2xl min-h-[200px]">
          <View className="items-center mb-6">
            <View className="w-16 h-16 bg-red-100 rounded-full items-center justify-center mb-4">
              <Text className="text-3xl">🚫</Text>
            </View>
            <Text className="text-2xl font-JakartaBold text-center mb-2">Account Disabled</Text>
            <Text className="text-base text-gray-600 font-Jakarta text-center">
              Please go to the Barangay for lifting account.
            </Text>
          </View>
          <CustomButton
            title="OK"
            onPress={() => {
              setShowAccountDisabledModal(false);
              router.replace('/(auth)/sign-in');
            }}
            className="mt-2 h-[56px] rounded-xl"
          />
        </View>
      </Modal>
    </>
  );
};

export default UserStatusChecker;
