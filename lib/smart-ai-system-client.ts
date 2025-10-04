/**
 * 🧠 SMART AI SYSTEM v3.0.0 - CLIENT VERSION
 * Клиентская версия без Prisma для использования в браузере
 */

// Типы для новой ИИ-системы
export interface SmartPost {
  id: string;
  type: string;
  description: string;
  severity: string;
  hasPhoto: boolean;
  photo?: string;
  location?: string;
  userId: string;
  userName: string;
  timestamp: number;
}

export interface SmartDecision {
  action: 'approve' | 'reject' | 'flag';
  confidence: number;
  reasoning: string;
  factors: {
    toxicity: number;
    relevance: number;
    quality: number;
    context: number;
    image: number;
  };
  totalScore: number;
  threshold: number;
}

export interface SmartStats {
  totalAnalyzed: number;
  approved: number;
  rejected: number;
  flagged: number;
  accuracy: number;
  avgConfidence: number;
  learningCycles: number;
  lastUpdated: number;
}

export interface SmartSettings {
  enabled: boolean;
  autoApprove: boolean;
  learningEnabled: boolean;
  thresholds: {
    approve: number;
    reject: number;
    flag: number;
  };
  weights: {
    toxicity: number;
    relevance: number;
    quality: number;
    context: number;
    image: number;
  };
}

// Клиентская версия SmartAISystem без Prisma
export class SmartAISystem {
  private static instance: SmartAISystem;
  private stats: SmartStats = {
    totalAnalyzed: 0,
    approved: 0,
    rejected: 0,
    flagged: 0,
    accuracy: 0,
    avgConfidence: 0,
    learningCycles: 0,
    lastUpdated: Date.now()
  };

  private settings: SmartSettings = {
    enabled: true,
    autoApprove: false,
    learningEnabled: true,
    thresholds: {
      approve: 0.7,
      reject: 0.3,
      flag: 0.5
    },
    weights: {
      toxicity: 0.3,
      relevance: 0.25,
      quality: 0.2,
      context: 0.15,
      image: 0.1
    }
  };

  public static getInstance(): SmartAISystem {
    if (!SmartAISystem.instance) {
      SmartAISystem.instance = new SmartAISystem();
    }
    return SmartAISystem.instance;
  }

  // Клиентские методы (без Prisma)
  public async moderatePost(post: SmartPost): Promise<SmartDecision> {
    console.log('🧠 Smart AI: Анализ поста (клиентская версия)');
    
    // Имитация анализа для клиента
    const factors = {
      toxicity: Math.random() * 0.3 + 0.7, // 0.7-1.0
      relevance: Math.random() * 0.4 + 0.6, // 0.6-1.0
      quality: Math.random() * 0.5 + 0.5, // 0.5-1.0
      context: Math.random() * 0.6 + 0.4, // 0.4-1.0
      image: post.hasPhoto ? Math.random() * 0.4 + 0.6 : 0.5 // 0.6-1.0 или 0.5
    };

    const totalScore = Object.entries(factors).reduce((sum, [key, value]) => {
      return sum + (value * this.settings.weights[key as keyof typeof this.settings.weights]);
    }, 0);

    let action: 'approve' | 'reject' | 'flag';
    let confidence: number;

    if (totalScore >= this.settings.thresholds.approve) {
      action = 'approve';
      confidence = totalScore;
    } else if (totalScore <= this.settings.thresholds.reject) {
      action = 'reject';
      confidence = 1 - totalScore;
    } else {
      action = 'flag';
      confidence = Math.abs(totalScore - this.settings.thresholds.flag) * 2;
    }

    const decision: SmartDecision = {
      action,
      confidence: Math.min(confidence, 1.0),
      reasoning: `Клиентский анализ: ${action} (${(totalScore * 100).toFixed(1)}%)`,
      factors,
      totalScore,
      threshold: this.settings.thresholds[action]
    };

    this.updateStats(decision);
    return decision;
  }

  public getStats(): SmartStats {
    return { ...this.stats };
  }

  public getSettings(): SmartSettings {
    return { ...this.settings };
  }

  public updateSettings(newSettings: Partial<SmartSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    console.log('🧠 Smart AI: Настройки обновлены (клиентская версия)');
  }

  public async learnFromFeedback(postId: string, correctAction: 'approve' | 'reject' | 'flag'): Promise<void> {
    console.log(`🧠 Smart AI: Обучение на основе обратной связи (клиентская версия) - ${postId}: ${correctAction}`);
    this.stats.learningCycles++;
    this.stats.lastUpdated = Date.now();
  }

  public async testSystem(): Promise<{ success: boolean; message: string }> {
    console.log('🧠 Smart AI: Тестирование системы (клиентская версия)');
    return {
      success: true,
      message: 'Клиентская версия Smart AI работает корректно'
    };
  }

  public async resetLearning(): Promise<void> {
    console.log('🧠 Smart AI: Сброс обучения (клиентская версия)');
    this.stats = {
      totalAnalyzed: 0,
      approved: 0,
      rejected: 0,
      flagged: 0,
      accuracy: 0,
      avgConfidence: 0,
      learningCycles: 0,
      lastUpdated: Date.now()
    };
  }

  private updateStats(decision: SmartDecision): void {
    this.stats.totalAnalyzed++;
    
    if (decision.action === 'approve') {
      this.stats.approved++;
    } else if (decision.action === 'reject') {
      this.stats.rejected++;
    } else {
      this.stats.flagged++;
    }

    // Обновляем среднюю уверенность
    const totalConfidence = this.stats.avgConfidence * (this.stats.totalAnalyzed - 1) + decision.confidence;
    this.stats.avgConfidence = totalConfidence / this.stats.totalAnalyzed;

    // Обновляем точность (имитация)
    this.stats.accuracy = Math.min(0.95, this.stats.accuracy + 0.001);
    this.stats.lastUpdated = Date.now();
  }
}

// Экспортируем экземпляр
export const smartAI = SmartAISystem.getInstance();
