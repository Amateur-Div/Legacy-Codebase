"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { getAuth } from "firebase/auth";
import Pusher from "pusher-js";

type PresenceUser = {
  uid: string;
  email?: string;
  activeFile?: string;
  focusedNodeId?: string;
  focusedAt?: number;
};

type PresenceContextType = {
  users: PresenceUser[];
  setActiveFile: (file: string) => void;
  channelRef: any;
  subscribedRef: any;
};

const ProjectPresenceContext = createContext<PresenceContextType | null>(null);

export function useProjectPresence() {
  const ctx = useContext(ProjectPresenceContext);
  if (!ctx) {
    throw new Error(
      "useProjectPresence must be used within ProjectPresenceProvider"
    );
  }
  return ctx;
}

export function ProjectPresenceProvider({
  projectId,
  children,
}: {
  projectId: string;
  children: React.ReactNode;
}) {
  const [users, setUsers] = useState<PresenceUser[]>([]);
  const channelRef = useRef<any>(null);
  const pusherRef = useRef<Pusher | null>(null);
  const subscribedRef = useRef<boolean>(false);
  const initializedRef = useRef(false);
  const selfRef = useRef<PresenceUser | null>(null);

  useEffect(() => {
    selfRef.current = null;

    const auth = getAuth();

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) return;
      if (pusherRef.current) return;

      const token = await user.getIdToken();
      selfRef.current = {
        uid: user.uid,
        email: user.email || undefined,
      };

      const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        forceTLS: true,
        enabledTransports: ["ws", "wss"],

        channelAuthorization: {
          endpoint: "/api/realtime/auth",
          headers: {
            Authorization: `Bearer ${token}`,
          },

          transport: "ajax",
        },
      });

      pusher.connection.bind("connected", () => {
        console.log("[PUSHER] Connected", pusher.connection.socket_id);
      });

      pusher.connection.bind("error", (err: any) => {
        console.error("[PUSHER] Error", err);
      });

      pusherRef.current = pusher;

      const channel = pusher.subscribe(`presence-project-${projectId}`);
      channelRef.current = channel;

      channel.bind("pusher:subscription_succeeded", (members: any) => {
        if (initializedRef.current) return;
        initializedRef.current = true;
        subscribedRef.current = true;

        const remoteUsers = Object.values(members.members || {}).map(
          (m: any) => ({
            uid: m.id,
            ...m.info,
          })
        );

        setUsers((prev) =>
          normalizeUsers([
            ...(selfRef.current ? [selfRef.current] : []),
            ...prev,
            ...remoteUsers,
          ])
        );
      });

      channel.bind("pusher:member_added", (member: any) => {
        if (!member?.id) return;

        setUsers((prev) =>
          normalizeUsers([...prev, { uid: member.id, ...member.info }])
        );
      });

      channel.bind("pusher:member_removed", (member: any) => {
        if (!member?.id) return;
        if (member.id === selfRef.current?.uid) return;

        setUsers((prev) => prev.filter((u) => u.uid !== member.id));
      });

      channel.bind("client-file-change", (data: any) => {
        setUsers((prev) =>
          normalizeUsers(
            prev.map((u) =>
              u.uid === data.uid ? { ...u, activeFile: data.file } : u
            )
          )
        );
      });

      channel.bind("client-graph-focus", (data: any) => {
        if (!data?.uid || !data?.nodeId) return;

        setUsers((prev) =>
          normalizeUsers(
            prev.map((u: PresenceUser) =>
              u.uid === data.uid
                ? {
                    ...u,
                    focusedNodeId: data.nodeId,
                    focusedAt: Date.now(),
                  }
                : u
            )
          )
        );
      });
    });

    return () => {
      unsubscribe();
      initializedRef.current = false;
      subscribedRef.current = false;

      if (channelRef.current) channelRef.current.unsubscribe();
      if (pusherRef.current) pusherRef.current.disconnect();

      channelRef.current = null;
      pusherRef.current = null;
    };
  }, [projectId]);

  function normalizeUsers(list: PresenceUser[]) {
    const map = new Map<string, PresenceUser>();
    for (const u of list) {
      if (u?.uid) map.set(u.uid, u);
    }
    return Array.from(map.values());
  }

  function setActiveFile(file: string) {
    const channel = channelRef.current;
    const uid = getAuth().currentUser?.uid;
    if (!channel || !uid || !subscribedRef.current) return;

    channel.trigger("client-file-change", { uid, file });
  }

  return (
    <ProjectPresenceContext.Provider
      value={{ users, setActiveFile, channelRef, subscribedRef }}
    >
      {children}
    </ProjectPresenceContext.Provider>
  );
}
