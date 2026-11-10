"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { API_URL } from "@/lib/api";
import { useAuth } from "./auth-context";

export type ConnectionStatus = "connecting" | "connected" | "reconnecting";

interface SocketContextValue {
  socket: Socket | null;
  status: ConnectionStatus;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { sessionExpired } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");

  useEffect(() => {
    const client = io(API_URL, { withCredentials: true });

    client.on("connect", () => setStatus("connected"));
    client.on("disconnect", (reason) => {
      setStatus("reconnecting");
      // The server closed the connection on purpose (e.g. expired session):
      // socket.io will not retry by itself in this case
      if (reason === "io server disconnect") client.connect();
    });
    client.on("connect_error", (error) => {
      if (error.message === "unauthorized") {
        client.disconnect();
        sessionExpired();
        return;
      }
      setStatus("reconnecting");
    });

    // Created in the effect on purpose, so the socket lives exactly as long as the provider
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSocket(client);
    return () => {
      client.disconnect();
    };
  }, [sessionExpired]);

  return <SocketContext value={{ socket, status }}>{children}</SocketContext>;
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) throw new Error("useSocket must be used inside SocketProvider");
  return context;
}
