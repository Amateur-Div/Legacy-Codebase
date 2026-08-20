"use client";

import {
  PencilIcon,
  SaveIcon,
  Trash2Icon,
  PlusIcon,
  XIcon,
  MoreVertical,
  Share2Icon,
  Users2,
  TagsIcon,
  Layers3Icon,
} from "lucide-react";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import ShareProjectModal from "@/components/ShareProjectModel";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { auth } from "@/lib/firebase";
import { getAuth } from "firebase/auth";

interface ProjectHeaderProps {
  projectName: string;
  projectId: string;
  editingName: boolean;
  newName: string;
  setNewName: (val: string) => void;
  setEditingName: (val: boolean) => void;
  handleRename: () => void;
  tags: string[];
  tagInput: string;
  setTagInput: (val: string) => void;
  setTags: (tags: string[]) => void;
  handleDelete: () => void;
}

const AUTO_TECH_TAGS = [
  "react",
  "nextjs",
  "express",
  "nestjs",
  "mongodb",
  "firebase",
  "tailwind",
  "prisma",
  "typescript",
  "redux",
  "docker",
];

export default function ProjectHeader({
  projectName,
  projectId,
  editingName,
  newName,
  setNewName,
  setEditingName,
  handleRename,
  tags,
  tagInput,
  setTagInput,
  setTags,
  handleDelete,
}: ProjectHeaderProps) {
  const [tagError, setTagError] = useState("");
  const [shareProject, setShareProject] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const router = useRouter();

  const { stackTags, customTags } = useMemo(() => {
    const auto: string[] = [];
    const custom: string[] = [];

    for (const tag of tags) {
      if (AUTO_TECH_TAGS.includes(tag.toLowerCase())) {
        auto.push(tag);
      } else {
        custom.push(tag);
      }
    }

    return {
      stackTags: auto,
      customTags: custom,
    };
  }, [tags]);

  const addTag = async () => {
    const trimmed = tagInput.trim().toLowerCase();

    if (!trimmed) return;

    if (tags.includes(trimmed)) {
      setTagError("Tag already exists");
      return;
    }

    if (trimmed.length > 24) {
      setTagError("Tag is too long");
      return;
    }

    setTags([...tags, trimmed]);

    const token = await getAuth().currentUser?.getIdToken();
    await fetch(`/api/project`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        id: projectId,
        tags: [...tags, trimmed],
      }),
    });

    setTagInput("");
    setTagError("");
  };

  const removeTag = async (tag: string) => {
    const updatedTags = tags.filter((t) => t != tag);
    setTags(updatedTags);

    const token = await getAuth().currentUser?.getIdToken();
    await fetch(`/api/project`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        id: projectId,
        tags: updatedTags,
      }),
    });
  };

  const handleRenameClick = () => {
    if (!newName.trim()) return;

    handleRename();
    setEditingName(false);
    toast.success("Project renamed successfully");
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="w-full rounded-2xl border bg-card shadow-sm p-5 space-y-5"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            {editingName ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Enter project name"
                  className="h-10 w-full sm:w-80 rounded-lg border bg-background px-3 text-lg font-semibold outline-none focus:ring-2 focus:ring-primary/20"
                />

                <button
                  onClick={handleRenameClick}
                  className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground transition hover:opacity-90"
                >
                  <SaveIcon className="h-4 w-4" />
                  Save
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <h1 className="break-words text-2xl font-semibold tracking-tight text-foreground">
                  {projectName}
                </h1>

                <button
                  onClick={() => setEditingName(true)}
                  className="rounded-md border bg-muted/40 p-2 transition hover:bg-muted"
                >
                  <PencilIcon className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="self-start rounded-lg border p-2.5 transition hover:bg-muted">
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-52 bg-white">
              <DropdownMenuItem
                onClick={() => setShareProject(true)}
                className="cursor-pointer"
              >
                <Share2Icon className="mr-2 h-4 w-4" />
                Share Project
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => router.push(`/projects/${projectId}/members`)}
                className="cursor-pointer"
              >
                <Users2 className="mr-2 h-4 w-4" />
                Manage Members
              </DropdownMenuItem>

              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setDeleteDialogOpen(true);
                }}
                className="cursor-pointer text-red-600 focus:text-red-600"
              >
                <Trash2Icon className="mr-2 h-4 w-4" />
                Delete Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this project?</AlertDialogTitle>

              <AlertDialogDescription>
                This action cannot be undone. All project files, analysis,
                graphs and members will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>

              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {stackTags.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Layers3Icon className="h-4 w-4 text-primary" />
              Tech Stack
            </div>

            <div className="flex flex-wrap gap-2">
              {stackTags.map((tag) => (
                <div
                  key={tag}
                  className="rounded-full border bg-primary/5 px-3 py-1 text-xs font-medium text-primary"
                >
                  {tag}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <TagsIcon className="h-4 w-4 text-primary" />
            Custom Tags
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {customTags.map((tag) => (
              <motion.div
                key={tag}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-1 rounded-full border bg-muted/40 px-3 py-1 text-xs text-muted-foreground"
              >
                <span>#{tag}</span>

                <button
                  onClick={() => removeTag(tag)}
                  className="transition hover:text-red-500"
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </motion.div>
            ))}

            <div className="flex flex-col items-center gap-2 sm:flex-row">
              <input
                type="text"
                value={tagInput}
                placeholder="Add custom tag"
                onChange={(e) => {
                  setTagInput(e.target.value);

                  if (tagError) {
                    setTagError("");
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    addTag();
                  }
                }}
                className="h-9 flex-1 rounded-lg border bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-primary/20"
              />

              <button
                type="button"
                onClick={addTag}
                className="w-8.5 rounded-lg border bg-muted/40 p-2 transition hover:bg-muted"
              >
                <PlusIcon className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {tagError && <p className="text-xs text-red-500">{tagError}</p>}
        </div>
      </motion.div>

      {shareProject && (
        <ShareProjectModal
          projectId={projectId}
          onClose={() => setShareProject(false)}
        />
      )}
    </>
  );
}
