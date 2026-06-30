"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function RenameFileDialog({
  open,
  onOpenChange,
  oldPath,
  onRename,
}: {
  open: boolean;
  onOpenChange: (val: boolean) => void;
  oldPath: string;
  onRename: (newName: string) => void;
}) {
  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (open) {
      const currentName = oldPath.split("/").pop() || "";
      setNewName(currentName);
    }
  }, [open, oldPath]);

  const handleRename = () => {
    if (!newName.trim()) return;
    onRename(newName.trim());
    setNewName("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename File</DialogTitle>
          <p className="text-xs text-muted-foreground break-all">{oldPath}</p>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Enter new file name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={!newName.trim()}>
              Rename
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
