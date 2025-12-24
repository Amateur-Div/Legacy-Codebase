"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getAuth } from "firebase/auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";

export default function ProjectMembersPage() {
  const params = useParams();
  const projectId = params?.id as string;

  const [members, setMembers] = useState<any[]>([]);
  const [ownerUid, setOwnerUid] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadMembers() {
    setLoading(true);
    const token = await getAuth().currentUser?.getIdToken();
    const res = await fetch(`/api/projects/${projectId}/members`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json();
    console.log(data);

    setMembers(data.members || []);

    const ownerObj = data.members.find((m: any) => m.role === "owner");
    if (ownerObj) setOwnerUid(ownerObj.uid);

    setLoading(false);
  }

  async function updateRole(uid: string, newRole: string) {
    const token = await getAuth().currentUser?.getIdToken();
    await fetch(`/api/projects/${projectId}/members/update-role`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ targetUid: uid, role: newRole }),
    });
    await loadMembers();
  }

  async function removeMember(uid: string) {
    const token = await getAuth().currentUser?.getIdToken();
    await fetch(`/api/projects/${projectId}/members/remove`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ targetUid: uid }),
    });

    await loadMembers();
  }

  useEffect(() => {
    loadMembers();
  }, []);

  return (
    <div className="max-w-3xl mx-auto mt-10 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Project Members</CardTitle>
        </CardHeader>

        <CardContent>
          <Separator className="my-3" />

          {loading && <p>Loading members...</p>}

          {!loading && members.length === 0 && (
            <p className="text-gray-500">No members found.</p>
          )}

          <div className="space-y-4">
            {members.map((m) => (
              <Card
                key={m.uid}
                className="p-4 flex justify-between items-center"
              >
                <div>
                  <p className="font-medium">{m.uid}</p>
                  <Badge
                    variant={m.role === "owner" ? "default" : "secondary"}
                    className="mt-1"
                  >
                    {m.role}
                  </Badge>
                </div>

                {m.role !== "owner" &&
                  ownerUid === getAuth().currentUser?.uid && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline">Manage</Button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => updateRole(m.uid, "viewer")}
                        >
                          Make Viewer
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => updateRole(m.uid, "editor")}
                        >
                          Make Editor
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => removeMember(m.uid)}
                          className="text-red-600"
                        >
                          Remove Member
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
