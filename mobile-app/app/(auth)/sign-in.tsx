import { ScrollView, Text, View, Image, Alert, Dimensions, TouchableOpacity } from "react-native";
import { icons, images } from "@/constants";
import InputField from "@/components/InputField";
import { useCallback, useState, useEffect } from "react";
import CustomButton from "@/components/CustomButton";
import { Link, useRouter } from "expo-router";
import { useSignIn, useAuth } from "@clerk/clerk-expo";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import Modal from "react-native-modal";

const { width } = Dimensions.get("window");

const SignIn = () => {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { isSignedIn, signOut } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isNavigationReady, setIsNavigationReady] = useState(false);

  // Check if navigation is ready
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsNavigationReady(true);
    }, 500); // Wait 500ms for navigation to be ready
    
    return () => clearTimeout(timer);
  }, []);

  // Helper function to safely navigate
  const safeNavigate = useCallback((path: string) => {
    if (isNavigationReady) {
      try {
        router.replace(path);
      } catch (error) {
        console.warn('Navigation failed, retrying in 100ms:', error);
        setTimeout(() => {
          try {
            router.replace(path);
          } catch (retryError) {
            console.warn('Navigation retry failed:', retryError);
          }
        }, 100);
      }
    } else {
      console.warn('Navigation not ready, waiting...');
      setTimeout(() => safeNavigate(path), 100);
    }
  }, [isNavigationReady, router]);
  const [resetPassword, setResetPassword] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetNeedsSecondFactor, setResetNeedsSecondFactor] = useState(false);
  const [resetError, setResetError] = useState("");
  const [showResetCodeSentModal, setShowResetCodeSentModal] = useState(false);
  const [showResetSuccessModal, setShowResetSuccessModal] = useState(false);

  const onSignInPress = useCallback(async () => {
    if (!isLoaded) return;

    // Validate if fields are filled
    if (!form.email || !form.password) {
      Alert.alert("Missing Fields", "Please fill in all fields.");
      return;
    }

    try {
      const signInAttempt = await signIn.create({
        identifier: form.email.trim().toLowerCase(),
        password: form.password,
      });

      if (signInAttempt.status === "complete") {
        await setActive({ session: signInAttempt.createdSessionId });
        
        // Check user status after successful authentication
        try {
          const { fetchAPI } = await import("@/lib/fetch");
          await fetchAPI(`${process.env.EXPO_PUBLIC_API_URL}/api/users/${signInAttempt.createdUserId}`);
          console.log('✅ User status check successful, navigating to home');
          // Use safe navigation to avoid timing issues
          safeNavigate("/(root)/(tabs)/home");
        } catch (statusError: any) {
          // Suppress console logs for user-facing errors that are handled in UI
          const shouldSuppressLog = (
            statusError.message.includes('404') ||
            statusError.message.includes('User not found') ||
            statusError.message.includes('Account Disabled') ||
            statusError.message.includes('403')
          );
          
          if (!shouldSuppressLog) {
            console.log('⚠️ User status check failed:', statusError.message);
          }
          
          // If account is disabled, sign out and show error
          if (statusError.message.includes('403') || statusError.message.includes('Account Disabled')) {
            console.log('❌ Account is disabled, signing out');
            await signOut();
            Alert.alert(
              "Account Disabled",
              "Account Disabled. Please contact Barangay",
              [{ text: "OK" }]
            );
            return;
          }
          
          // For other errors (like network issues, server errors, etc.), 
          // still navigate to home and let AccountStatusCheck handle it
          // Don't show "Something went wrong" for these cases
          // Suppress console warnings for user-facing errors that are handled in UI
          // Don't log warnings for 404, user not found, or account disabled errors
          const shouldSuppressWarning = (
            statusError.message.includes('404') ||
            statusError.message.includes('User not found') ||
            statusError.message.includes('Account Disabled') ||
            statusError.message.includes('403')
          );
          
          if (!shouldSuppressWarning) {
            console.warn('User status check failed during login, but continuing to home screen:', statusError.message);
          }
          // Use safe navigation to avoid timing issues
          safeNavigate("/(root)/(tabs)/home");
        }
      } else {
        // Handle incomplete sign-in attempts more gracefully
        console.log('🔍 Sign-in attempt status:', signInAttempt.status);
        console.log('🔍 Sign-in attempt details:', JSON.stringify(signInAttempt, null, 2));
        
        // If the sign-in attempt is not complete but not due to user error,
        // it might be a temporary issue - let's try to continue anyway
        if (signInAttempt.status === "needs_second_factor" || 
            signInAttempt.status === "needs_new_password" ||
            signInAttempt.status === "needs_identifier") {
          console.log('🚨 User input required, showing login failed alert for status:', signInAttempt.status);
          Alert.alert("Error", "Log in failed. Please try again.");
        } else {
          // For any other incomplete status, don't show "Log in failed" - try to continue
          console.log('Sign-in status is incomplete but not a user error, attempting to continue:', signInAttempt.status);
          // For other incomplete statuses, try to continue and let AccountStatusCheck handle it
          console.warn('Sign-in incomplete but continuing:', signInAttempt.status);
          try {
            await setActive({ session: signInAttempt.createdSessionId });
            // Use safe navigation to avoid timing issues
            safeNavigate("/(root)/(tabs)/home");
          } catch (setActiveError) {
            console.warn('Failed to set active session:', setActiveError);
            // Don't show "Log in failed" for setActive errors - these might be temporary
            // Just log the error and continue to home screen
            console.warn('setActive failed but continuing to home screen');
            // Use safe navigation to avoid timing issues
            safeNavigate("/(root)/(tabs)/home");
          }
        }
      }
    } catch (err: any) {
      console.log(JSON.stringify(err, null, 2));
      
      // Only show error alerts for specific authentication failures
      // Don't show generic "Something went wrong" for network or server issues
      if (err.errors && err.errors.length > 0) {
        const errorMessage = err.errors[0]?.longMessage;
        if (errorMessage && !errorMessage.includes('network') && !errorMessage.includes('timeout')) {
          Alert.alert("Error", errorMessage);
        } else {
          // For network/timeout issues, show a more specific message or just log
          console.warn('Authentication error (likely network related):', errorMessage);
          Alert.alert("Error", "Unable to connect. Please check your internet connection and try again.");
        }
      } else {
        // For unexpected errors, check if it's a network issue before showing generic message
        const errorString = err?.toString() || '';
        if (errorString.includes('network') || errorString.includes('timeout') || errorString.includes('fetch')) {
          console.warn('Network-related authentication error:', errorString);
          Alert.alert("Error", "Unable to connect. Please check your internet connection and try again.");
        } else if (errorString.includes('User not authenticated') || 
                   errorString.includes('404') || 
                   errorString.includes('User not found') ||
                   errorString.includes('Account Disabled') ||
                   errorString.includes('403') ||
                   errorString.includes('Attempted to navigate before mounting') ||
                   errorString.includes('Root Layout component')) {
          // Don't show "Log in failed" for user authentication issues or navigation timing issues
          console.warn('User authentication or navigation timing issue, but continuing:', errorString);
          // Try to continue to home screen anyway using safe navigation
          safeNavigate("/(root)/(tabs)/home");
        } else {
          // Only show "Log in failed" for actual authentication errors (like wrong password)
          console.log('🚨 Actual authentication error, showing alert:', errorString);
          console.log('🚨 Full error object:', err);
          Alert.alert("Error", "Log in failed. Please try again.");
        }
      }
    }
  }, [isLoaded, form]);

  const onSendResetCode = useCallback(async () => {
    if (!isLoaded) return;
    try {
      await signIn?.create({
        strategy: "reset_password_email_code",
        identifier: resetEmail.trim().toLowerCase(),
      });
      setResetError("");
      setShowResetCodeSentModal(true);
    } catch (err: any) {
      console.log(JSON.stringify(err, null, 2));
      setResetError(err.errors?.[0]?.longMessage || "Failed to send reset code");
    }
  }, [isLoaded, resetEmail, signIn]);

  const onResetPassword = useCallback(async () => {
    if (!isLoaded) return;
    try {
      const result = await signIn?.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: resetCode,
        password: resetPassword,
      });

      if (!result) return;
      if (result.status === "needs_second_factor") {
        setResetNeedsSecondFactor(true);
        setResetError("");
      } else if (result.status === "complete") {
        setResetError("");
        setShowResetSuccessModal(true);
      } else {
        console.log(result);
      }
    } catch (err: any) {
      console.log(JSON.stringify(err, null, 2));
      setResetError(err.errors?.[0]?.longMessage || "Failed to reset password");
    }
  }, [isLoaded, resetCode, resetPassword, signIn]);

  return (
    <>
    <ScrollView className="flex-1 bg-white">
      <LinearGradient
        colors={['#ffffff', '#f8f9fa']}
        className="absolute w-full h-full"
      />
      
      <View className="flex-1">
        <Animated.View 
          entering={FadeIn.delay(200)}
          className="relative w-full h-[300px]"
        >
          <Image 
            source={images.signUpCar} 
            className="w-full h-full"
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.3)']}
            className="absolute bottom-0 w-full h-32"
          />
          <Text className="text-3xl text-white font-Jakarta-Bold absolute bottom-8 left-6">
            Welcome Back 👋
          </Text>
        </Animated.View>

        <Animated.View 
          entering={FadeInDown.delay(400).springify()}
          className="p-6 bg-white rounded-t-[32px] -mt-8"
        >
          {!showReset && (
            <>
              <Text className="text-2xl font-Jakarta-Bold text-gray-800 mb-6">
                Sign In
              </Text>

              <InputField
                label="Email"
                placeholder="Enter your email"
                icon={icons.email}
                keyboardType="email-address"
                value={form.email}
                onChangeText={(value) => setForm({ ...form, email: value })}
                className="mb-4"
              />
              
              <InputField
                label="Password"
                placeholder="Enter your password"
                icon={icons.lock}
                secureTextEntry={true}
                value={form.password}
                onChangeText={(value) => setForm({ ...form, password: value })}
                className="mb-3"
              />

              <View className="flex-row justify-between items-center mb-6">
                <TouchableOpacity onPress={() => setShowReset(true)}>
                  <Text className="text-primary-500 font-Jakarta-SemiBold">Forgot password?</Text>
                </TouchableOpacity>
              </View>

              <CustomButton
                title="Sign In"
                onPress={onSignInPress}
                className="h-[56px] rounded-xl"
              />

              <Text className="text-center text-gray-600 mt-8">
                Don't have an account?{" "}
                <Link href="/sign-up">
                  <Text className="text-primary-500 font-Jakarta-SemiBold">Sign Up</Text>
                </Link>
              </Text>
            </>
          )}

          {showReset && (
            <>
              <Text className="text-2xl font-Jakarta-Bold text-gray-800 mb-6">
                Reset Password
              </Text>

              {!resetSent && (
                <>
                  <InputField
                    label="Email"
                    placeholder="you@example.com"
                    icon={icons.email}
                    keyboardType="email-address"
                    value={resetEmail}
                    onChangeText={setResetEmail as any}
                    className="mb-4"
                  />
                  {resetError ? (
                    <Text className="text-red-500 mb-3">{resetError}</Text>
                  ) : null}
                  <CustomButton
                    title="Send reset code"
                    onPress={onSendResetCode}
                    className="h-[52px] rounded-xl"
                  />
                  <TouchableOpacity className="mt-4" onPress={() => setShowReset(false)}>
                    <Text className="text-center text-gray-600">Back to Sign In</Text>
                  </TouchableOpacity>
                </>
              )}

              {resetSent && (
                <>
                  <InputField
                    label="New Password"
                    placeholder="Enter new password"
                    icon={icons.lock}
                    secureTextEntry={true}
                    value={resetPassword}
                    onChangeText={setResetPassword as any}
                    className="mb-4"
                  />
                  <InputField
                    label="Reset Code"
                    placeholder="Enter the code sent to your email"
                    icon={icons.lock}
                    value={resetCode}
                    onChangeText={setResetCode as any}
                    className="mb-3"
                  />
                  {resetError ? (
                    <Text className="text-red-500 mb-3">{resetError}</Text>
                  ) : null}
                  {resetNeedsSecondFactor ? (
                    <Text className="text-amber-600 mb-3">2FA required (not handled here)</Text>
                  ) : null}
                  <CustomButton
                    title="Reset password"
                    onPress={onResetPassword}
                    className="h-[52px] rounded-xl"
                  />
                  <TouchableOpacity className="mt-4" onPress={() => setShowReset(false)}>
                    <Text className="text-center text-gray-600">Back to Sign In</Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          )}
        </Animated.View>
      </View>
    </ScrollView>

    {/* Modal: Code Sent */}
    <Modal isVisible={showResetCodeSentModal}>
      <View className="bg-white px-7 py-9 rounded-2xl min-h-[200px]">
        <Text className="text-2xl font-JakartaBold text-center mb-2">Verification Sent</Text>
        <Text className="text-base text-gray-600 font-Jakarta text-center mb-6">
          Verification code has been sent to your email.
        </Text>
        <CustomButton
          title="Continue"
          onPress={() => { setShowResetCodeSentModal(false); setResetSent(true); }}
          className="mt-2 h-[56px] rounded-xl"
        />
      </View>
    </Modal>

    {/* Modal: Reset Success */}
    <Modal isVisible={showResetSuccessModal}>
      <View className="bg-white px-7 py-9 rounded-2xl min-h-[200px]">
        <Text className="text-2xl font-JakartaBold text-center mb-2">Password Reset</Text>
        <Text className="text-base text-gray-600 font-Jakarta text-center mb-6">
          Your password has been reset.
        </Text>
        <CustomButton
          title="Go to Sign In"
          onPress={() => {
            setShowResetSuccessModal(false);
            setShowReset(false);
            setResetSent(false);
            setResetEmail("");
            setResetCode("");
            setResetPassword("");
            (async () => { try { await signOut?.(); } catch {} finally { safeNavigate('/sign-in'); } })();
          }}
          className="mt-2 h-[56px] rounded-xl"
        />
      </View>
    </Modal>

    </>
  );
};

export default SignIn;
