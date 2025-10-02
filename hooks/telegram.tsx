import { useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';

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
    chat?: {
      id: number;
      type: string;
      title?: string;
      username?: string;
    };
    start_param?: string;
  };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
    secondary_bg_color?: string;
  };
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  headerColor: string;
  backgroundColor: string;
  isClosingConfirmationEnabled: boolean;
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    isProgressVisible: boolean;
    setText: (text: string) => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    showProgress: (leaveActive?: boolean) => void;
    hideProgress: () => void;
    setParams: (params: {
      text?: string;
      color?: string;
      text_color?: string;
      is_active?: boolean;
      is_visible?: boolean;
    }) => void;
  };
  BackButton: {
    isVisible: boolean;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
  };
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  expand: () => void;
  close: () => void;
  ready: () => void;
  sendData: (data: string) => void;
  openLink: (url: string, options?: { try_instant_view?: boolean }) => void;
  openTelegramLink: (url: string) => void;
  showPopup: (params: {
    title?: string;
    message: string;
    buttons?: {
      id?: string;
      type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive';
      text: string;
    }[];
  }, callback?: (buttonId: string) => void) => void;
  showAlert: (message: string, callback?: () => void) => void;
  showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
  showScanQrPopup: (params: {
    text?: string;
  }, callback?: (text: string) => void) => void;
  closeScanQrPopup: () => void;
  readTextFromClipboard: (callback?: (text: string) => void) => void;
  requestWriteAccess: (callback?: (granted: boolean) => void) => void;
  requestContact: (callback?: (granted: boolean, contact?: {
    contact: {
      phone_number: string;
      first_name: string;
      last_name?: string;
      user_id?: number;
    };
  }) => void) => void;
  requestLocation: (callback?: (granted: boolean, location?: {
    latitude: number;
    longitude: number;
  }) => void) => void;
  invokeCustomMethod: (method: string, params?: any, callback?: (error: string, result: any) => void) => void;
}

