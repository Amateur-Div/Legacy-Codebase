"use client";

import React, { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function InvitesPage() {
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function loadInvites() {
    setLoading(true);
    try {
      const token = await getAuth().currentUser?.getIdToken();
      const res = await fetch("/api/invites/list", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      console.log(data);
      setInvites(data.invites || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load invites");
    }
    setLoading(false);
  }

  async function acceptInvite(projectId: string) {
    setAccepting(projectId);

    try {
      const token = await getAuth().currentUser?.getIdToken();
      const res = await fetch("/api/invites/accept", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ projectId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invite failed");

      await loadInvites();
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    }

    setAccepting(null);
  }

  useEffect(() => {
    loadInvites();
  }, []);

  return (
    <div className="max-w-3xl mx-auto mt-10 px-4">
      <Card className="shadow-sm border border-gray-200">
        <CardHeader>
          <CardTitle className="text-xl">Project Invitations</CardTitle>
        </CardHeader>

        <CardContent>
          <Separator className="my-3" />

          {loading && (
            <div className="space-y-3">
              <div className="h-12 bg-gray-200 animate-pulse rounded"></div>
              <div className="h-12 bg-gray-200 animate-pulse rounded"></div>
            </div>
          )}

          {error && <p className="text-red-500 mb-3">{error}</p>}

          {!loading && invites.length === 0 && (
            <p className="text-gray-500 text-sm">
              You have no pending invites.
            </p>
          )}

          <div className="space-y-4">
            {invites.map((inv, index) => (
              <Card
                key={index}
                className="border rounded-lg p-4 flex justify-between items-center"
              >
                <div>
                  <p className="font-medium text-lg">{inv.projectName}</p>

                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary">{inv.role}</Badge>
                    <Badge variant="outline">
                      Invited {new Date(inv.invitedAt).toLocaleDateString()}
                    </Badge>
                  </div>
                </div>

                <Button
                  disabled={accepting === inv.projectId}
                  onClick={() => acceptInvite(inv.projectId)}
                >
                  {accepting === inv.projectId
                    ? "Accepting..."
                    : "Accept Invite"}
                </Button>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
