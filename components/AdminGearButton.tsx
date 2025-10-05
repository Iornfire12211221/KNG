import React from 'react';
import { TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Settings } from 'lucide-react-native';
import { useApp } from '@/hooks/app-store';
import { router } from 'expo-router';

interface AdminGearButtonProps {
  style?: any;
}

export default function AdminGearButton({ style }: AdminGearButtonProps) {
  // Шестеренка полностью скрыта
  return null;
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
