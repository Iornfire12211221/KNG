/**
 * Хук для управления пользователями и ролями
 */

import { useState, useEffect, useCallback } from 'react';
import { trpc } from '../lib/trpc';

export interface User {
  id: string;
  telegramId: string;
  name: string;
  username?: string;
  photoUrl?: string;
  role: 'USER' | 'MODERATOR' | 'ADMIN' | 'FOUNDER';
  isMuted: boolean;
  isBanned: boolean;
  isKicked: boolean;
  locationPermission: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserStats {
  total: number;
  founders: number;
  admins: number;
  moderators: number;
  users: number;
}

export const useUserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({
    total: 0,
    founders: 0,
    admins: 0,
    moderators: 0,
    users: 0
  });
  const [selectedRole, setSelectedRole] = useState<'USER' | 'MODERATOR' | 'ADMIN' | 'FOUNDER' | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Загрузка пользователей
  const loadUsers = useCallback(async (role?: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await trpc.users.getAll.query({
        role: role as any,
        limit: 50,
        offset: 0
      });
      
      setUsers(result.users);
    } catch (err) {
      setError('Ошибка загрузки пользователей');
      console.error('Error loading users:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Загрузка статистики
  const loadStats = useCallback(async () => {
    try {
      const stats = await trpc.users.getStats.query();
      setUserStats(stats);
    } catch (err) {
      console.error('Error loading user stats:', err);
    }
  }, []);

  // Обновление роли пользователя
  const updateUserRole = useCallback(async (userId: string, newRole: string, updatedBy: string) => {
    try {
      const updatedUser = await trpc.users.updateRole.mutate({
        userId,
        role: newRole as any,
        updatedBy
      });
      
      // Обновляем локальное состояние
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, role: updatedUser.role } : user
      ));
      
      // Обновляем статистику
      await loadStats();
      
      return updatedUser;
    } catch (err) {
      setError('Ошибка обновления роли');
      throw err;
    }
  }, [loadStats]);

  // Назначение модератора
  const promoteToModerator = useCallback(async (userId: string, updatedBy: string) => {
    try {
      const updatedUser = await trpc.users.promoteToModerator.mutate({
        userId,
        updatedBy
      });
      
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, role: 'MODERATOR' } : user
      ));
      
      await loadStats();
      
      return updatedUser;
    } catch (err) {
      setError('Ошибка назначения модератора');
      throw err;
    }
  }, [loadStats]);

  // Снятие с модератора
  const demoteFromModerator = useCallback(async (userId: string, updatedBy: string) => {
    try {
      const updatedUser = await trpc.users.demoteFromModerator.mutate({
        userId,
        updatedBy
      });
      
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, role: 'USER' } : user
      ));
      
      await loadStats();
      
      return updatedUser;
    } catch (err) {
      setError('Ошибка снятия с модератора');
      throw err;
    }
  }, [loadStats]);

  // Получение роли по цвету
  const getRoleColor = useCallback((role: string) => {
    switch (role) {
      case 'FOUNDER':
        return '#FFD700'; // Золотой
      case 'ADMIN':
        return '#FF6B6B'; // Красный
      case 'MODERATOR':
        return '#4ECDC4'; // Бирюзовый
      case 'USER':
        return '#95A5A6'; // Серый
      default:
        return '#95A5A6';
    }
  }, []);

  // Получение иконки роли
  const getRoleIcon = useCallback((role: string) => {
    switch (role) {
      case 'FOUNDER':
        return '👑';
      case 'ADMIN':
        return '🛡️';
      case 'MODERATOR':
        return '👮';
      case 'USER':
        return '👤';
      default:
        return '👤';
    }
  }, []);

  // Получение названия роли
  const getRoleName = useCallback((role: string) => {
    switch (role) {
      case 'FOUNDER':
        return 'Основатель';
      case 'ADMIN':
        return 'Администратор';
      case 'MODERATOR':
        return 'Модератор';
      case 'USER':
        return 'Пользователь';
      default:
        return 'Пользователь';
    }
  }, []);

  // Загрузка данных при монтировании
  useEffect(() => {
    loadUsers(selectedRole);
    loadStats();
  }, [loadUsers, loadStats, selectedRole]);

  return {
    // Состояние
    users,
    userStats,
    selectedRole,
    isLoading,
    error,
    
    // Функции
    loadUsers,
    loadStats,
    updateUserRole,
    promoteToModerator,
    demoteFromModerator,
    setSelectedRole,
    setError,
    
    // Утилиты
    getRoleColor,
    getRoleIcon,
    getRoleName
  };
};
