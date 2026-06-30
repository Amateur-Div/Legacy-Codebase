"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { UploadCloud, Loader2 } from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function UploadProjectModal({ open, onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { setJobId } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setDragOver(false);
    }
  }, [open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files?.[0];
    validateAndSetFile(uploaded);
  };

  const validateAndSetFile = (uploaded?: File) => {
    if (!uploaded) return;
    if (!uploaded.name.toLocaleLowerCase().endsWith(".zip")) {
      toast.error("Only ZIP files are supported.");
      return;
    }
    setFile(uploaded);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = await auth.currentUser?.getIdToken(true);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await res.json();
      setJobId(result.jobId);

      if (res.ok) {
        toast.success(`${file.name} uploaded successfully!`);
        setFile(null);
        onClose();
      } else {
        toast.error(`Upload failed: ${result?.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error("UPLOAD ERROR:", err);
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Upload Project
          </DialogTitle>
        </DialogHeader>

        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const dropped = e.dataTransfer.files?.[0];
            validateAndSetFile(dropped);
          }}
          className={clsx(
            "group rounded-2xl border border-dashed p-8 text-center transition-all duration-200 cursor-pointer",
            dragOver && "border-primary bg-primary/5 scale-[1.01]",
            file && "border-green-500 bg-green-500/5",
            !dragOver && !file && "hover:bg-muted/40 hover:border-primary/40",
          )}
        >
          <UploadCloud
            className={clsx(
              "mx-auto mb-3 transition-transform duration-200",
              dragOver
                ? "scale-110 text-primary"
                : "text-muted-foreground group-hover:text-primary",
            )}
            size={34}
          />
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {file ? file.name : "Click or drag a ZIP file here to upload"}
            </p>
            <p className="text-xs text-muted-foreground">
              Upload a compressed repository archive
            </p>
          </div>
        </div>

        <input
          type="file"
          accept=".zip"
          hidden
          ref={inputRef}
          onChange={handleFileChange}
        />

        <Button
          disabled={!file || uploading}
          onClick={handleUpload}
          className="mt-2 w-full h-11"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            "Upload"
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
