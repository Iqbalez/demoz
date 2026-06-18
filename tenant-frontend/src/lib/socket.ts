import { io, type Socket } from "socket.io-client";
import { env } from "./env";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket) return socket;

  const url = env.NEXT_PUBLIC_SOCKET_URL;
  socket = io(url, {
    withCredentials: true,
    transports: ["websocket", "polling"],
  });

  return socket;
}

