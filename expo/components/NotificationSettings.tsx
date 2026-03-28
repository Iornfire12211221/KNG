/**
 * ⚙️ НАСТРОЙКИ УВЕДОМЛЕНИЙ
 * Красивый интерфейс для управления всеми настройками уведомлений
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications, NotificationSettings as NotificationSettingsType } from '../hooks/useNotifications';
import { useGeofencing } from '../hooks/useGeofencing';
import { useRealTimeUpdates } from '../hooks/useRealTimeUpdates';

interface NotificationSettingsProps {
  onClose?: () => void;
}

export function NotificationSettings({ onClose }: NotificationSettingsProps) {
  const { settings: notificationSettings, saveSettings: saveNotificationSettings } = useNotifications();
  const { settings: geofencingSettings, saveSettings: saveGeofencingSettings } = useGeofencing();
  const { settings: websocketSettings, saveSettings: saveWebsocketSettings } = useRealTimeUpdates();

  const [activeSection, setActiveSection] = useState<'general' | 'types' | 'geofencing' | 'websocket'>('general');

  const handleNotificationToggle = useCallback(async (key: keyof NotificationSettingsType, value: any) => {
    await saveNotificationSettings({ [key]: value });
  }, [saveNotificationSettings]);

  const handleGeofencingToggle = useCallback(async (key: keyof typeof geofencingSettings, value: any) => {
    await saveGeofencingSettings({ [key]: value });
  }, [saveGeofencingSettings]);

  const handleWebsocketToggle = useCallback(async (key: keyof typeof websocketSettings, value: any) => {
    await saveWebsocketSettings({ [key]: value });
  }, [saveWebsocketSettings]);

  const handleRadiusChange = useCallback(async (radius: number) => {
    await saveGeofencingSettings({ defaultRadius: radius });
  }, [saveGeofencingSettings]);

  const handleTestNotification = useCallback(async () => {
    Alert.alert(
      'Тестовое уведомление',
      'Отправить тестовое уведомление?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Отправить',
          onPress: async () => {
            // Здесь можно добавить логику отправки тестового уведомления
            Alert.alert('✅ Успех', 'Тестовое уведомление отправлено!');
          },
        },
      ]
    );
  }, []);

  const renderGeneralSettings = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Общие настройки</Text>
      
      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Уведомления включены</Text>
          <Text style={styles.settingDescription}>
            Разрешить получение уведомлений
          </Text>
        </View>
        <Switch
          value={notificationSettings.enabled}
          onValueChange={(value) => handleNotificationToggle('enabled', value)}
          trackColor={{ false: '#E5E5E5', true: '#3390EC' }}
          thumbColor={notificationSettings.enabled ? '#FFFFFF' : '#FFFFFF'}
        />
      </View>

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Звук</Text>
          <Text style={styles.settingDescription}>
            Воспроизводить звук при получении уведомлений
          </Text>
        </View>
        <Switch
          value={notificationSettings.sound}
          onValueChange={(value) => handleNotificationToggle('sound', value)}
          trackColor={{ false: '#E5E5E5', true: '#3390EC' }}
          thumbColor={notificationSettings.sound ? '#FFFFFF' : '#FFFFFF'}
        />
      </View>

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Вибрация</Text>
          <Text style={styles.settingDescription}>
            Вибрация при получении уведомлений
          </Text>
        </View>
        <Switch
          value={notificationSettings.vibration}
          onValueChange={(value) => handleNotificationToggle('vibration', value)}
          trackColor={{ false: '#E5E5E5', true: '#3390EC' }}
          thumbColor={notificationSettings.vibration ? '#FFFFFF' : '#FFFFFF'}
        />
      </View>

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Тихие часы</Text>
          <Text style={styles.settingDescription}>
            Не беспокоить в указанное время
          </Text>
        </View>
        <Switch
          value={notificationSettings.quietHours.enabled}
          onValueChange={(value) => handleNotificationToggle('quietHours', { 
            ...notificationSettings.quietHours, 
            enabled: value 
          })}
          trackColor={{ false: '#E5E5E5', true: '#3390EC' }}
          thumbColor={notificationSettings.quietHours.enabled ? '#FFFFFF' : '#FFFFFF'}
        />
      </View>

      {notificationSettings.quietHours.enabled && (
        <View style={styles.quietHoursContainer}>
          <Text style={styles.quietHoursText}>
            С {notificationSettings.quietHours.start} до {notificationSettings.quietHours.end}
          </Text>
        </View>
      )}

      <TouchableOpacity style={styles.testButton} onPress={handleTestNotification}>
        <Ionicons name="notifications" size={20} color="#3390EC" />
        <Text style={styles.testButtonText}>Отправить тестовое уведомление</Text>
      </TouchableOpacity>
    </View>
  );

  const renderTypesSettings = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Типы уведомлений</Text>
      
      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Новые посты</Text>
          <Text style={styles.settingDescription}>
            Уведомления о новых постах ДПС
          </Text>
        </View>
        <Switch
          value={notificationSettings.types.newPost}
          onValueChange={(value) => handleNotificationToggle('types', { 
            ...notificationSettings.types, 
            newPost: value 
          })}
          trackColor={{ false: '#E5E5E5', true: '#3390EC' }}
          thumbColor={notificationSettings.types.newPost ? '#FFFFFF' : '#FFFFFF'}
        />
      </View>

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Одобренные посты</Text>
          <Text style={styles.settingDescription}>
            Уведомления об одобрении ваших постов
          </Text>
        </View>
        <Switch
          value={notificationSettings.types.postApproved}
          onValueChange={(value) => handleNotificationToggle('types', { 
            ...notificationSettings.types, 
            postApproved: value 
          })}
          trackColor={{ false: '#E5E5E5', true: '#3390EC' }}
          thumbColor={notificationSettings.types.postApproved ? '#FFFFFF' : '#FFFFFF'}
        />
      </View>

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Отклоненные посты</Text>
          <Text style={styles.settingDescription}>
            Уведомления об отклонении ваших постов
          </Text>
        </View>
        <Switch
          value={notificationSettings.types.postRejected}
          onValueChange={(value) => handleNotificationToggle('types', { 
            ...notificationSettings.types, 
            postRejected: value 
          })}
          trackColor={{ false: '#E5E5E5', true: '#3390EC' }}
          thumbColor={notificationSettings.types.postRejected ? '#FFFFFF' : '#FFFFFF'}
        />
      </View>

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Упоминания</Text>
          <Text style={styles.settingDescription}>
            Уведомления когда вас упоминают
          </Text>
        </View>
        <Switch
          value={notificationSettings.types.userMentioned}
          onValueChange={(value) => handleNotificationToggle('types', { 
            ...notificationSettings.types, 
            userMentioned: value 
          })}
          trackColor={{ false: '#E5E5E5', true: '#3390EC' }}
          thumbColor={notificationSettings.types.userMentioned ? '#FFFFFF' : '#FFFFFF'}
        />
      </View>

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Системные</Text>
          <Text style={styles.settingDescription}>
            Системные уведомления и обновления
          </Text>
        </View>
        <Switch
          value={notificationSettings.types.system}
          onValueChange={(value) => handleNotificationToggle('types', { 
            ...notificationSettings.types, 
            system: value 
          })}
          trackColor={{ false: '#E5E5E5', true: '#3390EC' }}
          thumbColor={notificationSettings.types.system ? '#FFFFFF' : '#FFFFFF'}
        />
      </View>

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Геofencing</Text>
          <Text style={styles.settingDescription}>
            Уведомления при приближении к постам
          </Text>
        </View>
        <Switch
          value={notificationSettings.types.geofence}
          onValueChange={(value) => handleNotificationToggle('types', { 
            ...notificationSettings.types, 
            geofence: value 
          })}
          trackColor={{ false: '#E5E5E5', true: '#3390EC' }}
          thumbColor={notificationSettings.types.geofence ? '#FFFFFF' : '#FFFFFF'}
        />
      </View>
    </View>
  );

  const renderGeofencingSettings = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Геofencing</Text>
      
      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Геofencing включен</Text>
          <Text style={styles.settingDescription}>
            Отслеживание местоположения для уведомлений
          </Text>
        </View>
        <Switch
          value={geofencingSettings.enabled}
          onValueChange={(value) => handleGeofencingToggle('enabled', value)}
          trackColor={{ false: '#E5E5E5', true: '#3390EC' }}
          thumbColor={geofencingSettings.enabled ? '#FFFFFF' : '#FFFFFF'}
        />
      </View>

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Радиус уведомлений</Text>
          <Text style={styles.settingDescription}>
            {Math.round(geofencingSettings.defaultRadius / 1000)} км
          </Text>
        </View>
        <View style={styles.radiusContainer}>
          <TouchableOpacity
            style={styles.radiusButton}
            onPress={() => handleRadiusChange(Math.max(500, geofencingSettings.defaultRadius - 500))}
          >
            <Ionicons name="remove" size={16} color="#3390EC" />
          </TouchableOpacity>
          <Text style={styles.radiusText}>
            {Math.round(geofencingSettings.defaultRadius / 1000)} км
          </Text>
          <TouchableOpacity
            style={styles.radiusButton}
            onPress={() => handleRadiusChange(Math.min(10000, geofencingSettings.defaultRadius + 500))}
          >
            <Ionicons name="add" size={16} color="#3390EC" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Высокая точность</Text>
          <Text style={styles.settingDescription}>
            Более точное отслеживание местоположения
          </Text>
        </View>
        <Switch
          value={geofencingSettings.highAccuracy}
          onValueChange={(value) => handleGeofencingToggle('highAccuracy', value)}
          trackColor={{ false: '#E5E5E5', true: '#3390EC' }}
          thumbColor={geofencingSettings.highAccuracy ? '#FFFFFF' : '#FFFFFF'}
        />
      </View>

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Фоновое отслеживание</Text>
          <Text style={styles.settingDescription}>
            Отслеживание в фоновом режиме
          </Text>
        </View>
        <Switch
          value={geofencingSettings.backgroundTracking}
          onValueChange={(value) => handleGeofencingToggle('backgroundTracking', value)}
          trackColor={{ false: '#E5E5E5', true: '#3390EC' }}
          thumbColor={geofencingSettings.backgroundTracking ? '#FFFFFF' : '#FFFFFF'}
        />
      </View>
    </View>
  );

  const renderWebsocketSettings = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Real-time соединение</Text>
      
      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>WebSocket включен</Text>
          <Text style={styles.settingDescription}>
            Мгновенные обновления через WebSocket
          </Text>
        </View>
        <Switch
          value={websocketSettings.enabled}
          onValueChange={(value) => handleWebsocketToggle('enabled', value)}
          trackColor={{ false: '#E5E5E5', true: '#3390EC' }}
          thumbColor={websocketSettings.enabled ? '#FFFFFF' : '#FFFFFF'}
        />
      </View>

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Автопереподключение</Text>
          <Text style={styles.settingDescription}>
            Автоматическое переподключение при обрыве
          </Text>
        </View>
        <Switch
          value={websocketSettings.autoReconnect}
          onValueChange={(value) => handleWebsocketToggle('autoReconnect', value)}
          trackColor={{ false: '#E5E5E5', true: '#3390EC' }}
          thumbColor={websocketSettings.autoReconnect ? '#FFFFFF' : '#FFFFFF'}
        />
      </View>

      <View style={styles.connectionInfo}>
        <Text style={styles.connectionInfoTitle}>Информация о соединении</Text>
        <Text style={styles.connectionInfoText}>
          URL: {websocketSettings.url}
        </Text>
        <Text style={styles.connectionInfoText}>
          Максимум попыток: {websocketSettings.maxReconnectAttempts}
        </Text>
        <Text style={styles.connectionInfoText}>
          Задержка переподключения: {websocketSettings.reconnectDelay}мс
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Навигация по разделам */}
      <View style={styles.navigation}>
        <TouchableOpacity
          style={[styles.navButton, activeSection === 'general' && styles.activeNavButton]}
          onPress={() => setActiveSection('general')}
        >
          <Ionicons 
            name="settings" 
            size={16} 
            color={activeSection === 'general' ? '#FFFFFF' : '#8E8E93'} 
          />
          <Text style={[styles.navButtonText, activeSection === 'general' && styles.activeNavButtonText]}>
            Общие
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.navButton, activeSection === 'types' && styles.activeNavButton]}
          onPress={() => setActiveSection('types')}
        >
          <Ionicons 
            name="notifications" 
            size={16} 
            color={activeSection === 'types' ? '#FFFFFF' : '#8E8E93'} 
          />
          <Text style={[styles.navButtonText, activeSection === 'types' && styles.activeNavButtonText]}>
            Типы
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.navButton, activeSection === 'geofencing' && styles.activeNavButton]}
          onPress={() => setActiveSection('geofencing')}
        >
          <Ionicons 
            name="location" 
            size={16} 
            color={activeSection === 'geofencing' ? '#FFFFFF' : '#8E8E93'} 
          />
          <Text style={[styles.navButtonText, activeSection === 'geofencing' && styles.activeNavButtonText]}>
            Гео
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.navButton, activeSection === 'websocket' && styles.activeNavButton]}
          onPress={() => setActiveSection('websocket')}
        >
          <Ionicons 
            name="wifi" 
            size={16} 
            color={activeSection === 'websocket' ? '#FFFFFF' : '#8E8E93'} 
          />
          <Text style={[styles.navButtonText, activeSection === 'websocket' && styles.activeNavButtonText]}>
            Сеть
          </Text>
        </TouchableOpacity>
      </View>

      {/* Контент */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeSection === 'general' && renderGeneralSettings()}
        {activeSection === 'types' && renderTypesSettings()}
        {activeSection === 'geofencing' && renderGeofencingSettings()}
        {activeSection === 'websocket' && renderWebsocketSettings()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  navigation: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  activeNavButton: {
    backgroundColor: '#3390EC',
  },
  navButtonText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  activeNavButtonText: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 18,
  },
  quietHoursContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  quietHoursText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  testButtonText: {
    fontSize: 14,
    color: '#3390EC',
    fontWeight: '500',
  },
  radiusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radiusButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radiusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    minWidth: 60,
    textAlign: 'center',
  },
  connectionInfo: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  connectionInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  connectionInfoText: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
});
