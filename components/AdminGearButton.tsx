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

  // Показываем кнопку только админам, модераторам и основателям
  if (!currentUser || (!currentUser.isAdmin && !currentUser.isModerator)) {
    return null;
  }

  const handlePress = () => {
    router.push('/admin');
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
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.2)',
  },
});