export const useTelegram = () => {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [user, setUser] = useState<TelegramWebApp['initDataUnsafe']['user'] | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const tg = window.Telegram?.WebApp;
        if (tg) {
          setWebApp(tg as any);
          
          // Безопасно получаем данные пользователя
          try {
            const userData = tg.initDataUnsafe?.user || null;
            setUser(userData);
          } catch (error) {
            console.warn('⚠️ Ошибка получения данных пользователя:', error);
            setUser(null);
          }
          
          // Готовим WebApp
          try {
            tg.ready();
          } catch (error) {
            console.warn('⚠️ Ошибка инициализации WebApp:', error);
          }
          
          // Расширяем на весь экран
          try {
            tg.expand();
          } catch (error) {
            console.warn('⚠️ Ошибка расширения WebApp:', error);
          }
          
          // Включаем подтверждение закрытия
          try {
            tg.isClosingConfirmationEnabled = true;
          } catch (error) {
            console.warn('⚠️ Ошибка настройки подтверждения закрытия:', error);
          }
          
          setIsReady(true);
          
          console.log('✅ Telegram WebApp готов:', {
            user: tg.initDataUnsafe?.user,
            platform: tg.platform,
            version: tg.version,
            colorScheme: tg.colorScheme
          });
        } else {
          console.log('ℹ️ Не запущено в Telegram WebApp');
          setIsReady(true);
        }
      } catch (error) {
        console.error('❌ Критическая ошибка инициализации Telegram WebApp:', error);
        setIsReady(true);
      }
    } else {
      setIsReady(true);
    }
    
    // Глобальная обработка ошибок для Telegram API
    const handleTelegramError = (event: any) => {
      const errorMessage = event.error?.message || event.reason?.message || '';
      
      if (errorMessage.includes('FILE_REFERENCE_EXPIRED')) {
        console.warn('⚠️ Telegram FILE_REFERENCE_EXPIRED - игнорируем');
        event.preventDefault();
        return false;
      }
      
      if (errorMessage.includes('RPCError')) {
        console.warn('⚠️ Telegram RPC Error - игнорируем:', errorMessage);
        event.preventDefault();
        return false;
      }
      
      if (errorMessage.includes('The message port closed')) {
        console.warn('⚠️ Telegram message port closed - игнорируем');
        event.preventDefault();
        return false;
      }
    };
    
    const handlePromiseRejection = (event: any) => {
      const errorMessage = event.reason?.message || '';
      
      if (errorMessage.includes('FILE_REFERENCE_EXPIRED') || 
          errorMessage.includes('RPCError') ||
          errorMessage.includes('The message port closed')) {
        console.warn('⚠️ Ignoring Telegram promise rejection:', errorMessage);
        event.preventDefault();
        return false;
      }
    };
    
    window.addEventListener('error', handleTelegramError);
    window.addEventListener('unhandledrejection', handlePromiseRejection);
    
    return () => {
      window.removeEventListener('error', handleTelegramError);
      window.removeEventListener('unhandledrejection', handlePromiseRejection);
    };
  }, []);

  const showMainButton = useCallback((text: string, onClick: () => void) => {
    if (webApp?.MainButton) {
      webApp.MainButton.setText(text);
      webApp.MainButton.onClick(onClick);
      webApp.MainButton.show();
    }
  }, [webApp]);

  const hideMainButton = useCallback(() => {
    if (webApp?.MainButton) {
      webApp.MainButton.hide();
    }
  }, [webApp]);

  const showBackButton = useCallback((onClick: () => void) => {
    if (webApp?.BackButton) {
      webApp.BackButton.onClick(onClick);
      webApp.BackButton.show();
    }
  }, [webApp]);

  const hideBackButton = useCallback(() => {
    if (webApp?.BackButton) {
      webApp.BackButton.hide();
    }
  }, [webApp]);

  const hapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning' | 'selection') => {
    if (webApp?.HapticFeedback) {
      if (type === 'selection') {
        webApp.HapticFeedback.selectionChanged();
      } else if (['success', 'error', 'warning'].includes(type)) {
        webApp.HapticFeedback.notificationOccurred(type as 'success' | 'error' | 'warning');
      } else {
        webApp.HapticFeedback.impactOccurred(type as 'light' | 'medium' | 'heavy');
      }
    }
  }, [webApp]);

  const showAlert = useCallback((message: string) => {
    return new Promise<void>((resolve) => {
      if (webApp?.showAlert) {
        webApp.showAlert(message, () => resolve());
      } else {
        alert(message);
        resolve();
      }
    });
  }, [webApp]);

  const showConfirm = useCallback((message: string) => {
    return new Promise<boolean>((resolve) => {
      if (webApp?.showConfirm) {
        webApp.showConfirm(message, (confirmed) => resolve(confirmed));
      } else {
        resolve(confirm(message));
      }
    });
  }, [webApp]);

  const close = useCallback(() => {
    if (webApp?.close) {
      webApp.close();
    }
  }, [webApp]);

  const sendData = useCallback((data: any) => {
    if (webApp?.sendData) {
      webApp.sendData(JSON.stringify(data));
    }
  }, [webApp]);

  const openLink = useCallback((url: string) => {
    if (webApp?.openLink) {
      webApp.openLink(url);
    } else {
      window.open(url, '_blank');
    }
  }, [webApp]);

  const openTelegramLink = useCallback((url: string) => {
    if (webApp?.openTelegramLink) {
      webApp.openTelegramLink(url);
    } else {
      window.open(url, '_blank');
    }
  }, [webApp]);

  const requestLocation = useCallback(() => {
    return new Promise<{ granted: boolean; location?: { latitude: number; longitude: number } }>((resolve) => {
      console.log('🔍 requestLocation called');
      console.log('🔍 webApp available:', !!webApp);
      console.log('🔍 webApp.requestLocation available:', !!webApp?.requestLocation);
      
      if (webApp?.requestLocation) {
        console.log('📱 Using Telegram WebApp requestLocation');
        webApp.requestLocation((granted, location) => {
          console.log('📱 Telegram requestLocation callback:', { granted, location });
          resolve({ granted, location });
        });
      } else {
        console.log('🌐 Using browser geolocation fallback');
        // Fallback для обычного браузера
        if (navigator.geolocation) {
          console.log('🌐 Browser geolocation available, requesting position...');
          navigator.geolocation.getCurrentPosition(
            (position) => {
              console.log('🌐 Browser geolocation success:', position.coords);
              resolve({
                granted: true,
                location: {
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                }
              });
            },
            (error) => {
              console.log('🌐 Browser geolocation error:', error);
              resolve({ granted: false });
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 } // Изменили maximumAge на 0 для получения свежих данных
          );
        } else {
          console.log('❌ No geolocation available');
          resolve({ granted: false });
        }
      }
    });
  }, [webApp]);

  return {
    webApp,
    user,
    isReady,
    isTelegramWebApp: !!webApp,
    colorScheme: webApp?.colorScheme || 'light',
    themeParams: webApp?.themeParams || {},
    platform: webApp?.platform || 'unknown',
    version: webApp?.version || 'unknown',
    showMainButton,
    hideMainButton,
    showBackButton,
    hideBackButton,
    hapticFeedback,
    showAlert,
    showConfirm,
    close,
    sendData,
    openLink,
    openTelegramLink,
    requestLocation,
  };
};

export default useTelegram;