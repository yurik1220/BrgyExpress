import { Stack } from "expo-router";
// import UserStatusChecker from "@/components/UserStatusChecker";

const Layout = () => {
  return (
    // <UserStatusChecker>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(screens)" options={{ headerShown: false }} />
      </Stack>
    // </UserStatusChecker>
  );
};

export default Layout;
