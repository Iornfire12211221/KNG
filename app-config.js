// Application configuration
module.exports = {
  DATABASE_URL: "postgresql://gen_user:Dima122111@5b185a49c11b0959c8173153.twc1.net:5432/default_db",
  NODE_ENV: "production",
  PORT: 8081,
  WS_PORT: 8080,
  EXPO_PUBLIC_WS_URL: process.env.NODE_ENV === 'production' 
    ? "wss://24dps.ru/ws"  // Production WebSocket URL
    : "ws://localhost:8080/ws"
};
