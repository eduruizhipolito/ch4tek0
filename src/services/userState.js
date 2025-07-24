// src/services/userState.js
// Estado conversacional simple en memoria (por usuario)

const userStates = {};

function getUserState(userId) {
  if (!userStates[userId]) {
    userStates[userId] = {};
  }
  return userStates[userId];
}

function setUserState(userId, data) {
  userStates[userId] = { ...getUserState(userId), ...data };
}

function resetUserState(userId) {
  delete userStates[userId];
}

module.exports = {
  getUserState,
  setUserState,
  resetUserState
};
