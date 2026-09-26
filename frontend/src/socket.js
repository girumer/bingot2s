import { io } from "socket.io-client";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Determine WebSocket URL dynamically
const SOCKET_URL = BACKEND_URL.replace(/^http/, 'ws'); // http -> ws, https -> wss

const socket = io(SOCKET_URL, {
  withCredentials: true,
  transports: ["websocket", "polling"]
});

export default socket;
