import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';

// Объявляем window.Telegram глобально
declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

// Определяем интерфейс TelegramWebApp
export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    query_id?: string;
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code: string;
      is_premium?: boolean;
      allows_write_to_pm?: boolean;
      photo_url?: string;
    };
    receiver?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      photo_url?: string;
    };
    chat?: {
      id: number;
      type: 'group' | 'supergroup' | 'channel';
      title: string;
      username?: string;
      photo_url?: string;
    };
    chat_type?: 'sender' | 'private' | 'group' | 'supergroup' | 'channel';
    chat_instance?: string;
    start_param?: string;
    can_send_after?: number;
    auth_date: number;
    hash: string;
  };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: {
    bg_color: string;
    text_color: string;
    hint_color: string;
    link_color: string;
    button_color: string;
    button_text_color: string;
    secondary_bg_color: string;
    header_bg_color?: string;
    accent_text_color?: string;
    section_bg_color?: string;
    section_header_text_color?: string;
    subtitle_text_color?: string;
    destructive_text_color?: string;
  };
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  headerColor: string;
  backgroundColor: string;
  isClosingConfirmationEnabled: boolean;
  BackButton: {
    isVisible: boolean;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
  };
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
      is_visible?: boolean;
      is_active?: boolean;
    }) => void;
  };
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'success' | 'warning' | 'error') => void;
    selectionChanged: () => void;
  };
  isVersionAtLeast: (version: string) => boolean;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  ready: () => void;
  expand: () => void;
  close: () => void;
  enableClosingConfirmation: () => void;
  disableClosingConfirmation: () => void;
  onEvent: (eventType: string, callback: Function) => void;
  offEvent: (eventType: string, callback: Function) => void;
  sendData: (data: string) => void;
  openLink: (url: string, options?: {
    try_instant_view?: boolean;
  }) => void;
  openTelegramLink: (url: string) => void;
  showPopup: (params: any, callback?: (buttonId: string) => void) => void;
  showAlert: (message: string, callback?: () => void) => void;
  showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
  showScanQrPopup: (params: {
    text?: string;
  }, callback?: (text: string) => void) => void;
  closeScanQrPopup: () => void;
  readTextFromClipboard: (callback?: (text: string) => void) => void;
  requestWriteAccess: (callback?: (granted: boolean) => void) => void;
  requestContact: (callback?: (granted: boolean) => void) => void;
  requestLocation: (callback?: (granted: boolean) => void) => void;
  invokeCustomMethod: (method: string, params?: object, callback?: (data: object) => void) => void;
}

// Глобальный флаг для предотвращения множественных инициализаций
let isTelegramInitialized = false;

