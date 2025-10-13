import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { useApp } from './app-store';

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
  };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams?: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
    secondary_bg_color?: string;
  };
  ready: () => void;
  expand: () => void;
  close: () => void;
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
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    showProgress: () => void;
    hideProgress: () => void;
    setParams: (params: any) => void;
  };
  BackButton: {
    isVisible: boolean;
    onClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
  };
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  sendData: (data: string) => void;
  openLink: (url: string) => void;
  openTelegramLink: (url: string) => void;
  showPopup: (params: any) => void;
  showAlert: (message: string) => void;
  showConfirm: (message: string, callback: (confirmed: boolean) => void) => void;
  showScanQrPopup: (params: any) => void;
  closeScanQrPopup: () => void;
  readTextFromClipboard: (callback: (text: string) => void) => void;
  requestWriteAccess: (callback: (granted: boolean) => void) => void;
  requestContact: (callback: (granted: boolean) => void) => void;
  requestLocation: (callback: (granted: boolean) => void) => void;
  invokeCustomMethod: (method: string, params: any, callback?: (error: string, result: any) => void) => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

export const useTelegram = () => {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [user, setUser] = useState<TelegramWebApp['initDataUnsafe']['user'] | null>(null);
  // Если мы на сервере, сразу готовы
  const [isReady, setIsReady] = useState(true);

  useEffect(() => {
    console.log('🔄 useTelegram: Starting initialization...');
    
    // Проверяем, что мы в браузере (не во время SSR)
    if (typeof window === 'undefined') {
      console.log('🔄 useTelegram: SSR detected, setting ready immediately');
      setIsReady(true);
      return;
    }
    
    if (Platform.OS === 'web') {
      console.log('🔄 useTelegram: Web platform detected');
      
      // Ждем загрузки Telegram WebApp API (может загружаться асинхронно)
      const checkTelegramWebApp = () => {
        const tg = window.Telegram?.WebApp;
        console.log('🔄 useTelegram: Telegram WebApp found:', !!tg);
        
        if (tg) {
          // Реальный Telegram WebApp найден
          console.log('🔄 useTelegram: Initializing real Telegram WebApp...');
          
          setWebApp(tg as any);
          setUser(tg.initDataUnsafe?.user || null);
          
          // Готовим WebApp
          try {
            tg.ready();
            tg.expand();
            tg.isClosingConfirmationEnabled = false;
            
            // Включаем тактильную обратную связь
            if (tg.HapticFeedback) {
              tg.HapticFeedback.impactOccurred('light');
            }
            
            // Скрываем кнопки по умолчанию
            if (tg.MainButton) {
              tg.MainButton.hide();
            }
            if (tg.BackButton) {
              tg.BackButton.hide();
            }
          } catch (error) {
            console.error('❌ useTelegram: Error initializing Telegram WebApp:', error);
          }
          
          console.log('✅ useTelegram: Telegram WebApp готов');
          setIsReady(true);
        } else {
          // Проверяем URL на наличие Telegram данных
          const urlParams = new URLSearchParams(window.location.search);
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const tgWebAppData = urlParams.get('tgWebAppData') || hashParams.get('tgWebAppData');
          
          if (tgWebAppData) {
            console.log('🔄 useTelegram: Telegram data found in URL, but WebApp API not loaded yet');
            // Ждем еще немного для загрузки API
            setTimeout(checkTelegramWebApp, 100);
            return;
          }
          
          // Telegram WebApp не найден - работаем в браузерном режиме
          console.log('ℹ️ Telegram WebApp не найден, работаем в браузерном режиме');
          
          // Создаем mock WebApp для браузерного режима
          const mockWebApp = {
            initData: '',
            initDataUnsafe: { user: null },
            version: '6.0',
            platform: 'unknown',
            colorScheme: 'light' as const,
            themeParams: {
              bg_color: '#ffffff',
              text_color: '#000000',
              hint_color: '#707579',
              link_color: '#00488f',
              button_color: '#3390ec',
              button_text_color: '#ffffff',
              secondary_bg_color: '#f4f4f5'
            },
            ready: () => {},
            expand: () => {},
            close: () => {},
            isClosingConfirmationEnabled: false,
            MainButton: {
              text: '',
              color: '',
              textColor: '',
              isVisible: false,
              isActive: false,
              isProgressVisible: false,
              setText: () => {},
              onClick: () => {},
              show: () => {},
              hide: () => {},
              enable: () => {},
              disable: () => {},
              showProgress: () => {},
              hideProgress: () => {},
              setParams: () => {}
            },
            BackButton: {
              isVisible: false,
              onClick: () => {},
              show: () => {},
              hide: () => {}
            },
            HapticFeedback: {
              impactOccurred: () => {},
              notificationOccurred: () => {},
              selectionChanged: () => {}
            },
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
            invokeCustomMethod: () => {}
          };
          
          setWebApp(mockWebApp as any);
          setUser(null);
          console.log('✅ useTelegram: Браузерный режим активирован');
          setIsReady(true);
        }
      };
      
      // Проверяем сразу
      checkTelegramWebApp();
      
      // Если не найден, ждем еще немного
      if (!window.Telegram?.WebApp) {
        setTimeout(checkTelegramWebApp, 500);
      }
    } else {
      // Не в веб-окружении
      console.log('🔄 useTelegram: Non-web platform');
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

  const hapticFeedback = useCallback((style: 'light' | 'medium' | 'heavy' = 'light') => {
    if (webApp?.HapticFeedback) {
      webApp.HapticFeedback.impactOccurred(style);
    }
  }, [webApp]);

  const closeWebApp = useCallback(() => {
    if (webApp?.close) {
      webApp.close();
    }
  }, [webApp]);

  const openLink = useCallback((url: string) => {
    if (webApp?.openLink) {
      webApp.openLink(url);
    } else {
      window.open(url, '_blank');
    }
  }, [webApp]);

  const showAlert = useCallback((message: string) => {
    if (webApp?.showAlert) {
      webApp.showAlert(message);
    } else {
      alert(message);
    }
  }, [webApp]);

  return {
    webApp,
    user,
    isReady,
    isTelegramWebApp: !!webApp && webApp.platform !== 'unknown',
    colorScheme: webApp?.colorScheme || 'light',
    themeParams: webApp?.themeParams,
    showMainButton,
    hideMainButton,
    showBackButton,
    hideBackButton,
    hapticFeedback,
    closeWebApp,
    openLink,
    showAlert,
  };
};
