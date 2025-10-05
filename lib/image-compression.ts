// Утилиты для компрессии и обработки изображений

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

export interface CompressedImage {
  uri: string;
  width: number;
  height: number;
  size: number;
  format: string;
}

/**
 * Компрессия изображения для мобильных устройств
 */
export async function compressImage(
  imageUri: string,
  options: CompressionOptions = {}
): Promise<CompressedImage> {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.8,
    format = 'jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      try {
        // Вычисляем новые размеры с сохранением пропорций
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        // Создаем canvas для компрессии
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Не удалось получить контекст canvas'));
          return;
        }

        canvas.width = width;
        canvas.height = height;

        // Рисуем изображение с новыми размерами
        ctx.drawImage(img, 0, 0, width, height);

        // Конвертируем в нужный формат
        const mimeType = `image/${format}`;
        const compressedDataUrl = canvas.toDataURL(mimeType, quality);
        
        // Вычисляем размер в байтах
        const size = Math.round((compressedDataUrl.length * 3) / 4);

        resolve({
          uri: compressedDataUrl,
          width: Math.round(width),
          height: Math.round(height),
          size,
          format
        });
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Не удалось загрузить изображение'));
    };

    img.src = imageUri;
  });
}

/**
 * Создание превью изображения
 */
export async function createThumbnail(
  imageUri: string,
  size: number = 150
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Не удалось получить контекст canvas'));
          return;
        }

        canvas.width = size;
        canvas.height = size;

        // Рисуем квадратное превью
        ctx.drawImage(img, 0, 0, size, size);
        
        const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve(thumbnailDataUrl);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Не удалось создать превью'));
    };

    img.src = imageUri;
  });
}

/**
 * Оптимизация изображения для загрузки
 */
export async function optimizeForUpload(
  imageUri: string,
  targetSizeKB: number = 500
): Promise<CompressedImage> {
  let quality = 0.9;
  let compressedImage: CompressedImage;

  // Пробуем разные уровни качества
  for (let i = 0; i < 5; i++) {
    compressedImage = await compressImage(imageUri, {
      maxWidth: 1920,
      maxHeight: 1080,
      quality,
      format: 'jpeg'
    });

    const sizeKB = compressedImage.size / 1024;
    
    if (sizeKB <= targetSizeKB || quality <= 0.3) {
      break;
    }
    
    quality -= 0.15;
  }

  return compressedImage!;
}

/**
 * Проверка размера изображения
 */
export function getImageSize(imageUri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight
      });
    };

    img.onerror = () => {
      reject(new Error('Не удалось загрузить изображение'));
    };

    img.src = imageUri;
  });
}

/**
 * Конвертация в base64
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      resolve(reader.result as string);
    };
    
    reader.onerror = () => {
      reject(new Error('Не удалось прочитать файл'));
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Создание изображения из canvas
 */
export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string = 'image/jpeg',
  quality: number = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Не удалось создать blob'));
        }
      },
      type,
      quality
    );
  });
}

/**
 * Автоматическая коррекция изображения
 */
export async function autoCorrectImage(imageUri: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Не удалось получить контекст canvas'));
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;

        // Применяем базовые коррекции
        ctx.filter = 'contrast(1.1) brightness(1.05) saturate(1.1)';
        ctx.drawImage(img, 0, 0);

        const correctedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        resolve(correctedDataUrl);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Не удалось загрузить изображение'));
    };

    img.src = imageUri;
  });
}
