import { useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';

// Хук для оптимизации производительности в Telegram WebApp
export const usePerformanceOptimization = () => {
  const isTelegramWebApp = useRef(false);
  const isLowEndDevice = useRef(false);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    // Определяем, работаем ли мы в Telegram WebApp
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      isTelegramWebApp.current = !!(window as any).Telegram?.WebApp;
      
      // Определяем, является ли устройство слабым
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobile = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const isOldAndroid = /android [1-4]\./i.test(userAgent);
      const isOldIOS = /iphone os [1-9]_/i.test(userAgent);
      
      isLowEndDevice.current = isMobile && (isOldAndroid || isOldIOS);
    }
  }, []);

  // Оптимизированная функция для debounce
  const debounce = useCallback((func: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(null, args), delay);
    };
  }, []);

  // Оптимизированная функция для throttle
  const throttle = useCallback((func: Function, delay: number) => {
    let lastCall = 0;
    return (...args: any[]) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        func.apply(null, args);
      }
    };
  }, []);

  // Оптимизированная функция для requestAnimationFrame
  const optimizedRequestAnimationFrame = useCallback((callback: () => void) => {
    if (isLowEndDevice.current) {
      // Для слабых устройств используем setTimeout с большей задержкой
      return setTimeout(callback, 16); // ~60fps
    } else {
      return requestAnimationFrame(callback);
    }
  }, []);

  // Оптимизированная функция для отмены анимации
  const cancelAnimationFrame = useCallback((id: number) => {
    if (isLowEndDevice.current) {
      clearTimeout(id);
    } else {
      window.cancelAnimationFrame(id);
    }
  }, []);

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [cancelAnimationFrame]);

  return {
    isTelegramWebApp: isTelegramWebApp.current,
    isLowEndDevice: isLowEndDevice.current,
    debounce,
    throttle,
    optimizedRequestAnimationFrame,
    cancelAnimationFrame,
  };
};

// Хук для оптимизации анимаций
export const useOptimizedAnimation = () => {
  const { isLowEndDevice, optimizedRequestAnimationFrame, cancelAnimationFrame } = usePerformanceOptimization();
  
  const createOptimizedAnimation = useCallback((callback: (progress: number) => void, duration: number = 300) => {
    const startTime = Date.now();
    const endTime = startTime + duration;
    
    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      
      callback(progress);
      
      if (progress < 1) {
        animationFrameRef.current = optimizedRequestAnimationFrame(animate);
      }
    };
    
    animationFrameRef.current = optimizedRequestAnimationFrame(animate);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isLowEndDevice, optimizedRequestAnimationFrame, cancelAnimationFrame]);

  return {
    createOptimizedAnimation,
    isLowEndDevice,
  };
};

// Хук для оптимизации рендеринга списков
export const useOptimizedRendering = () => {
  const { isLowEndDevice, debounce, throttle } = usePerformanceOptimization();
  
  const optimizedRender = useCallback((items: any[], renderItem: (item: any, index: number) => any) => {
    if (isLowEndDevice.current) {
      // Для слабых устройств ограничиваем количество элементов
      const limitedItems = items.slice(0, 50);
      return limitedItems.map(renderItem);
    }
    return items.map(renderItem);
  }, [isLowEndDevice]);

  const debouncedRender = useCallback((items: any[], renderItem: (item: any, index: number) => any) => {
    const debouncedFn = debounce(() => {
      optimizedRender(items, renderItem);
    }, 100);
    
    debouncedFn();
  }, [optimizedRender, debounce]);

  return {
    optimizedRender,
    debouncedRender,
    isLowEndDevice,
  };
};
