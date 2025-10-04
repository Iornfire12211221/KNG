import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useApp } from '@/hooks/app-store';
import { router } from 'expo-router';
import { 
  Smartphone,
  CheckCircle,
  AlertCircle,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Типы для Telegram WebApp
interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
      is_premium?: boolean;
      photo_url?: string;
    };
    auth_date: number;
    hash: string;
  };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: any;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  headerColor: string;
  backgroundColor: string;
  isClosingConfirmationEnabled: boolean;
  ready: () => void;
  close: () => void;
  expand: () => void;
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    isProgressVisible: boolean;
    setText: (text: string) => void;
    onClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    showProgress: (leaveActive?: boolean) => void;
    hideProgress: () => void;
  };
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

export default function AuthScreen() {
  const { loginWithTelegram, currentUser } = useApp();
  const [isLoading, setIsLoading] = useState(true);
  const [authStatus, setAuthStatus] = useState<'checking' | 'telegram' | 'fallback' | 'error'>('checking');
  const [telegramUser, setTelegramUser] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Проверяем Telegram WebApp при загрузке
  useEffect(() => {
    const initTelegramAuth = async () => {
      try {
        // Сначала проверяем данные в URL (для случаев, когда WebApp не доступен)
        if (Platform.OS === 'web') {
          console.log('🔍 Checking for Telegram data in URL...');
          console.log('🔍 Current URL:', window.location.href);
          console.log('🔍 Current hash:', window.location.hash);
          
          const urlParams = new URLSearchParams(window.location.hash.substring(1));
          const tgWebAppData = urlParams.get('tgWebAppData');
          
          if (tgWebAppData) {
            console.log('📱 Найдены данные Telegram в URL');
            
            // Парсим данные пользователя из URL
            console.log('🔍 Parsing tgWebAppData:', tgWebAppData);
            
            // Пробуем разные форматы URL
            let userMatch = tgWebAppData.match(/user%3D([^&]+)/); // Старый формат
            if (!userMatch) {
              userMatch = tgWebAppData.match(/user=([^&]+)/); // Новый формат
            }
            console.log('🔍 User match:', userMatch);
            console.log('🔍 UserMatch length:', userMatch?.length);
            console.log('🔍 UserMatch truthy:', !!userMatch);
            
            if (userMatch && userMatch.length > 0) {
              console.log('✅ UserMatch найден, обрабатываем...');
              const userDataStr = decodeURIComponent(userMatch[1]);
              console.log('🔍 Decoded user data string:', userDataStr);
              
              let userData;
              try {
                userData = JSON.parse(userDataStr);
                console.log('👤 Данные пользователя из URL:', userData);
                setTelegramUser(userData);
                setAuthStatus('telegram');
                
                console.log('🔄 Вызываем loginWithTelegram...');
              } catch (parseError) {
                console.error('❌ Ошибка парсинга JSON:', parseError);
                console.log('🔍 Проблемная строка:', userDataStr);
                return;
              }
              
              // Автоматически авторизуем пользователя
              const success = await loginWithTelegram({
                telegramId: userData.id,
                firstName: userData.first_name,
                lastName: userData.last_name,
                username: userData.username,
                languageCode: userData.language_code,
                isPremium: userData.is_premium,
                photoUrl: userData.photo_url,
              });
              
              console.log('🔄 Результат loginWithTelegram:', success);
              
              if (success) {
                console.log('✅ Авторизация успешна, перенаправляем...');
                router.replace('/');
                return;
              } else {
                console.log('❌ Ошибка авторизации');
                setErrorMessage('Ошибка авторизации через Telegram');
                setAuthStatus('error');
              }
            }
          }
        }
        
        // Если данных в URL нет, проверяем Telegram WebApp
        if (Platform.OS === 'web' && window.Telegram?.WebApp) {
          const tg = window.Telegram.WebApp;
          
          console.log('Telegram WebApp detected:', {
            version: tg.version,
            platform: tg.platform,
            initDataUnsafe: tg.initDataUnsafe
          });
          
          // Инициализируем Telegram WebApp
          tg.ready();
          tg.expand();
          
          // Проверяем данные пользователя
          if (tg.initDataUnsafe?.user) {
            const user = tg.initDataUnsafe.user;
            setTelegramUser(user);
            setAuthStatus('telegram');
            
            // Автоматически авторизуем пользователя
            const success = await loginWithTelegram({
              telegramId: user.id,
              firstName: user.first_name,
              lastName: user.last_name,
              username: user.username,
              languageCode: user.language_code,
              isPremium: user.is_premium,
              photoUrl: user.photo_url,
            });
            
            if (success) {
              router.replace('/');
              return;
            } else {
              setErrorMessage('Ошибка авторизации через Telegram');
              setAuthStatus('error');
            }
          } else {
            console.log('No Telegram user data available');
            setAuthStatus('fallback');
          }
        } else {
          console.log('Not running in Telegram WebApp and no URL data found');
          setAuthStatus('fallback');
        }
      } catch (error) {
        console.error('Telegram auth error:', error);
        setAuthStatus('fallback');
      } finally {
        setIsLoading(false);
      }
    };
    
    // Если пользователь уже авторизован, перенаправляем
    if (currentUser) {
      router.replace('/');
      return;
    }
    
    initTelegramAuth();
  }, [currentUser, loginWithTelegram]);

  const handleTelegramAuth = async () => {
    if (!telegramUser) return;
    
    setIsLoading(true);
    try {
      const success = await loginWithTelegram({
        telegramId: telegramUser.id,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
        username: telegramUser.username,
        languageCode: telegramUser.language_code,
        isPremium: telegramUser.is_premium,
        photoUrl: telegramUser.photo_url,
      });
      
      if (success) {
        router.replace('/');
      } else {
        Alert.alert('Ошибка', 'Не удалось авторизоваться');
      }
    } catch {
      Alert.alert('Ошибка', 'Произошла ошибка при авторизации');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleFallbackAuth = async () => {
    setIsLoading(true);
    try {
      console.log('Starting demo login...');
      const success = await loginWithTelegram({
        telegramId: 12345,
        firstName: 'Демо',
        lastName: 'Пользователь',
        username: 'demo_user',
      });
      console.log('Demo login result:', success);
      if (success) {
        console.log('Demo login successful, redirecting...');
        router.replace('/');
      } else {
        console.log('Demo login failed');
        setErrorMessage('Не удалось войти в демо режим');
        setAuthStatus('error');
      }
    } catch (error) {
      console.error('Demo login error:', error);
      setErrorMessage('Ошибка входа в демо режим');
      setAuthStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && authStatus === 'checking') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Инициализация...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Smartphone size={32} color="#FFFFFF" />
            </View>
          </View>
          <Text style={styles.title}>Авторизация</Text>
          <Text style={styles.subtitle}>
            {authStatus === 'telegram' 
              ? 'Вход через Telegram'
              : authStatus === 'fallback'
              ? 'Вход через Telegram Mini App'
              : 'Ошибка авторизации'
            }
          </Text>
        </View>

        {/* Content based on auth status */}
        {authStatus === 'telegram' && telegramUser && (
          <View style={styles.telegramAuth}>
            <View style={styles.userInfo}>
              <CheckCircle size={24} color="#34C759" />
              <Text style={styles.userInfoTitle}>Данные получены из Telegram</Text>
              <Text style={styles.userInfoText}>
                {telegramUser.first_name} {telegramUser.last_name || ''}
              </Text>
              {telegramUser.username && (
                <Text style={styles.userInfoUsername}>@{telegramUser.username}</Text>
              )}
            </View>
            
            <TouchableOpacity 
              style={[styles.authButton, isLoading && styles.authButtonDisabled]}
              onPress={handleTelegramAuth}
              disabled={isLoading}
            >
              {isLoading ? (
                <View style={styles.buttonContent}>
                  <ActivityIndicator size="small" color="#FFFFFF" style={styles.buttonLoader} />
                  <Text style={styles.authButtonText}>Авторизация...</Text>
                </View>
              ) : (
                <Text style={styles.authButtonText}>Продолжить</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {authStatus === 'fallback' && (
          <View style={styles.fallbackAuth}>
            <View style={styles.infoContainer}>
              <AlertCircle size={24} color="#666666" />
              <Text style={styles.infoTitle}>Приложение запущено вне Telegram</Text>
              <Text style={styles.infoText}>
                Для полного функционала откройте приложение в Telegram Mini Apps
              </Text>
            </View>
            
            <TouchableOpacity 
              style={[styles.demoButton, isLoading && styles.demoButtonDisabled]}
              onPress={handleFallbackAuth}
              disabled={isLoading}
            >
              {isLoading ? (
                <View style={styles.buttonContent}>
                  <ActivityIndicator size="small" color="#FFFFFF" style={styles.buttonLoader} />
                  <Text style={styles.demoButtonText}>Открытие...</Text>
                </View>
              ) : (
                <Text style={styles.demoButtonText}>Открыть приложение</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {authStatus === 'error' && (
          <View style={styles.errorContainer}>
            <AlertCircle size={24} color="#FF3B30" />
            <Text style={styles.errorTitle}>Ошибка авторизации</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
            
            <TouchableOpacity 
              style={[styles.retryButton, isLoading && styles.retryButtonDisabled]}
              onPress={() => {
                setAuthStatus('checking');
                setIsLoading(true);
                setErrorMessage('');
                // Перезапускаем инициализацию
                setTimeout(() => {
                  setAuthStatus('fallback');
                  setIsLoading(false);
                }, 1000);
              }}
              disabled={isLoading}
            >
              {isLoading ? (
                <View style={styles.buttonContent}>
                  <ActivityIndicator size="small" color="#FFFFFF" style={styles.buttonLoader} />
                  <Text style={styles.retryButtonText}>Проверка...</Text>
                </View>
              ) : (
                <Text style={styles.retryButtonText}>Попробовать снова</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Info */}
        <View style={styles.infoFooter}>
          <Text style={styles.infoFooterText}>
            Приложение предназначено для использования в Telegram Mini Apps
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '600' as const,
    color: '#000000',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
  telegramAuth: {
    alignItems: 'center',
    gap: 20,
  },
  userInfo: {
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 20,
    gap: 8,
    width: '100%',
  },
  userInfoTitle: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#34C759',
    marginTop: 4,
  },
  userInfoText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#000000',
    textAlign: 'center',
  },
  userInfoUsername: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  authButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    height: 50,
    paddingHorizontal: 32,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 200,
  },
  authButtonDisabled: {
    opacity: 0.5,
  },
  authButtonText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  fallbackAuth: {
    alignItems: 'center',
    gap: 20,
  },
  infoContainer: {
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 20,
    gap: 8,
    width: '100%',
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: '#666666',
    marginTop: 4,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 20,
  },
  demoButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    height: 50,
    paddingHorizontal: 32,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 200,
  },
  demoButtonDisabled: {
    opacity: 0.5,
  },
  demoButtonText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLoader: {
    marginRight: 8,
  },
  errorContainer: {
    alignItems: 'center',
    gap: 16,
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: '#FF3B30',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButtonDisabled: {
    opacity: 0.5,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  infoFooter: {
    marginTop: 32,
    paddingHorizontal: 16,
  },
  infoFooterText: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 16,
  },
});