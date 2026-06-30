"use client";

import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";
import { FolderOpen, UploadCloud } from "lucide-react";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import ProjectCard from "@/components/ProjectCard";
import UploadProjectModal from "@/components/UploadProjectModel";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

type Project = {
  _id: string;
  projectName: string;
  createdAt: string;
};

const PROJECTS_PER_PAGE = 9;

export default function ProjectsPage() {
  const [openUploadModal, setOpenUploadModal] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isloading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (!auth.currentUser?.emailVerified) {
        toast.info("Verify your email!", {
          description:
            "Your email is not verified. Please verify before continuing.",
        });
        router.push("/login");
      }
    }
  }, [user, loading, router]);

  const fetchProjects = async (showLoading = true) => {
    if (showLoading) {
      setIsLoading(true);
    }

    try {
      const token = await getAuth().currentUser?.getIdToken();

      const res = await fetch("/api/projects", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (res.ok) {
        setProjects(data.projects || []);
        setCurrentPage(1);
      } else {
        toast.error("Failed to load projects");
      }
    } catch (err) {
      console.error("FETCH_PROJECTS_ERROR:", err);

      toast.error("Something went wrong while fetching projects.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const totalPages = Math.ceil(projects.length / PROJECTS_PER_PAGE);

  const startIndex = (currentPage - 1) * PROJECTS_PER_PAGE;

  const paginatedProjects = projects.slice(
    startIndex,
    startIndex + PROJECTS_PER_PAGE,
  );

  return (
    <div className="min-h-screen bg-background">
      <motion.div
        className="
          mx-auto
          w-full
          max-w-7xl
          p-6
          space-y-8
        "
        initial={{
          opacity: 0,
          y: 10,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.3,
        }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-3">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Your Projects
              </h1>

              <p className="text-sm text-muted-foreground">
                Analyze, visualize and understand large codebases.
              </p>
            </div>

            <div className="rounded-xl border bg-muted/20 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-sm font-medium">
                  Deep Analysis Supports:
                </span>

                <Badge variant="secondary">JavaScript</Badge>
                <Badge variant="secondary">TypeScript</Badge>
              </div>

              <p className="text-xs text-muted-foreground">
                Other files (JSON, YAML, Markdown, assets, configs) are indexed
                and displayed, but semantic analysis is currently optimized for
                JavaScript and TypeScript.
              </p>
            </div>
          </div>

          <motion.div
            whileHover={{
              scale: 1.03,
            }}
            whileTap={{
              scale: 0.98,
            }}
          >
            <Button
              onClick={() => setOpenUploadModal(true)}
              className="gap-2 shadow-sm"
              size="lg"
            >
              <UploadCloud size={18} />
              Upload Project
            </Button>
          </motion.div>
        </div>

        {isloading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {Array.from({
              length: 6,
            }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-36 w-full rounded-2xl bg-muted/40"
              />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed bg-muted/20 px-6 py-20 text-center">
            <FolderOpen className="h-14 w-14 text-muted-foreground mb-5" />

            <h2 className="text-xl font-semibold">No projects yet</h2>

            <p className="text-sm text-muted-foreground mt-2 max-w-md">
              Upload your first repository to generate architecture graphs,
              dependency insights and code intelligence.
            </p>

            <Button
              onClick={() => setOpenUploadModal(true)}
              className="mt-6 gap-2"
            >
              <UploadCloud size={16} />
              Upload Project
            </Button>
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},

              visible: {
                transition: {
                  staggerChildren: 0.05,
                },
              },
            }}
          >
            <AnimatePresence>
              {paginatedProjects.map((project) => (
                <motion.div
                  key={project._id}
                  initial={{
                    opacity: 0,
                    y: 12,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  exit={{
                    opacity: 0,
                    y: -12,
                  }}
                  transition={{
                    duration: 0.25,
                  }}
                  whileHover={{
                    y: -4,
                  }}
                >
                  <ProjectCard {...project} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => prev - 1)}
            >
              Previous
            </Button>

            {Array.from({ length: totalPages }).map((_, index) => (
              <Button
                key={index}
                size="sm"
                variant={currentPage === index + 1 ? "default" : "outline"}
                onClick={() => setCurrentPage(index + 1)}
              >
                {index + 1}
              </Button>
            ))}

            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((prev) => prev + 1)}
            >
              Next
            </Button>
          </div>
        )}

        <UploadProjectModal
          open={openUploadModal}
          onClose={() => {
            setOpenUploadModal(false);

            fetchProjects(false);
          }}
        />
      </motion.div>
    </div>
  );
}
