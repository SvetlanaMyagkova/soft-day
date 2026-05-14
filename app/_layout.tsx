import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

const colors = {
  background: '#F5F0E6',
};

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />

      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        <Stack.Screen name="(tabs)" />

        <Stack.Screen name="auth" />
        <Stack.Screen name="food" />
        <Stack.Screen name="finance" />
        <Stack.Screen name="gratitude" />
        <Stack.Screen name="reading" />
        <Stack.Screen name="training" />
        <Stack.Screen name="privacy" />

        <Stack.Screen
          name="modal"
          options={{
            presentation: 'modal',
          }}
        />
      </Stack>
    </>
  );
}