"use client";

import { useState } from "react";
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

  const handleRename = () => {
    if (!newName.trim()) return;
    onRename(newName.trim());
    setNewName("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename File</DialogTitle>
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
            <Button onClick={handleRename}>Rename</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