export const useTelegram = () => {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [user, setUser] = useState<TelegramWebApp['initDataUnsafe']['user'] | null>(null);
  const [isReady, setIsReady] = useState(false); // Изначально не готовы

  useEffect(() => {
    // Предотвращаем множественные инициализации
    if (isReady || isTelegramInitialized) {
      console.log('🔄 useTelegram: Already initialized, skipping...');
      return;
    }
    
    console.log('🔄 useTelegram: Starting initialization...');
    console.log('🔄 useTelegram: Current URL:', typeof window !== 'undefined' ? window.location.href : 'SSR');
    console.log('🔄 useTelegram: Platform.OS:', Platform.OS);

    if (typeof window === 'undefined') {
      console.log('🔄 useTelegram: SSR detected, setting ready immediately');
      setIsReady(true);
      return;
    }

    if (Platform.OS === 'web') {
      console.log('🔄 useTelegram: Web platform detected');

      const initWebApp = (tg: TelegramWebApp) => {
        console.log('🔄 useTelegram: Initializing real Telegram WebApp...');
        setWebApp(tg);
        setUser(tg.initDataUnsafe?.user || null);

        try {
          tg.ready();
          tg.expand();
          tg.isClosingConfirmationEnabled = false;
          if (tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('light');
          }
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
        isTelegramInitialized = true;
        setIsReady(true);
      };

      const parseTgWebAppData = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const tgWebAppData = urlParams.get('tgWebAppData') || hashParams.get('tgWebAppData');

        if (tgWebAppData) {
          console.log('🔄 useTelegram: Parsing Telegram data from URL...');
          try {
            const decodedData = decodeURIComponent(tgWebAppData);
            const userMatch = decodedData.match(/user=([^&]+)/);
            if (userMatch) {
              const userData = JSON.parse(decodeURIComponent(userMatch[1]));
              console.log('✅ useTelegram: Parsed user data:', userData);

              const realUser = {
                id: userData.id,
                first_name: userData.first_name,
                last_name: userData.last_name || '',
                username: userData.username,
                language_code: userData.language_code,
                is_premium: userData.is_premium || false,
                allows_write_to_pm: userData.allows_write_to_pm || true,
                photo_url: userData.photo_url
              };

              const mockWebApp: TelegramWebApp = {
                initData: tgWebAppData,
                initDataUnsafe: { user: realUser },
                version: '6.0',
                platform: 'web',
                colorScheme: 'light',
                themeParams: {
                  bg_color: '#ffffff',
                  text_color: '#000000',
                  hint_color: '#707579',
                  link_color: '#00488f',
                  button_color: '#3390ec',
                  button_text_color: '#ffffff',
                  secondary_bg_color: '#f4f4f5'
                },
                ready: () => { console.log('Mock WebApp: ready()'); },
                expand: () => { console.log('Mock WebApp: expand()'); },
                close: () => { console.log('Mock WebApp: close()'); },
                isClosingConfirmationEnabled: false,
                MainButton: {
                  text: '', color: '#3390ec', textColor: '#ffffff', isVisible: false, isActive: true, isProgressVisible: false,
                  setText: (text: string) => { console.log('Mock MainButton: setText', text); },
                  onClick: () => { console.log('Mock MainButton: onClick'); }, offClick: () => { console.log('Mock MainButton: offClick'); },
                  show: () => { console.log('Mock MainButton: show'); }, hide: () => { console.log('Mock MainButton: hide'); },
                  enable: () => { console.log('Mock MainButton: enable'); }, disable: () => { console.log('Mock MainButton: disable'); },
                  showProgress: () => { console.log('Mock MainButton: showProgress'); }, hideProgress: () => { console.log('Mock MainButton: hideProgress'); },
                  setParams: (params: any) => { console.log('Mock MainButton: setParams', params); },
                },
                BackButton: {
                  isVisible: false,
                  onClick: () => { console.log('Mock BackButton: onClick'); }, offClick: () => { console.log('Mock BackButton: offClick'); },
                  show: () => { console.log('Mock BackButton: show'); }, hide: () => { console.log('Mock BackButton: hide'); },
                },
                HapticFeedback: {
                  impactOccurred: () => { console.log('Mock HapticFeedback: impactOccurred'); },
                  notificationOccurred: () => { console.log('Mock HapticFeedback: notificationOccurred'); },
                  selectionChanged: () => { console.log('Mock HapticFeedback: selectionChanged'); },
                },
                sendData: (data: string) => { console.log('Mock WebApp: sendData', data); },
                openLink: (url: string) => { console.log('Mock WebApp: openLink', url); },
                openTelegramLink: (url: string) => { console.log('Mock WebApp: openTelegramLink', url); },
                showPopup: (params: any) => { console.log('Mock WebApp: showPopup', params); },
                showAlert: (message: string) => { console.log('Mock WebApp: showAlert', message); },
                showConfirm: (message: string) => { console.log('Mock WebApp: showConfirm', message); },
                showScanQrPopup: (params: any) => { console.log('Mock WebApp: showScanQrPopup', params); },
                closeScanQrPopup: () => { console.log('Mock WebApp: closeScanQrPopup'); },
                readTextFromClipboard: (callback?: (text: string) => void) => { console.log('Mock WebApp: readTextFromClipboard'); },
                requestWriteAccess: (callback?: (granted: boolean) => void) => { console.log('Mock WebApp: requestWriteAccess'); },
                requestContact: (callback?: (granted: boolean) => void) => { console.log('Mock WebApp: requestContact'); },
                requestLocation: (callback?: (granted: boolean) => void) => { console.log('Mock WebApp: requestLocation'); },
                invokeCustomMethod: (method: string, params?: object, callback?: (data: object) => void) => { console.log('Mock WebApp: invokeCustomMethod', method); },
              };

              setWebApp(mockWebApp);
              setUser(realUser);
              console.log('✅ useTelegram: Реальные данные пользователя загружены из URL');
              console.log('✅ useTelegram: User:', realUser);
              isTelegramInitialized = true;
              setIsReady(true);
              return true; // Данные успешно распарсены
            }
          } catch (error) {
            console.error('❌ useTelegram: Error parsing Telegram data from URL:', error);
          }
        }
        return false; // Данные не найдены или не распарсены
      };

      const createMockWebApp = () => {
        console.log('ℹ️ useTelegram: Creating mock user for browser mode');
        const mockUser = {
          id: 123456789,
          first_name: 'Демо',
          last_name: 'Пользователь',
          username: 'demo_user',
          language_code: 'ru',
          is_premium: false,
          allows_write_to_pm: true
        };

        const mockWebApp: TelegramWebApp = {
          initData: '',
          initDataUnsafe: { user: mockUser },
          version: '6.0',
          platform: 'unknown',
          colorScheme: 'light',
          themeParams: {
            bg_color: '#ffffff', text_color: '#000000', hint_color: '#707579', link_color: '#00488f',
            button_color: '#3390ec', button_text_color: '#ffffff', secondary_bg_color: '#f4f4f5'
          },
          ready: () => {}, expand: () => {}, close: () => {}, isClosingConfirmationEnabled: false,
          MainButton: {
            text: '', color: '', textColor: '', isVisible: false, isActive: false, isProgressVisible: false,
            setText: () => {}, onClick: () => {}, show: () => {}, hide: () => {}, enable: () => {},
            disable: () => {}, showProgress: () => {}, hideProgress: () => {}, setParams: () => {}
          },
          BackButton: { isVisible: false, onClick: () => {}, show: () => {}, hide: () => {} },
          HapticFeedback: { impactOccurred: () => {}, notificationOccurred: () => {}, selectionChanged: () => {} },
          sendData: () => {}, openLink: () => {}, openTelegramLink: () => {}, showPopup: () => {},
          showAlert: () => {}, showConfirm: () => {}, showScanQrPopup: () => {}, closeScanQrPopup: () => {},
          readTextFromClipboard: () => {}, requestWriteAccess: () => {}, requestContact: () => {},
          requestLocation: () => {}, invokeCustomMethod: () => {}
        };

        setWebApp(mockWebApp);
        setUser(mockUser);
        console.log('✅ useTelegram: Браузерный режим активирован');
        console.log('✅ useTelegram: Mock user set:', mockUser);
        setIsReady(true);
      };

      const checkAndInitialize = () => {
        const tg = window.Telegram?.WebApp;
        console.log('🔄 useTelegram: window.Telegram exists:', !!window.Telegram);
        console.log('🔄 useTelegram: window.Telegram.WebApp exists:', !!window.Telegram?.WebApp);
        console.log('🔄 useTelegram: Telegram WebApp found:', !!tg);

        if (tg) {
          initWebApp(tg);
        } else {
          // Если API не загрузился, пытаемся распарсить из URL
          const parsedFromUrl = parseTgWebAppData();
          if (!parsedFromUrl) {
            // Если и из URL не удалось, создаем полностью моковый WebApp
            createMockWebApp();
          }
        }
      };

      // Запускаем проверку после небольшой задержки, чтобы дать Telegram API время загрузиться
      // Увеличиваем задержку, чтобы дать больше времени для загрузки скрипта Telegram
      const timeoutId = setTimeout(checkAndInitialize, 500); // 500ms задержка

      return () => clearTimeout(timeoutId);
    } else {
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

  const showAlert = useCallback((message: string, callback?: () => void) => {
    if (webApp) {
      webApp.showAlert(message, callback);
    } else {
      alert(message);
      callback?.();
    }
  }, [webApp]);

  const showConfirm = useCallback((message: string, callback?: (confirmed: boolean) => void) => {
    if (webApp) {
      webApp.showConfirm(message, callback);
    } else {
      const confirmed = confirm(message);
      callback?.(confirmed);
    }
  }, [webApp]);

  const openLink = useCallback((url: string) => {
    if (webApp) {
      webApp.openLink(url);
    } else {
      window.open(url, '_blank');
    }
  }, [webApp]);

  const requestLocation = useCallback(async (): Promise<{ granted: boolean; location?: { latitude: number; longitude: number } }> => {
    if (webApp?.requestLocation) {
      return new Promise((resolve) => {
        webApp.requestLocation((granted) => {
          if (granted) {
            // В реальном WebApp API нет прямого возврата координат из requestLocation
            // Предполагаем, что после granted, можно получить текущую позицию через Expo Location
            // или что приложение уже получит ее через watchPositionAsync
            console.log('Telegram WebApp location access granted. Attempting to get current position...');
            // Здесь можно добавить логику для получения текущей позиции через Expo Location
            // или полагаться на watchPositionAsync, который уже запущен
            resolve({ granted: true });
          } else {
            console.log('Telegram WebApp location access denied.');
            resolve({ granted: false });
          }
        });
      });
    } else {
      console.log('Falling back to Expo Location for location request...');
      const { status } = await require('expo-location').requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await require('expo-location').getCurrentPositionAsync({});
        return {
          granted: true,
          location: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          },
        };
      }
      return { granted: false };
    }
  }, [webApp]);

  return {
    webApp,
    user,
    isReady,
    isTelegramWebApp: !!webApp && webApp.platform !== 'unknown',
    showMainButton,
    hideMainButton,
    showAlert,
    showConfirm,
    openLink,
    requestLocation,
  };
};