// users.js — список демонстрационных пользователей (не секретный)
// Для реального использования держите реальные учетные данные вне публичного репо.
// Формат: callsign, name, hash (hex SHA-256) - demo хэши можно заменить локально.
window.APP_USERS = [
  { callsign: "TEST", name: "Demo Pilot", hash: "", status: "verified", isAdmin: true },
  // реальные пользователи будут добавляться через регистрацию (localStorage)
];
