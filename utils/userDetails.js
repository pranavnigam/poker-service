const updateUserList = (userDetails) => {
  const userList = JSON.parse(sessionStorage.getItem("UserList"));
  userList.push(userDetails);
  sessionStorage.setItem("UserList", JSON.stringify(userDetails));
};

const getUserList = () => {
  return JSON.parse(sessionStorage.getItem("UserList"));
};

const getCurrentUser = (sessionID) => {
  const userList = JSON.parse(sessionStorage.getItem("UserList"));
  const userDetail = userList.find((user) => user.userId === sessionID);
  return userDetail;
};

const generateUniqueUserId = (length, userIdList) => {
  let userId = "";
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  do {
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      userId += characters.charAt(randomIndex);
    }
  } while (userIdList.includes(userId));
  return userId;
};

module.exports = {
  updateUserList,
  getUserList,
  getCurrentUser,
  generateUniqueUserId,
};
