import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/stores/authStore';

export default function Index() {
  const { isFirstLaunch, isAuthenticated } = useAuthStore();

  if (isFirstLaunch) {
    return <Redirect href="/(auth)/setup" />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href="/(tabs)" />;
}
