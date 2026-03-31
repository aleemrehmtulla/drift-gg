import { useEffect, useRef, useCallback } from "react";
import type { Socket } from "socket.io-client";
import { getSocket } from "@/lib/socket";
import { SOCKET_EVENTS } from "@repo/shared";

type SocketEvent = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = getSocket();
    if (!socketRef.current.connected) {
      socketRef.current.connect();
    }
    return () => {
      // don't disconnect on unmount — keep connection alive across page navigations
    };
  }, []);

  const emit = useCallback(<T,>(event: SocketEvent, data?: T) => {
    socketRef.current?.emit(event, data);
  }, []);

  const on = useCallback(<T,>(event: SocketEvent, handler: (data: T) => void) => {
    const socket = socketRef.current;
    if (!socket) return () => {};
    socket.on(event, handler as (...args: unknown[]) => void);
    return () => {
      socket.off(event, handler as (...args: unknown[]) => void);
    };
  }, []);

  return { emit, on };
}
