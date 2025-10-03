import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { X, Send, User } from 'lucide-react-native';
import { trpc } from '@/lib/trpc';
import { useApp } from '@/hooks/app-store';
import { useTelegram } from '@/hooks/telegram';

interface Comment {
  id: string;
  content: string;
  postId: string;
  userId: string;
  userName: string;
  userPhotoUrl?: string;
  timestamp: number;
}

interface CommentsModalProps {
  visible: boolean;
  onClose: () => void;
  postId: string;
  postTitle: string;
}

export default function CommentsModal({ visible, onClose, postId, postTitle }: CommentsModalProps) {
  const { currentUser } = useApp();
  const { telegramUser } = useTelegram();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Загружаем комментарии
  useEffect(() => {
    if (visible && postId) {
      loadComments();
    }
  }, [visible, postId]);

  const loadComments = async () => {
    try {
      // Пробуем через tRPC
      if (trpc?.comments?.getByPostId) {
        const commentsData = await trpc.comments.getByPostId.query({ postId });
        setComments(commentsData);
      } else {
        // Fallback через прямой fetch
        const response = await fetch(`${process.env.EXPO_PUBLIC_RORK_API_BASE_URL || ''}/api/trpc/comments.getByPostId?input=${encodeURIComponent(JSON.stringify({ json: { postId } }))}`);
        if (response.ok) {
          const data = await response.json();
          setComments(data.result?.data?.json || []);
        }
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const handleSendComment = async () => {
    if (!newComment.trim() || !currentUser) return;

    setIsLoading(true);
    try {
      const commentData = {
        content: newComment.trim(),
        postId,
        userId: currentUser.id,
        userName: telegramUser?.first_name || currentUser.name,
        userPhotoUrl: telegramUser?.photo_url,
        timestamp: Date.now(),
      };

      // Пробуем через tRPC
      if (trpc?.comments?.create) {
        await trpc.comments.create.mutate(commentData);
      } else {
        // Fallback через прямой fetch
        const response = await fetch(`${process.env.EXPO_PUBLIC_RORK_API_BASE_URL || ''}/api/trpc/comments.create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ json: commentData }),
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }
      
      setNewComment('');
      loadComments(); // Перезагружаем комментарии
    } catch (error) {
      console.error('Error sending comment:', error);
      Alert.alert('Ошибка', 'Не удалось отправить комментарий');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60 * 1000) return 'только что';
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))} мин. назад`;
    if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))} ч. назад`;
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Комментарии</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color="#1C1C1E" strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle} numberOfLines={2}>{postTitle}</Text>
        </View>

        {/* Comments List */}
        <ScrollView style={styles.commentsList} showsVerticalScrollIndicator={false}>
          {comments.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Send size={32} color="#E1E5E9" strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyText}>Пока нет комментариев</Text>
              <Text style={styles.emptySubtext}>Будьте первым, кто оставит комментарий!</Text>
            </View>
          ) : (
            comments.map((comment) => (
              <View key={comment.id} style={styles.comment}>
                <View style={styles.commentHeader}>
                  {comment.userPhotoUrl ? (
                    <Image source={{ uri: comment.userPhotoUrl }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <User size={16} color="#8E8E93" strokeWidth={2} />
                    </View>
                  )}
                  <View style={styles.commentInfo}>
                    <Text style={styles.commentAuthor}>{comment.userName}</Text>
                    <Text style={styles.commentTime}>{formatTime(comment.timestamp)}</Text>
                  </View>
                </View>
                <Text style={styles.commentContent}>{comment.content}</Text>
              </View>
            ))
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Написать комментарий..."
              placeholderTextColor="#8E8E93"
              value={newComment}
              onChangeText={setNewComment}
              multiline
              maxLength={500}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                newComment.trim() ? styles.sendButtonActive : styles.sendButtonInactive
              ]}
              onPress={handleSendComment}
              disabled={!newComment.trim() || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Send size={18} color="#FFFFFF" strokeWidth={2} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E5E9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    lineHeight: 22,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentsList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  comment: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E1E5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  commentInfo: {
    flex: 1,
  },
  commentAuthor: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  commentTime: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  commentContent: {
    fontSize: 16,
    color: '#1C1C1E',
    lineHeight: 22,
  },
  inputContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E1E5E9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F2F2F7',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1C1C1E',
    maxHeight: 100,
    paddingVertical: 8,
    paddingRight: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonActive: {
    backgroundColor: '#007AFF',
  },
  sendButtonInactive: {
    backgroundColor: '#C7C7CC',
  },
});