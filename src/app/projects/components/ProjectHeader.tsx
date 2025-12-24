"use client";

import {
  PencilIcon,
  SaveIcon,
  Trash2Icon,
  PlusIcon,
  XIcon,
  MoreVertical,
  ShareIcon,
  Share2Icon,
  Users2,
} from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ShareProjectModal from "@/components/ShareProjectModel";
import { useRouter } from "next/navigation";

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
  const [ShareProject, setShareProject] = useState<boolean>(false);
  const router = useRouter();

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (!trimmed) return;
    if (tags.includes(trimmed)) {
      setTagError("Duplicate tag");
      return;
    }
    setTags([...tags, trimmed]);
    setTagInput("");
    setTagError("");
  };

  const removeTag = (index: number) => {
    const updated = [...tags];
    updated.splice(index, 1);
    setTags(updated);
  };

  const handleRenameClick = () => {
    handleRename();
    setEditingName(false);
    toast.success("Project name was changed successfully!");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full bg-card border rounded-2xl shadow-sm p-5 mb-6"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <div className="flex items-center gap-3">
          {editingName ? (
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="text-xl font-semibold border border-muted rounded-md px-3 py-1.5 bg-background focus:outline-none"
              placeholder="Enter project name"
            />
          ) : (
            <h1 className="text-2xl font-semibold text-foreground">
              {projectName}
            </h1>
          )}

          <button
            onClick={
              editingName ? handleRenameClick : () => setEditingName(true)
            }
            className="text-sm px-3 py-1.5 rounded-md bg-muted hover:bg-muted/70 text-primary flex items-center gap-1 transition"
          >
            {editingName ? (
              <SaveIcon className="w-4 h-4" />
            ) : (
              <PencilIcon className="w-4 h-4" />
            )}
            {editingName ? "Save" : "Rename"}
          </button>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <MoreVertical size={16} className="cursor-pointer" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 bg-white">
            <DropdownMenuItem
              onClick={handleDelete}
              className="cursor-pointer text-red-600 hover:text-red-700 transition"
            >
              <Trash2Icon className="w-4 h-4" /> Delete Project
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setShareProject(true)}
              className="cursor-pointer hover:text-blue-500"
            >
              <Share2Icon className="w-4 h-4" /> Share Project
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push(`/projects/${projectId}/members`)}
              className="cursor-pointer"
            >
              <Users2 className="w-4 h-4" /> Members
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {ShareProject && (
        <ShareProjectModal
          projectId={projectId}
          onClose={() => setShareProject(false)}
        />
      )}

      <div className="flex flex-wrap items-center gap-2">
        {tags.map((tag, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center px-3 py-1 text-xs bg-muted rounded-full border text-muted-foreground gap-1"
          >
            #{tag}
            <button
              onClick={() => removeTag(i)}
              className="hover:text-red-500 transition"
              aria-label="Remove tag"
            >
              <XIcon className="w-3 h-3" />
            </button>
          </motion.div>
        ))}

        <div className="flex items-center gap-1">
          <input
            type="text"
            placeholder="Add tag"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTag()}
            className="text-xs px-3 py-1.5 border rounded-md bg-background focus:outline-none"
          />
          <TooltipProvider>
            <Tooltip>
              <button
                title="button"
                type={"button"}
                onClick={addTag}
                className="p-1.5 rounded-md bg-muted hover:bg-muted/70 transition"
              >
                <PlusIcon className="w-4 h-4 text-muted-foreground" />
              </button>
            </Tooltip>
          </TooltipProvider>
        </div>

        {tagError && (
          <span className="text-xs text-red-500 ml-2 animate-pulse">
            {tagError}
          </span>
        )}
      </div>
    </motion.div>
  );
}
