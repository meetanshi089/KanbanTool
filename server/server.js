const express = require("express");
const http = require("http");
const socketio = require("socket.io");
const cors = require("cors");
const app = express();
app.use(cors());
const server = http.createServer(app);
//initialize socket.io with cors allowed socketio(server, options
const io = socketio(server, {
  cors: { origin: "*" },
});
//in-memory data for kanaban cards
let cards = [
  { id: 1, content: "learn react", column: "to-do" },
  { id: 2, content: "Build backend", column: "inprogress" },
  { id: 3, content: "Deploy ap", column: "done" },
];
//when a client connects
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  //sends current cards to newly connected client
  socket.emit("load-cards", cards);

  //Listen for card movement events from clients
  socket.on("move-card", (updatedCard) => {
    //update the card in server memory
    cards = cards.map((card) =>
      card.id === updatedCard.id ? updatedCard : card
    );

    //Broadcast the updated card to all other clients except sender
    socket.broadcast.emit("move-card", updatedCard);

    //
  });

  // Handle client disconnect
  socket.on("disconnect", () => {
    console.log("Client disconnected", socket.id);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
