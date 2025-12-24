"use client";
import React, { useState } from "react";
import { getAuth } from "firebase/auth";
import { toast } from "sonner";

export default function ShareProjectModal({
  projectId,
  onClose,
}: {
  projectId: string;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("viewer");
  const [message, setMessage] = useState("");

  async function sendInvite() {
    try {
      const token = await getAuth().currentUser?.getIdToken();
      const res = await fetch(`/api/projects/${projectId}/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email, role }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");

      setMessage("Invitation sent!");
      toast.success("Invitation sent successfully!");
      setEmail("");
    } catch (err: any) {
      console.log(err);
      toast.error("Error sending invite : ", {
        description: err.message,
      });
      setMessage(err.message);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-6 w-[380px]">
        <h2 className="text-lg font-semibold mb-4">Share Project</h2>

        <div className="mb-3">
          <label className="text-sm font-medium">Invite Email</label>
          <input
            className="border rounded w-full px-2 py-1 mt-1"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@gmail.com"
          />
        </div>

        <div className="mb-3">
          <label className="text-sm font-medium">Role</label>
          <select
            className="border rounded w-full px-2 py-1 mt-1"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
          </select>
        </div>

        {message && <p className="text-sm text-blue-600 mb-2">{message}</p>}

        <div className="flex justify-end gap-2 mt-4">
          <button className="px-4 py-1 rounded bg-gray-300" onClick={onClose}>
            Close
          </button>

          <button
            className="px-4 py-1 rounded bg-blue-600 text-white"
            onClick={sendInvite}
          >
            Send Invite
          </button>
        </div>
      </div>
    </div>
  );
}
