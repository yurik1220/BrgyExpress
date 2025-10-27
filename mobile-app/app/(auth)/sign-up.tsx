import { ScrollView, Text, View, Image, Alert, Pressable, Dimensions, KeyboardAvoidingView, Platform, TextInput } from "react-native";
import { icons, images } from "@/constants";
import InputField from "@/components/InputField";
import React, { useState } from "react";
import CustomButton from "@/components/CustomButton";
import { useSignUp, useAuth } from "@clerk/clerk-expo";
import { Link, router } from "expo-router";
import Modal from "react-native-modal";
import { fetchAPI } from "@/lib/fetch";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";

const { width } = Dimensions.get("window");

const SignUp = () => {
  const { isLoaded, signUp, setActive } = useSignUp();
  const { signOut } = useAuth();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [verification, setVerification] = useState({
    state: "default",
    error: "",
    code: "",
  });

  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationErrors, setValidationErrors] = useState({
    username: '',
    email: ''
  });

  const startResendTimer = () => {
    setResendTimer(60); // 60 seconds
    const timer = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Validate username availability
  const validateUsername = async (username: string) => {
    if (!username || username.trim().length < 3) {
      setValidationErrors(prev => ({ ...prev, username: '' }));
      return true;
    }

    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/users/check-username/${encodeURIComponent(username.trim())}`);
      const data = await response.json();
      
      if (response.status === 409) {
        setValidationErrors(prev => ({ ...prev, username: data.message }));
        return false;
      } else if (response.ok) {
        setValidationErrors(prev => ({ ...prev, username: '' }));
        return true;
      }
      return true;
    } catch (error) {
      console.warn('Username validation error:', error);
      return true; // Allow to proceed if validation fails
    }
  };

  // Validate email availability
  const validateEmail = async (email: string) => {
    if (!email || !email.includes('@')) {
      setValidationErrors(prev => ({ ...prev, email: '' }));
      return true;
    }

    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/users/check-email/${encodeURIComponent(email.trim().toLowerCase())}`);
      const data = await response.json();
      
      if (response.status === 409) {
        setValidationErrors(prev => ({ ...prev, email: data.message }));
        return false;
      } else if (response.ok) {
        setValidationErrors(prev => ({ ...prev, email: '' }));
        return true;
      }
      return true;
    } catch (error) {
      console.warn('Email validation error:', error);
      return true; // Allow to proceed if validation fails
    }
  };

  // Validate both username and email
  const validateForm = async () => {
    setIsValidating(true);
    setValidationErrors({ username: '', email: '' });

    const usernameValid = await validateUsername(form.username);
    const emailValid = await validateEmail(form.email);

    setIsValidating(false);
    return usernameValid && emailValid;
  };

  const onSignUpPress = async () => {
    if (!isLoaded) return;

    if (form.password !== form.confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }

    if (!acceptedTerms) {
      setShowTermsModal(true);
      return;
    }

    // Validate username and email availability
    const isFormValid = await validateForm();
    if (!isFormValid) {
      // Show specific error message for username/email conflicts
      if (validationErrors.username) {
        Alert.alert("Username Taken", validationErrors.username);
      } else if (validationErrors.email) {
        Alert.alert("Email Already Used", validationErrors.email);
      }
      return; // Stop the sign-up process
    }

    try {
      // 1. Create account with email & password
      await signUp.create({
        emailAddress: form.email.trim().toLowerCase(),
        password: form.password,
      });

      // 2. Send email verification code
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });

      // 3. Open the email verification modal and start timer
      setVerification({ state: "pending", error: "", code: "" });
      startResendTimer();
    } catch (err: any) {
      Alert.alert("Error", err.errors?.[0]?.longMessage || "Sign up failed.");
    }
  };

  const onPressVerifyEmail = async () => {
    if (!isLoaded) return;

    try {
      const result = await signUp.attemptEmailAddressVerification({ code: verification.code });

      if (result.status === "complete" && result.createdSessionId) {
        // 4. Final validation before creating user in database
        setIsCreatingUser(true);
        try {
          // Double-check username and email availability before creating user
          const finalValidation = await validateForm();
          if (!finalValidation) {
            // If validation fails at this point, sign out the user and show error
            await signOut();
            if (validationErrors.username) {
              Alert.alert("Username Taken", validationErrors.username);
            } else if (validationErrors.email) {
              Alert.alert("Email Already Used", validationErrors.email);
            }
            setVerification({ state: "default", error: "", code: "" });
            return;
          }

          const response = await fetchAPI(`${process.env.EXPO_PUBLIC_API_URL}/api/users`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username: form.username,
              email: form.email.trim().toLowerCase(),
              clerkId: signUp.createdUserId,
              phonenumber: null, // Add phonenumber field as expected by server
            }),
          });
          
          console.log('✅ User created in database:', response);
        } catch (dbError: any) {
          console.error('❌ Database user creation failed:', dbError);
          
          // Check if it's a username/email conflict error
          if (dbError.message && (
            dbError.message.includes('Username has been taken') || 
            dbError.message.includes('Email has been used')
          )) {
            // Sign out the user and show specific error
            await signOut();
            Alert.alert(
              "Account Conflict", 
              dbError.message,
              [
                {
                  text: "OK",
                  onPress: () => {
                    setVerification({ state: "default", error: "", code: "" });
                  }
                }
              ]
            );
            return;
          }
          
          // For other database errors, show generic message
          Alert.alert(
            "Database Error", 
            "Your account was created but there was an issue saving your profile. Please contact support if you experience any issues.",
            [
              {
                text: "Continue",
                onPress: () => {
                  // Continue with signup even if DB fails - user is created in Clerk
                }
              }
            ]
          );
        } finally {
          setIsCreatingUser(false);
        }

        // Log the user in
        await setActive({ session: result.createdSessionId });

        // 5. Show the success modal
        setVerification({ state: "default", error: "", code: "" });
        setShowSuccessModal(true);
      } else {
        setVerification({
          ...verification,
          error: `Unexpected verification status: ${result.status}`,
          state: "failed",
        });
      }
    } catch (err: any) {
      setVerification({
        ...verification,
        error: err.errors?.[0]?.longMessage || "Verification failed.",
        state: "failed",
      });
    }
  };

  const handleResendCode = async () => {
    if (!isLoaded || resendTimer > 0) return;

    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      startResendTimer();
      Alert.alert("Success", "Verification code has been resent.");
    } catch (err: any) {
      Alert.alert("Error", err.errors?.[0]?.longMessage || "Failed to resend code.");
    }
  };

  return (
    <KeyboardAvoidingView 
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <LinearGradient
        colors={['#ffffff', '#f8f9fa']}
        className="absolute w-full h-full"
      />
      
      <View className="flex-1">
        <Animated.View 
          entering={FadeIn.delay(200)}
          className="relative w-full h-[200px]"
        >
          <Image 
            source={images.signUpCar} 
            className="w-full h-full"
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.3)']}
            className="absolute bottom-0 w-full h-24"
          />
          <Text className="text-2xl text-white font-Jakarta-Bold absolute bottom-6 left-6">
            Create Account
          </Text>
        </Animated.View>

        <ScrollView 
          className="flex-1 bg-white rounded-t-[32px] -mt-6"
          contentContainerStyle={{ padding: 24, paddingBottom: 50 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View 
            entering={FadeInDown.delay(400).springify()}
            className="flex-1"
          >
          <Text className="text-2xl font-Jakarta-Bold text-gray-800 mb-4">
            Sign Up
          </Text>

          <View className="mb-3">
            <InputField
              label="Username"
              placeholder="Enter your username"
              icon={icons.person}
              value={form.username}
              onChangeText={(v) => {
                setForm({ ...form, username: v });
                // Clear validation error when user starts typing
                if (validationErrors.username) {
                  setValidationErrors(prev => ({ ...prev, username: '' }));
                }
              }}
              onBlur={() => {
                // Validate username when user finishes typing
                if (form.username.trim().length >= 3) {
                  validateUsername(form.username);
                }
              }}
            />
            {validationErrors.username ? (
              <Text className="text-red-500 text-sm mt-1">{validationErrors.username}</Text>
            ) : null}
          </View>
          
          <View className="mb-3">
            <InputField
              label="Email"
              placeholder="you@example.com"
              icon={icons.email}
              value={form.email}
              keyboardType="email-address"
              onChangeText={(v) => {
                setForm({ ...form, email: v });
                // Clear validation error when user starts typing
                if (validationErrors.email) {
                  setValidationErrors(prev => ({ ...prev, email: '' }));
                }
              }}
              onBlur={() => {
                // Validate email when user finishes typing
                if (form.email.includes('@')) {
                  validateEmail(form.email);
                }
              }}
            />
            {validationErrors.email ? (
              <View className="mt-1">
                <Text className="text-red-500 text-sm">{validationErrors.email}</Text>
                <Link href="/sign-in" className="mt-1">
                  <Text className="text-primary-500 text-sm font-Jakarta-SemiBold">
                    Click here to log in instead
                  </Text>
                </Link>
              </View>
            ) : null}
          </View>
          
          <View className="my-2 w-full">
            <Text className="text-lg font-JakartaSemiBold mb-3">
              Password
            </Text>
            <View className="flex flex-row justify-start items-center relative bg-neutral-100 rounded-full border border-neutral-100 focus:border-primary-500">
              <Image source={icons.lock} className="w-6 h-6 ml-4" />
              <TextInput
                className="rounded-full p-4 font-JakartaSemiBold text-[15px] flex-1 text-left"
                placeholder="Enter your password"
                secureTextEntry={!showPassword}
                value={form.password}
                onChangeText={(v: string) => setForm({ ...form, password: v })}
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                className="mr-4 p-2"
              >
                <Ionicons 
                  name={showPassword ? "eye-off" : "eye"} 
                  size={20} 
                  color="#666" 
                />
              </Pressable>
            </View>
          </View>
          
          <View className="my-2 w-full">
            <Text className="text-lg font-JakartaSemiBold mb-3">
              Confirm Password
            </Text>
            <View className="flex flex-row justify-start items-center relative bg-neutral-100 rounded-full border border-neutral-100 focus:border-primary-500">
              <Image source={icons.lock} className="w-6 h-6 ml-4" />
              <TextInput
                className="rounded-full p-4 font-JakartaSemiBold text-[15px] flex-1 text-left"
                placeholder="Confirm your password"
                secureTextEntry={!showConfirmPassword}
                value={form.confirmPassword}
                onChangeText={(v: string) => setForm({ ...form, confirmPassword: v })}
              />
              <Pressable
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                className="mr-4 p-2"
              >
                <Ionicons 
                  name={showConfirmPassword ? "eye-off" : "eye"} 
                  size={20} 
                  color="#666" 
                />
              </Pressable>
            </View>
          </View>

          <Pressable 
            onPress={() => setAcceptedTerms(!acceptedTerms)}
            className="flex-row items-center mt-1 mb-4"
          >
            <View className={`w-5 h-5 border-2 rounded mr-2 items-center justify-center ${acceptedTerms ? 'bg-primary-500 border-primary-500' : 'border-gray-300'}`}>
              {acceptedTerms && <Ionicons name="checkmark" size={14} color="white" />}
            </View>
            <Text className="text-sm text-gray-600">
              I agree to the{" "}
              <Text className="text-primary-500 font-Jakarta-SemiBold">Terms and Conditions</Text>
            </Text>
          </Pressable>

          <CustomButton 
            title={isValidating ? "Validating..." : "Sign Up"} 
            onPress={onSignUpPress} 
            className="h-[50px] rounded-xl"
            disabled={!acceptedTerms || isValidating || validationErrors.username !== '' || validationErrors.email !== ''}
          />

          <Link href="/sign-in" className="mt-4">
            <Text className="text-center text-gray-600">
              Already have an account?{" "}
              <Text className="text-primary-500 font-Jakarta-SemiBold">
                Log In
              </Text>
            </Text>
          </Link>
          </Animated.View>
        </ScrollView>
      </View>

      {/* Terms and Conditions Modal */}
      <Modal isVisible={showTermsModal}>
        <View className="bg-white px-7 py-9 rounded-2xl min-h-[200px]">
          <View className="items-center mb-4">
            <Ionicons name="alert-circle" size={50} color="#FF6B6B" />
          </View>
          <Text className="text-2xl font-JakartaBold text-center mb-2">Terms Required</Text>
          <Text className="text-base text-gray-600 font-Jakarta text-center mb-6">
            Please read and accept the Terms and Conditions to create your account.
          </Text>
          <CustomButton
            title="I Understand"
            onPress={() => setShowTermsModal(false)}
            className="mt-2 h-[56px] rounded-xl"
          />
        </View>
      </Modal>

      {/* Email Verification Modal */}
      <Modal isVisible={verification.state === "pending"}>
        <View className="bg-white px-7 py-9 rounded-2xl min-h-[300px]">
          <View className="flex-row justify-between items-center mb-4">
            <Pressable 
              onPress={() => {
                setVerification({ state: "default", error: "", code: "" });
                setResendTimer(0);
              }}
              className="flex-row items-center"
            >
              <Ionicons name="arrow-back" size={24} color="#666" />
            </Pressable>
            <Text className="text-2xl font-JakartaExtraBold">Email Verification</Text>
            <View style={{ width: 60 }} />
          </View>

          <Text className="font-Jakarta mb-5">
            <Text>We've sent a verification code to </Text>
            <Text className="font-Jakarta-SemiBold">{form.email}</Text>
          </Text>
          
          <InputField
            label="Code"
            icon={icons.lock}
            placeholder="12345"
            value={verification.code}
            keyboardType="numeric"
            onChangeText={(code) => setVerification({ ...verification, code })}
            className="mb-4"
          />
          
          {verification.error && (
            <Text className="text-red-500 text-sm mt-1 mb-4">{verification.error}</Text>
          )}

          <CustomButton 
            title={isCreatingUser ? "Creating Account..." : "Verify Email"} 
            onPress={onPressVerifyEmail} 
            className="h-[56px] rounded-xl bg-success-500" 
            disabled={isCreatingUser}
          />

          <Pressable 
            onPress={handleResendCode}
            disabled={resendTimer > 0}
            className={`mt-4 items-center ${resendTimer > 0 ? 'opacity-50' : ''}`}
          >
            <Text className="text-primary-500 font-Jakarta-SemiBold">
              {resendTimer > 0 
                ? `Resend code in ${resendTimer}s` 
                : "Didn't receive the code? Resend"}
            </Text>
          </Pressable>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal isVisible={showSuccessModal}>
        <View className="bg-white px-7 py-9 rounded-2xl min-h-[300px]">
          <Image source={images.check} className="w-[110px] h-[110px] mx-auto my-5" />
          <Text className="text-3xl font-JakartaBold text-center">Verified</Text>
          <Text className="text-base text-gray-400 font-Jakarta text-center mt-2">
            You have successfully signed up
          </Text>
          <CustomButton
            title="Browse Home"
            onPress={() => {
              setShowSuccessModal(false);
              router.push("/(root)/(tabs)/home");
            }}
            className="mt-5 h-[56px] rounded-xl"
          />
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

export default SignUp;