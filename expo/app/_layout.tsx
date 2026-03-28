import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useMemo, useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ActivityIndicator, Platform, StyleSheet, Text, View, useColorScheme } from "react-native";
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { AppProvider, useApp } from "@/hooks/app-store";
import { AILearningProvider } from "@/hooks/ai-learning";
import { trpc, trpcClient } from "@/lib/trpc";
import { useTelegram } from "@/hooks/telegram";

SplashScreen.preventAutoHideAsync().catch(() => {
  console.log("preventAutoHideAsync error ignored");
});

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Назад" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="add-post"
        options={{ presentation: "modal", title: "Добавить пост" }}
      />
      <Stack.Screen
        name="admin"
        options={{ presentation: "modal", headerShown: false }}
      />
      <Stack.Screen
        name="auth"
        options={{ presentation: "fullScreenModal", headerShown: false }}
      />
    </Stack>
  );
}

function AppContent() {
  const systemColorScheme = useColorScheme();
  const telegram = useTelegram();
  const { loginWithTelegram, currentUser } = useApp();
  
  console.log('🔄 AppContent: telegram.isReady =', telegram.isReady);
  console.log('🔄 AppContent: window.Telegram exists:', typeof window !== 'undefined' && !!window.Telegram);
  console.log('🔄 AppContent: window.Telegram.WebApp exists:', typeof window !== 'undefined' && !!window.Telegram?.WebApp);
  console.log('🔄 AppContent: telegram.user =', telegram.user);
  console.log('🔄 AppContent: currentUser =', currentUser);

  // Автоматическая авторизация пользователя из Telegram WebApp
  useEffect(() => {
    if (telegram.isReady && telegram.user) {
      // Проверяем, что это реальный пользователь (не демо)
      const isRealUser = telegram.user.id !== 123456789 && telegram.user.username !== 'demo_user';
      
      // Авторизуем, если:
      // 1. Пользователь не авторизован ИЛИ
      // 2. Текущий пользователь - демо ИЛИ
      // 3. ID текущего пользователя не совпадает с ID из Telegram
      const shouldLogin = !currentUser || 
                         currentUser.telegramUsername === 'demo_user' ||
                         (currentUser.telegramId && String(currentUser.telegramId) !== String(telegram.user.id));
      
      if (isRealUser && shouldLogin) {
        console.log('🔄 AppContent: Auto-login with Telegram user:', telegram.user);
        console.log('🔄 AppContent: Current user:', currentUser);
        loginWithTelegram({
          telegramId: telegram.user.id,
          firstName: telegram.user.first_name,
          lastName: telegram.user.last_name || '',
          username: telegram.user.username,
          languageCode: telegram.user.language_code,
          isPremium: telegram.user.is_premium || false,
          photoUrl: telegram.user.photo_url,
        }).then(success => {
          console.log('🔄 AppContent: Auto-login result:', success);
        });
      }
    }
  }, [telegram.isReady, telegram.user, currentUser, loginWithTelegram]);

  const colorScheme = useMemo(() => {
    if (Platform.OS === 'web' && telegram.isTelegramWebApp && telegram.webApp) {
      return telegram.webApp.colorScheme;
    }
    return systemColorScheme;
  }, [telegram.webApp, telegram.isTelegramWebApp, systemColorScheme]);

  const telegramTheme = useMemo(() => {
    if (Platform.OS === 'web' && telegram.isTelegramWebApp && telegram.webApp?.themeParams) {
      const { themeParams } = telegram.webApp;
      const isDark = telegram.webApp.colorScheme === 'dark';
      const baseTheme = isDark ? DarkTheme : DefaultTheme;
      return {
        ...baseTheme,
        colors: {
          ...baseTheme.colors,
          primary: themeParams.button_color || baseTheme.colors.primary,
          background: themeParams.bg_color || baseTheme.colors.background,
          card: themeParams.secondary_bg_color || baseTheme.colors.card,
          text: themeParams.text_color || baseTheme.colors.text,
          border: themeParams.hint_color || baseTheme.colors.border,
          notification: themeParams.link_color || baseTheme.colors.notification,
        },
      } as typeof DefaultTheme;
    }
    return (colorScheme === 'dark' ? DarkTheme : DefaultTheme) as typeof DefaultTheme;
  }, [telegram, colorScheme]);

  // Force cache refresh for Telegram WebApp
  useEffect(() => {
    if (Platform.OS === 'web' && telegram.isTelegramWebApp) {
      console.log('Telegram WebApp detected - version 1.0.1-2025-01-22-09-35');
      // Force reload if needed
      const lastVersion = localStorage.getItem('app-version');
      const currentVersion = '1.0.1-2025-01-22-09-35';
      if (lastVersion && lastVersion !== currentVersion) {
        console.log('App version changed, clearing cache');
        localStorage.clear();
        sessionStorage.clear();
      }
      localStorage.setItem('app-version', currentVersion);
    }
  }, [telegram.isTelegramWebApp]);

  // Mapbox resources are loaded dynamically when MapView component mounts
  // This prevents unnecessary preloading and console warnings

  const onLayoutRootView = React.useCallback(() => {
    if (telegram.isReady) {
      SplashScreen.hideAsync().catch((e) => {
        console.warn("Error hiding splash screen:")
      });
    }
  }, [telegram.isReady]);

  if (!telegram.isReady) {
    console.log('🔄 AppContent: Showing loading screen, telegram.isReady =', telegram.isReady);
    return (
      <View style={styles.loadingContainer} testID="app-loading">
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Загрузка Telegram WebApp...</Text>
        <Text style={styles.loadingSubtext}>
          {typeof window !== 'undefined' && window.Telegram?.WebApp 
            ? '✅ Telegram API найден' 
            : '⏳ Ожидание Telegram API...'}
        </Text>
      </View>
    );
  }
  
  console.log('✅ AppContent: Telegram ready, rendering main app');

  return (
    <ThemeProvider value={telegramTheme}>
      <GestureHandlerRootView style={styles.gestureContainer} onLayout={onLayoutRootView}>
        <RootLayoutNav />
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: unknown; errorInfo?: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, error };
  }
  componentDidCatch(error: unknown, errorInfo: any) {
    console.error('❌ App error boundary caught:', error);
    console.error('❌ Error info:', errorInfo);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack');
    this.setState({ error, errorInfo });
  }
  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error instanceof Error 
        ? this.state.error.message 
        : String(this.state.error).substring(0, 100);
      
      return (
        <View style={styles.loadingContainer} testID="app-error">
          <Text style={styles.errorTitle}>Произошла ошибка</Text>
          <Text style={styles.loadingText}>Перезагрузите страницу</Text>
          {errorMessage && (
            <Text style={styles.errorDetails}>
              {errorMessage}
            </Text>
          )}
        </View>
      );
    }
    return this.props.children as React.ReactElement;
  }
}

export default function RootLayout() {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AppProvider>
          <AILearningProvider>
            <ErrorBoundary>
              <AppContent />
            </ErrorBoundary>
          </AILearningProvider>
        </AppProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 12,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#999999',
    marginTop: 8,
  },
  errorTitle: {
    fontSize: 18,
    color: '#FF3B30',
    fontWeight: '600' as const,
  },
  errorDetails: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  gestureContainer: {
    flex: 1,
  },
});