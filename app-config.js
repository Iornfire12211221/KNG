// Application configuration
module.exports = {
  DATABASE_URL: "postgresql://gen_user:Dima12211221@7f43f55089d91f30067cda7d.twc1.net:5432/default_db?sslmode=require",
  NODE_ENV: "production",
  PORT: 8081,
  WS_PORT: 8080,
  // Всегда используем production WebSocket URL (не localhost)
  EXPO_PUBLIC_WS_URL: "wss://24dps.ru/ws"
};
