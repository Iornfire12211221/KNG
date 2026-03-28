import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MapPin, AlertCircle, CheckCircle2 } from 'lucide-react-native';

interface LocationStatusProps {
  isLocationEnabled: boolean;
  isLocationLoading: boolean;
  locationError?: string;
  onRetry?: () => void;
}

export default function LocationStatus({ 
  isLocationEnabled, 
  isLocationLoading, 
  locationError, 
  onRetry 
}: LocationStatusProps) {
  if (isLocationLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.statusItem}>
          <MapPin size={16} color="#007AFF" />
          <Text style={styles.statusText}>Определяем местоположение...</Text>
        </View>
      </View>
    );
  }

  if (locationError) {
    return (
      <View style={styles.container}>
        <View style={[styles.statusItem, styles.errorItem]}>
          <AlertCircle size={16} color="#FF3B30" />
          <Text style={[styles.statusText, styles.errorText]}>
            {locationError}
          </Text>
          {onRetry && (
            <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
              <Text style={styles.retryText}>Повторить</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  if (isLocationEnabled) {
    return (
      <View style={styles.container}>
        <View style={[styles.statusItem, styles.successItem]}>
          <CheckCircle2 size={16} color="#34C759" />
          <Text style={[styles.statusText, styles.successText]}>
            Местоположение определено
          </Text>
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    gap: 8,
  },
  successItem: {
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.3)',
  },
  errorItem: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  statusText: {
    fontSize: 14,
    color: '#000000',
    flex: 1,
  },
  successText: {
    color: '#1D8348',
  },
  errorText: {
    color: '#D70015',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});




