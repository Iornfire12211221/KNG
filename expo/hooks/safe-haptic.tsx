/**
 * Безопасная обёртка для hapticFeedback
 * Предотвращает ошибки если Telegram WebApp недоступен
 */

export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning';

export const safeHapticFeedback = (hapticFeedback: ((type: HapticType) => void) | undefined, type: HapticType) => {
  if (!hapticFeedback) {
    return;
  }
  
  try {
    hapticFeedback(type);
  } catch (error) {
    console.log('Haptic feedback not available:', error);
  }
};

