function generateUniqueRoomId(length, userDetails) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let roomId = '';
  
    do {
      for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        roomId += characters.charAt(randomIndex);
      }
    } while (userDetails.has(roomId));
  
    return roomId;
}

module.exports = {
  generateUniqueRoomId,
};