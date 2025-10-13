import { PrismaClient } from './generated/prisma';

// Fix BigInt JSON serialization
(BigInt.prototype as any).toJSON = function() {
  return this.toString();
};

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Загружаем конфигурацию из файла, если переменные окружения не установлены
let config: any = {};
try {
  if (!process.env.DATABASE_URL) {
    config = require('../app-config.js');
    if (config.DATABASE_URL) {
      process.env.DATABASE_URL = config.DATABASE_URL;
      console.log('✅ Loaded DATABASE_URL from app-config.js');
    }
  }
} catch (error) {
  console.log('ℹ️ app-config.js not found, using environment variables');
}

// Проверяем наличие DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not defined!');
  console.error('Current env vars:', Object.keys(process.env).filter(k => k.includes('DATABASE')));
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  errorFormat: 'pretty',
});

// Проверяем подключение к БД при старте
prisma.$connect()
  .then(() => console.log('✅ Prisma connected to database'))
  .catch((error) => {
    console.error('❌ Failed to connect to database:', error);
    console.error('DATABASE_URL:', process.env.DATABASE_URL ? 'is set' : 'is NOT set');
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
