// users.js
// Главный список пользователей — редактируешь только ты в репозитории.
// Формат: { callsign, name, hash, status, isAdmin }
// hash — hex SHA-256 от пароля (опционально). Если hash пустой, вход с проверкой пароля будет невозможен; можно использовать демо-кнопку для TEST.

window.APP_USERS = [
  // Пример: демо-пилот (в репо можно заменить hash на хэш от "demo" если хочешь защитить вход)
  { callsign: "TEST", name: "Demo Pilot", hash: "", status: "verified", isAdmin: true },

  // Добавляй вручную сюда своих пилотов:
  // { callsign: "LH100", name: "Ivan Petrov", hash: "0123ab...ef", status: "verified", isAdmin: false },
];
