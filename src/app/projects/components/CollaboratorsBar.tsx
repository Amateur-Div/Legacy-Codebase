"use client";

import { getAuth } from "firebase/auth";
import { useProjectPresence } from "../context/ProjectPresenceContext";
import { Eye } from "lucide-react";

export function CollaboratorsBar() {
  const { users } = useProjectPresence();
  const selfUid = getAuth().currentUser?.uid;

  if (!users || users.length === 0) return null;

  const sorted = [...users].sort((a, b) => {
    if (a.uid === selfUid) return -1;
    if (b.uid === selfUid) return 1;
    return 0;
  });

  const visible = sorted.slice(0, 4);
  const remaining = sorted.length - visible.length;

  return (
    <div className="flex flex-col border-gray-400 border-l-2 pl-2">
      <h2 className="font-sans">online users :</h2>
      {visible.map((u) => (
        <div
          key={u.uid}
          title={u.email ?? "User"}
          className="relative flex gap-2 items-center justify-start  w-auto h-8 rounded-full bg-muted text-xs font-semibold text-foreground"
        >
          <span className="relative w-2 h-2 bg-green-500 rounded-full border border-background" />
          {(u.email ?? "").toUpperCase()} {" - "}
          {u.activeFile && <Eye className="mt-1" size={15} />}
          {u.activeFile ?? ""}
        </div>
      ))}

      {remaining > 0 && (
        <div className="text-xs text-muted-foreground">+{remaining}</div>
      )}
    </div>
  );
}
