import { io } from "socket.io-client";

export function createSocket(token) {
  return io("http://localhost:4000", { auth: { token } });
}
