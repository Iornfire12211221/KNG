/**
 * Хук для управления пользователями и ролями - КЛИЕНТСКАЯ ВЕРСИЯ
 * Без TRPC для использования в браузере
 */

import { useState, useEffect, useCallback } from 'react';

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
  const [stats, setStats] = useState<UserStats>({
    total: 0,
    founders: 0,
    admins: 0,
    moderators: 0,
    users: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Клиентская версия - возвращает моковые данные
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('👥 UserManagement (клиентская версия): Загрузка пользователей');
      
      // Моковые данные для демонстрации
      const mockUsers: User[] = [
        {
          id: '1',
          telegramId: '6014412239',
          name: 'Основатель',
          username: 'herlabsn',
          role: 'FOUNDER',
          isMuted: false,
          isBanned: false,
          isKicked: false,
          locationPermission: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: '2',
          telegramId: '123456789',
          name: 'Админ',
          username: 'admin',
          role: 'ADMIN',
          isMuted: false,
          isBanned: false,
          isKicked: false,
          locationPermission: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      setUsers(mockUsers);
      
      // Обновляем статистику
      const newStats: UserStats = {
        total: mockUsers.length,
        founders: mockUsers.filter(u => u.role === 'FOUNDER').length,
        admins: mockUsers.filter(u => u.role === 'ADMIN').length,
        moderators: mockUsers.filter(u => u.role === 'MODERATOR').length,
        users: mockUsers.filter(u => u.role === 'USER').length
      };
      
      setStats(newStats);
      
    } catch (err) {
      console.error('👥 UserManagement (клиентская версия): Ошибка загрузки пользователей:', err);
      setError('Ошибка загрузки пользователей');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateUserRole = useCallback(async (userId: string, newRole: 'USER' | 'MODERATOR' | 'ADMIN' | 'FOUNDER') => {
    try {
      console.log(`👥 UserManagement (клиентская версия): Обновление роли пользователя ${userId} на ${newRole}`);
      
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId ? { ...user, role: newRole, updatedAt: new Date().toISOString() } : user
        )
      );
      
      // Обновляем статистику
      const updatedUsers = users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      );
      
      const newStats: UserStats = {
        total: updatedUsers.length,
        founders: updatedUsers.filter(u => u.role === 'FOUNDER').length,
        admins: updatedUsers.filter(u => u.role === 'ADMIN').length,
        moderators: updatedUsers.filter(u => u.role === 'MODERATOR').length,
        users: updatedUsers.filter(u => u.role === 'USER').length
      };
      
      setStats(newStats);
      
      return { success: true };
    } catch (err) {
      console.error('👥 UserManagement (клиентская версия): Ошибка обновления роли:', err);
      return { success: false, error: 'Ошибка обновления роли' };
    }
  }, [users]);

  const promoteToModerator = useCallback(async (userId: string) => {
    return updateUserRole(userId, 'MODERATOR');
  }, [updateUserRole]);

  const demoteFromModerator = useCallback(async (userId: string) => {
    return updateUserRole(userId, 'USER');
  }, [updateUserRole]);

  const toggleUserMute = useCallback(async (userId: string) => {
    try {
      console.log(`👥 UserManagement (клиентская версия): Переключение мута пользователя ${userId}`);
      
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId ? { ...user, isMuted: !user.isMuted, updatedAt: new Date().toISOString() } : user
        )
      );
      
      return { success: true };
    } catch (err) {
      console.error('👥 UserManagement (клиентская версия): Ошибка переключения мута:', err);
      return { success: false, error: 'Ошибка переключения мута' };
    }
  }, []);

  const banUser = useCallback(async (userId: string) => {
    try {
      console.log(`👥 UserManagement (клиентская версия): Бан пользователя ${userId}`);
      
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId ? { ...user, isBanned: true, updatedAt: new Date().toISOString() } : user
        )
      );
      
      return { success: true };
    } catch (err) {
      console.error('👥 UserManagement (клиентская версия): Ошибка бана пользователя:', err);
      return { success: false, error: 'Ошибка бана пользователя' };
    }
  }, []);

  const unbanUser = useCallback(async (userId: string) => {
    try {
      console.log(`👥 UserManagement (клиентская версия): Разбан пользователя ${userId}`);
      
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId ? { ...user, isBanned: false, updatedAt: new Date().toISOString() } : user
        )
      );
      
      return { success: true };
    } catch (err) {
      console.error('👥 UserManagement (клиентская версия): Ошибка разбана пользователя:', err);
      return { success: false, error: 'Ошибка разбана пользователя' };
    }
  }, []);

  // Загружаем пользователей при монтировании
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users,
    stats,
    isLoading,
    error,
    fetchUsers,
    updateUserRole,
    promoteToModerator,
    demoteFromModerator,
    toggleUserMute,
    banUser,
    unbanUser
  };
};
