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
      const tg = window.Telegram?.WebApp;
      if (tg) {
        setWebApp(tg as any);
        setUser(tg.initDataUnsafe?.user || null);
        
        // Готовим WebApp
        tg.ready();
        
        // Расширяем на весь экран
        tg.expand();
        
        // Включаем подтверждение закрытия
        tg.isClosingConfirmationEnabled = true;
        
        setIsReady(true);
        
        console.log('Telegram WebApp готов:', {
          user: tg.initDataUnsafe?.user,
          platform: tg.platform,
          version: tg.version,
          colorScheme: tg.colorScheme
        });
      } else {
        console.log('Не запущено в Telegram WebApp');
        
        // Fallback: парсим данные из URL
        try {
          console.log('ℹ️ Telegram WebApp не найден, пытаемся парсить из URL');
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
            
            if (userMatch) {
              const userDataStr = decodeURIComponent(userMatch[1]);
              console.log('🔍 Decoded user data string:', userDataStr);
              const userData = JSON.parse(userDataStr);
              
              console.log('👤 Данные пользователя из URL:', userData);
              setUser(userData);
              
              // Создаем mock WebApp объект
              const mockWebApp = {
                initData: tgWebAppData,
                initDataUnsafe: { user: userData },
                version: '9.1',
                platform: 'weba',
                colorScheme: 'light' as const,
                themeParams: {},
                isExpanded: true,
                viewportHeight: window.innerHeight,
                viewportStableHeight: window.innerHeight,
                headerColor: '#ffffff',
                backgroundColor: '#ffffff',
                isClosingConfirmationEnabled: false,
                MainButton: {
                  text: '',
                  color: '#3390ec',
                  textColor: '#ffffff',
                  isVisible: false,
                  isActive: true,
                  isProgressVisible: false,
                  setText: () => {},
                  onClick: () => {},
                  show: () => {},
                  hide: () => {},
                  enable: () => {},
                  disable: () => {},
                  showProgress: () => {},
                  hideProgress: () => {},
                  setParams: () => {},
                },
                BackButton: {
                  isVisible: false,
                  onClick: () => {},
                  show: () => {},
                  hide: () => {},
                },
                HapticFeedback: {
                  impactOccurred: () => {},
                  notificationOccurred: () => {},
                  selectionChanged: () => {},
                },
                ready: () => {},
                sendData: () => {},
                openLink: () => {},
                openTelegramLink: () => {},
                showPopup: () => {},
                showAlert: () => {},
                showConfirm: () => {},
                showScanQrPopup: () => {},
                closeScanQrPopup: () => {},
                readTextFromClipboard: () => {},
                requestWriteAccess: () => {},
                requestContact: () => {},
                requestLocation: () => {},
                invokeCustomMethod: () => {},
              };
              
              setWebApp(mockWebApp as any);
              console.log('✅ Mock Telegram WebApp создан');
            }
          }
        } catch (error) {
          console.warn('⚠️ Ошибка парсинга данных Telegram из URL:', error);
        }
        
        setIsReady(true);
      }
    } else {
      setIsReady(true);
    }
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
      if (webApp?.requestLocation) {
        webApp.requestLocation((granted, location) => {
          resolve({ granted, location });
        });
      } else {
        // Fallback для обычного браузера
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                granted: true,
                location: {
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                }
              });
            },
            () => {
              resolve({ granted: false });
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
          );
        } else {
          resolve({ granted: false });
        }
      }
    });
  }, [webApp]);

  return {
    webApp,
    user,
    telegramUser: user, // Добавляем алиас для совместимости
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