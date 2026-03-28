import React from 'react';
import { Platform, StyleSheet, View, ViewProps } from 'react-native';
import { BlurView } from 'expo-blur';

interface GlassViewProps extends ViewProps {
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  borderRadius?: number;
}

export default function GlassView({
  style,
  children,
  intensity = 40,
  tint = 'light',
  borderRadius = 16,
  ...rest
}: GlassViewProps) {
  if (Platform.OS === 'web') {
    return (
      <View
        {...rest}
        style={[
          styles.webGlass,
          { borderRadius, backgroundColor: 'rgba(255,255,255,0.35)' },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <BlurView
      {...rest}
      intensity={intensity}
      tint={tint}
      style={[styles.nativeGlass, { borderRadius }, style]}
    >
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  nativeGlass: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  webGlass: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.2)',
  } as any,
});