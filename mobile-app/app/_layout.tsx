import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "react-native-reanimated";
import "./globals.css";
import { tokenCache } from "@/lib/auth";
import { ClerkProvider, ClerkLoaded } from "@clerk/clerk-expo";
import { LogBox } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import LoadingScreen from "@/components/LoadingScreen";
import AccountStatusCheck from "@/components/AccountStatusCheck";
import NotificationInitializer from "@/components/NotificationInitializer";


// Initialize React Query client with custom error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry for user-facing errors that are handled in UI
        const errorMessage = error?.message || '';
        if (errorMessage.includes('403') && errorMessage.includes('Account Disabled')) {
          return false;
        }
        return failureCount < 3;
      },
      onError: (error: any) => {
        // Suppress console errors for user-facing errors that are handled in UI
        const errorMessage = error?.message || '';
        const isNetworkError = (
          errorMessage.includes('network') ||
          errorMessage.includes('timeout') ||
          errorMessage.includes('fetch') ||
          errorMessage.includes('Failed to fetch') ||
          errorMessage.includes('Network request failed') ||
          errorMessage.includes('Connection') ||
          errorMessage.includes('ECONNREFUSED') ||
          errorMessage.includes('ENOTFOUND') ||
          errorMessage.includes('ETIMEDOUT')
        );
        
        const shouldSuppressLog = (
          errorMessage.includes('403') && (errorMessage.includes('Account Disabled') || errorMessage.includes('Account Disabled. Please contact Barangay')) ||
          errorMessage.includes('401') ||
          errorMessage.includes('400') ||
          errorMessage.includes('404') ||
          errorMessage.includes('409') ||
          (errorMessage.includes('404') && errorMessage.includes('User not found')) ||
          errorMessage.includes('User not authenticated') ||
          isNetworkError
        );
        
        if (!shouldSuppressLog) {
          console.error("Query error:", error);
        }
      }
    },
    mutations: {
      onError: (error: any) => {
        // Suppress console errors for user-facing errors that are handled in UI
        const errorMessage = error?.message || '';
        const isNetworkError = (
          errorMessage.includes('network') ||
          errorMessage.includes('timeout') ||
          errorMessage.includes('fetch') ||
          errorMessage.includes('Failed to fetch') ||
          errorMessage.includes('Network request failed') ||
          errorMessage.includes('Connection') ||
          errorMessage.includes('ECONNREFUSED') ||
          errorMessage.includes('ENOTFOUND') ||
          errorMessage.includes('ETIMEDOUT')
        );
        
        const shouldSuppressLog = (
          errorMessage.includes('403') && (errorMessage.includes('Account Disabled') || errorMessage.includes('Account Disabled. Please contact Barangay')) ||
          errorMessage.includes('401') ||
          errorMessage.includes('400') ||
          errorMessage.includes('404') ||
          errorMessage.includes('409') ||
          (errorMessage.includes('404') && errorMessage.includes('User not found')) ||
          errorMessage.includes('User not authenticated') ||
          isNetworkError
        );
        
        if (!shouldSuppressLog) {
          console.error("Mutation error:", error);
        }
      }
    }
  }
});

SplashScreen.preventAutoHideAsync();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error(
      "Missing Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env",
  );
}

LogBox.ignoreLogs(["Clerk:"]);

export default function RootLayout() {
  const [loaded] = useFonts({
    "Jakarta-Bold": require("../assets/fonts/PlusJakartaSans-Bold.ttf"),
    "Jakarta-ExtraBold": require("../assets/fonts/PlusJakartaSans-ExtraBold.ttf"),
    "Jakarta-ExtraLight": require("../assets/fonts/PlusJakartaSans-ExtraLight.ttf"),
    "Jakarta-Light": require("../assets/fonts/PlusJakartaSans-Light.ttf"),
    "Jakarta-Medium": require("../assets/fonts/PlusJakartaSans-Medium.ttf"),
    Jakarta: require("../assets/fonts/PlusJakartaSans-Regular.ttf"),
    "Jakarta-SemiBold": require("../assets/fonts/PlusJakartaSans-SemiBold.ttf"),
  });
  useEffect(() => {
    if (loaded) {
      // Add a small delay to ensure smooth transition
      const timer = setTimeout(() => {
        SplashScreen.hideAsync();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loaded]);

  if (!loaded) {
    return <LoadingScreen message="Loading fonts..." />;
  }

  return (
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#FAF9F6' }}>
        <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
          <QueryClientProvider client={queryClient}>
            <ClerkLoaded>
              <AccountStatusCheck>
                <Stack>
                  <Stack.Screen name="index" options={{ headerShown: false }} />
                  <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                  <Stack.Screen name="(root)" options={{ headerShown: false }} />
                  <Stack.Screen name="+not-found" />
                </Stack>
              </AccountStatusCheck>
              <NotificationInitializer />
            </ClerkLoaded>
          </QueryClientProvider>
        </ClerkProvider>
      </GestureHandlerRootView>
  );
}

export default RootLayout;