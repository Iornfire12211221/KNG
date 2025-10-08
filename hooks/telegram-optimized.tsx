import { useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';

// Упрощенный интерфейс Telegram WebApp
interface TelegramWebApp {
  initDataUnsafe: {
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      photo_url?: string;
    };
  };
  themeParams: {
    bg_color?: string;
    text_color?: string;
    button_color?: string;
  };
  ready: () => void;
  expand: () => void;
  HapticFeedback?: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy') => void;
  };
}

// Оптимизированный хук для Telegram
export const useTelegram = () => {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);

  // Инициализация Telegram WebApp
  useEffect(() => {
    if (Platform.OS !== 'web') {
      setIsReady(true);
      return;
    }

    const initTelegram = () => {
      if (window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        
        // Применяем тему
        if (tg.themeParams) {
          const root = document.documentElement;
          Object.entries(tg.themeParams).forEach(([key, value]) => {
            const cssVar = `--tg-theme-${key.replace(/_/g, '-')}`;
            root.style.setProperty(cssVar, value as string);
          });
        }
        
        // Готовим WebApp
        tg.ready();
        tg.expand();
        
        setWebApp(tg);
        setUser(tg.initDataUnsafe?.user || null);
        setIsReady(true);
        
        console.log('✅ Telegram WebApp инициализирован');
      } else {
        console.log('⚠️ Telegram WebApp не найден');
        setIsReady(true);
      }
    };

    // Проверяем доступность
    if (window.Telegram?.WebApp) {
      initTelegram();
    } else {
      // Ждем загрузки скрипта
      const checkInterval = setInterval(() => {
        if (window.Telegram?.WebApp) {
          clearInterval(checkInterval);
          initTelegram();
        }
      }, 100);
      
      // Таймаут на случай если скрипт не загрузится
      setTimeout(() => {
        clearInterval(checkInterval);
        setIsReady(true);
      }, 5000);
    }
  }, []);

  // Тактильная обратная связь
  const hapticFeedback = useCallback((style: 'light' | 'medium' | 'heavy' = 'light') => {
    if (webApp?.HapticFeedback) {
      webApp.HapticFeedback.impactOccurred(style);
    }
  }, [webApp]);

  // Отправка данных в Telegram
  const sendData = useCallback((data: any) => {
    if (webApp) {
      webApp.sendData(JSON.stringify(data));
    }
  }, [webApp]);

  return {
    webApp,
    user,
    isReady,
    hapticFeedback,
    sendData,
    isTelegram: !!webApp,
  };
};
