// initial connection with server
socket = io();
socket.on("player", () => {
  drawer = new Drawer();
  socket.emit("confirm", null);
});