import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import LoadingOverlay from '@/components/LoadingOverlay';
import { useApp } from '@/hooks/app-store';
import { router } from 'expo-router';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { currentUser, isLoading } = useApp();
  
  console.log('🔄 AuthGuard: isLoading =', isLoading, 'currentUser =', !!currentUser);

  React.useEffect(() => {
    console.log('🔄 AuthGuard: useEffect triggered, isLoading =', isLoading, 'currentUser =', !!currentUser);
    if (!isLoading && !currentUser) {
      console.log('🔄 AuthGuard: Redirecting to /auth');
      router.replace('/auth');
    }
  }, [currentUser, isLoading]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingOverlay visible label="Инициализация..." />
      </View>
    );
  }

  if (!currentUser) {
    return null;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
});