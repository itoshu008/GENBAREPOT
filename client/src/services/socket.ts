import { io, Socket } from "socket.io-client";

// 本番環境では相対パスを使用（HTTPS対応）
// 開発環境では環境変数またはデフォルトのlocalhostを使用
const getSocketUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // 本番環境判定: HTTPSまたはlocalhost以外のホスト名
  const isProduction = window.location.protocol === 'https:' || 
                       (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1');
  
  if (isProduction) {
    // 本番環境では/genbareport経由でアクセス（HTTPS対応）
    return '/genbareport'; // Socket.IOは/genbareport/socket.io/... として接続
  }
  // 開発環境ではlocalhost
  return "http://localhost:4100";
};

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(getSocketUrl(), {
      transports: ["websocket"],
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

