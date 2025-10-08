import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DPSPost, User, ChatMessage } from '@/types';

// Упрощенное состояние приложения
interface AppState {
  // Основные данные
  posts: DPSPost[];
  users: User[];
  messages: ChatMessage[];
  currentUser: User | null;
  
  // UI состояние
  isLoading: boolean;
  selectedPost: DPSPost | null;
  showComments: boolean;
  
  // Действия
  setPosts: (posts: DPSPost[]) => void;
  addPost: (post: DPSPost) => void;
  updatePost: (id: string, updates: Partial<DPSPost>) => void;
  removePost: (id: string) => void;
  
  setUsers: (users: User[]) => void;
  setCurrentUser: (user: User | null) => void;
  
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  
  setLoading: (loading: boolean) => void;
  setSelectedPost: (post: DPSPost | null) => void;
  setShowComments: (show: boolean) => void;
  
  // Утилиты
  getPostById: (id: string) => DPSPost | undefined;
  getPostsByType: (type: string) => DPSPost[];
  getActivePosts: () => DPSPost[];
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Начальное состояние
      posts: [],
      users: [],
      messages: [],
      currentUser: null,
      isLoading: true,
      selectedPost: null,
      showComments: false,
      
      // Действия с постами
      setPosts: (posts) => set({ posts }),
      addPost: (post) => set((state) => ({ posts: [post, ...state.posts] })),
      updatePost: (id, updates) => set((state) => ({
        posts: state.posts.map(post => 
          post.id === id ? { ...post, ...updates } : post
        )
      })),
      removePost: (id) => set((state) => ({
        posts: state.posts.filter(post => post.id !== id)
      })),
      
      // Действия с пользователями
      setUsers: (users) => set({ users }),
      setCurrentUser: (user) => set({ currentUser: user }),
      
      // Действия с сообщениями
      setMessages: (messages) => set({ messages }),
      addMessage: (message) => set((state) => ({ 
        messages: [...state.messages, message] 
      })),
      
      // UI действия
      setLoading: (isLoading) => set({ isLoading }),
      setSelectedPost: (selectedPost) => set({ selectedPost }),
      setShowComments: (showComments) => set({ showComments }),
      
      // Утилиты
      getPostById: (id) => get().posts.find(post => post.id === id),
      getPostsByType: (type) => get().posts.filter(post => post.type === type),
      getActivePosts: () => {
        const now = Date.now();
        return get().posts.filter(post => post.expiresAt > now);
      },
    }),
    {
      name: 'telegram-dps-storage',
      storage: {
        getItem: async (name) => {
          const value = await AsyncStorage.getItem(name);
          return value ? JSON.parse(value) : null;
        },
        setItem: async (name, value) => {
          await AsyncStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: async (name) => {
          await AsyncStorage.removeItem(name);
        },
      },
      // Сохраняем только важные данные
      partialize: (state) => ({
        posts: state.posts,
        users: state.users,
        currentUser: state.currentUser,
      }),
    }
  )
);

// Селекторы для оптимизации
export const usePosts = () => useAppStore(state => state.posts);
export const useCurrentUser = () => useAppStore(state => state.currentUser);
export const useIsLoading = () => useAppStore(state => state.isLoading);
export const useSelectedPost = () => useAppStore(state => state.selectedPost);
