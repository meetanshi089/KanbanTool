require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const { Card } = require("./db");
const { verifyJwt } = require("./utils/jwt");

const app = express();
app.use(cors());
app.use(express.json());

// REST endpoints for auth
app.use("/auth", authRoutes);

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Authenticate socket connections
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("No token"));
    const payload = verifyJwt(token);
    socket.userId = payload.userId; // attach user id to socket
    next();
  } catch (e) {
    next(new Error("Invalid token"));
  }
});

io.on("connection", async (socket) => {
  const userId = socket.userId;
  console.log(" socket connected for user:", userId);

  // Send this user's cards only
  const cards = await Card.find({ userId });
  socket.emit("load-cards", cards);

  // Create card (attach userId)
  socket.on("create-card", async (newCard) => {
    try {
      const card = await Card.create({ ...newCard, userId });
      io.to(socket.id).emit("create-card", card); // echo to creator
      socket.broadcast.emit("create-card", card); // broadcast to others (same app)
    } catch (e) {
      console.error(e);
    }
  });

  // Move card (update column)
  socket.on("move-card", async (updatedCard) => {
    try {
      await Card.updateOne(
        { _id: updatedCard.id, userId },
        { column: updatedCard.column }
      );
      io.emit("move-card", { ...updatedCard, userId });
    } catch (e) {
      console.error(e);
    }
  });

  // Update content
  socket.on("update-card", async (updatedCard) => {
    try {
      await Card.updateOne(
        { _id: updatedCard.id, userId },
        { content: updatedCard.content }
      );
      io.emit("update-card", { ...updatedCard, userId });
    } catch (e) {
      console.error(e);
    }
  });

  // Delete
  socket.on("delete-card", async (cardId) => {
    try {
      await Card.deleteOne({ _id: cardId, userId });
      io.emit("delete-card", cardId);
    } catch (e) {
      console.error(e);
    }
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
