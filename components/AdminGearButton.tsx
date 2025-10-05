import React from 'react';
import { TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Settings } from 'lucide-react-native';
import { useApp } from '@/hooks/app-store';
import { router } from 'expo-router';

interface AdminGearButtonProps {
  style?: any;
}

export default function AdminGearButton({ style }: AdminGearButtonProps) {
  const { currentUser } = useApp();

  // Отладочная информация
  console.log('🔧 AdminGearButton - currentUser:', currentUser);
  console.log('🔧 AdminGearButton - isAdmin:', currentUser?.isAdmin);
  console.log('🔧 AdminGearButton - isModerator:', currentUser?.isModerator);
  console.log('🔧 AdminGearButton - role:', currentUser?.role);

  // Показываем кнопку только админам, модераторам и основателям
  if (!currentUser || (!currentUser.isAdmin && !currentUser.isModerator && currentUser.role !== 'FOUNDER')) {
    console.log('🔧 AdminGearButton - кнопка скрыта, пользователь не имеет прав');
    return null;
  }

  console.log('🔧 AdminGearButton - кнопка показана!');

  const handlePress = () => {
    try {
      console.log('🔧 AdminGearButton - нажатие на кнопку админа');
      router.push('/admin');
    } catch (error) {
      console.error('🔧 AdminGearButton - ошибка при нажатии:', error);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel="Открыть админ панель"
      testID="admin-gear-button"
    >
      <Settings size={20} color="#007AFF" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 50 : 60, // Учитываем высоту статус-бара
    left: 16,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
});
