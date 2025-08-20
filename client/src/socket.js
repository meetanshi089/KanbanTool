import { io } from "socket.io-client";

export function createSocket(token) {
  return io("https://kanbantooo.onrender.com", {
    auth: { token },
  });
}
