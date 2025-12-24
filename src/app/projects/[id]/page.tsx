"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAuth } from "firebase/auth";
import { toast } from "sonner";
import path from "path";
import DependencyGraph from "@/components/DependencyGraph";
import ProjectHeader from "../components/ProjectHeader";
import ProjectFilesPanel from "../components/ProjectFilesPanel";
import ProjectOverview from "../components/ProjectOverview";
import FileViewerPanel from "../components/FileViewerPanel";
import { ProjectPresenceProvider } from "../context/ProjectPresenceContext";
import { CollaboratorsBar } from "../components/CollaboratorsBar";

export default function ProjectDetailPage() {
  const router = useRouter();
  const { id: projectId } = useParams() as { id: string };

  const [project, setProject] = useState<any>(null);
  const [fileContent, setFileContent] = useState("");
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [readmeContent, setReadmeContent] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(project?.projectName || "");
  const [projectData, setProjectData] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [filteredFileTree, setFilteredFileTree] = useState<any[]>([]);
  const [tags, setTags] = useState<string[] | []>([]);
  const [insights, setInsights] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [readmeSummary, setReadmeSummary] = useState("");
  const [line, setLine] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      const token = await getAuth().currentUser?.getIdToken();

      const res = await fetch(`/api/project?id=${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data) {
        setProjectData(true);
      }

      setProject(data);

      console.log(data);
    };
    load();
  }, [projectId]);

  useEffect(() => {
    const getReadMeData = async () => {
      let readmePath;
      if (projectData) {
        readmePath = findReadmePath(project.fileTree);
        const insights = calculateInsights(project.fileTree);
        setInsights(insights);
        setTags(project.tags);
      }

      if (readmePath) {
        const contentRes = await fetch(
          `/api/project/file?projectId=${
            project?.projectId
          }&filePath=${encodeURIComponent(readmePath)}`
        );
        const contentData = await contentRes.json();
        setReadmeContent(contentData.content);
      }
    };
    getReadMeData();
  }, [projectData, project]);

  useEffect(() => {
    if (!project) return;

    const readmeNode = project.fileTree.find(
      (file: any) => file.name.toLowerCase() === "readme.md"
    );

    if (readmeNode) {
      fetch(
        `/api/project/file?projectId=${project.projectId}&filePath=${readmeNode.fullPath}`
      )
        .then((res) => res.text())
        .then((content) => {
          setReadmeContent(content);
          setReadmeSummary(generateSummary(content));
        });
    }
  }, [project]);

  function generateSummary(md: string): string {
    const lines = md.split("\n").filter(Boolean);
    const firstLines = lines.slice(0, 5);

    return (
      firstLines
        .map((line) => line.replace(/^#+\s*/, "").trim())
        .join(" ")
        .slice(0, 300) + "..."
    );
  }

  function findReadmePath(tree: any[]): string | null {
    for (const node of tree) {
      if (node.type === "file" && node.name.toLowerCase() === "\\readme.md") {
        return node.fullPath;
      } else if (node.type === "folder" && node.children) {
        const found = findReadmePath(node.children);
        if (found) return found;
      }
    }
    return null;
  }

  function buildDependencyGraph(tree: any[]): {
    nodes: string[];
    edges: [string, string][];
  } {
    const nodes: string[] = [];
    const edges: [string, string][] = [];

    const walk = (nodeList: any[], base = "") => {
      for (const node of nodeList) {
        if (node.type === "file") {
          const fullPath = node.fullPath;
          nodes.push(fullPath);

          for (const imp of node.imports || []) {
            if (imp?.name.startsWith(".")) {
              const resolvedPath = path
                .join(path.dirname(fullPath), imp.name)
                .replace(/\\/g, "/");
              edges.push([fullPath, resolvedPath]);
            }
          }
        } else if (node.children) {
          walk(node.children, base);
        }
      }
    };

    walk(tree);
    return { nodes, edges };
  }

  const graph = project && buildDependencyGraph(project.fileTree);

  const nodesData = graph?.nodes.map((id: any) => ({
    id,
    data: { label: id.split("/").pop() },
    position: { x: Math.random() * 600, y: Math.random() * 600 },
    type: "default",
  }));

  const edgesData = graph?.edges.map(([from, to]: any, i: any) => ({
    id: `e${i}`,
    source: from,
    target: to,
    type: "smoothstep",
  }));

  const handleDelete = async () => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this project?"
    );
    if (!confirmDelete) return;

    const token = await getAuth().currentUser?.getIdToken();
    const res = await fetch(`/api/project?id=${projectId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      toast.success("Project deleted successfully");
      router.push("/projects");
    } else {
      toast.error("Failed to delete project");
    }
  };

  const handleRename = async () => {
    setEditingName(false);
    if (!newName || newName === project.projectName) return;

    const token = await getAuth().currentUser?.getIdToken();
    const res = await fetch("/api/project", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id: project._id, newName }),
    });

    if (res.ok) {
      setProject({ ...project, projectName: newName });
      toast.success("Project renamed!");
    }
  };

  function calculateInsights(tree: any[]) {
    let totalLOC = 0;
    let totalFiles = 0;
    let totalFolders = 0;
    let largestFile = { name: "", loc: 0 };
    const languageMap: Record<string, number> = {};

    const walk = (nodes: any[]) => {
      for (const node of nodes) {
        if (node.type === "file") {
          totalFiles++;
          totalLOC += node.loc || 0;

          const ext = node.name.split(".").pop()?.toLowerCase();
          if (ext) languageMap[ext] = (languageMap[ext] || 0) + (node.loc || 0);

          if ((node.loc || 0) > largestFile.loc) {
            largestFile = { name: node.name, loc: node.loc };
          }
        } else if (node.type === "folder" && node.children) {
          totalFolders++;
          walk(node.children);
        }
      }
    };

    walk(tree);

    const sortedLangs = Object.entries(languageMap)
      .sort((a, b) => b[1] - a[1])
      .map(([ext, loc]) => ({ ext, loc }));

    return {
      totalLOC,
      totalFiles,
      totalFolders,
      largestFile,
      topLanguages: sortedLangs,
      languageUsage: sortedLangs.map(({ ext, loc }) => ({
        ext,
        loc,
        percent: ((loc / totalLOC) * 100).toFixed(1),
      })),
    };
  }

  function detectLanguage(filePath: string = "") {
    const ext = filePath.split(".").pop()?.toLowerCase();

    switch (ext) {
      case "js":
      case "jsx":
        return "javascript";
      case "ts":
      case "tsx":
        return "typescript";
      case "html":
        return "html";
      case "css":
        return "css";
      case "json":
        return "json";
      case "md":
        return "markdown";
      case "py":
        return "python";
      case "java":
        return "java";
      case "cpp":
        return "cpp";
      default:
        return "text";
    }
  }

  const handleFileClick = async (path: string) => {
    setSelectedPath(path);
    if (!path.split("\\").pop()?.includes(".")) return;

    const token = await getAuth().currentUser?.getIdToken();

    const res = await fetch(
      `/api/project/file?projectId=${
        project.projectId
      }&filePath=${encodeURIComponent(path)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const data = await res.json();
    setFileContent(data.content || "Unable to load file.");
  };

  function filterFileTree(tree: any[], query: string): any[] {
    if (!query) return tree;

    const matchesQuery = (name: string) =>
      name.toLowerCase().includes(query.toLowerCase());

    return tree
      .map((node) => {
        if (node.type === "file" && matchesQuery(node.name)) {
          return node;
        }
        if (node.type === "folder" && node.children) {
          const filteredChildren = filterFileTree(node.children, query);
          if (filteredChildren.length > 0) {
            return { ...node, children: filteredChildren };
          }
        }
        return null;
      })
      .filter(Boolean);
  }

  function getLanguageColor(ext: string) {
    const colors: Record<string, string> = {
      js: "#f1e05a",
      ts: "#3178c6",
      jsx: "#61dafb",
      tsx: "#3178c6",
      py: "#3572A5",
      java: "#b07219",
      cpp: "#f34b7d",
      html: "#e34c26",
      css: "#563d7c",
      scss: "#c6538c",
      json: "#292929",
      md: "#083fa1",
      txt: "#777777",
      default: "#ccc",
    };

    return colors[ext.toLowerCase()] || colors.default;
  }

  function findSelectedFileNode(tree: any[]): any | null {
    for (const node of tree) {
      if (node.type === "file" && node.fullPath === selectedPath) {
        return node;
      } else if (node.type === "folder" && node.children) {
        const found = findSelectedFileNode(node.children);
        if (found) return found;
      }
    }
    return null;
  }

  const selectedFileNode = useMemo(() => {
    if (projectData) return findSelectedFileNode(project.fileTree);
  }, [projectData, selectedPath]);

  if (!project) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-6 w-48 bg-muted animate-pulse rounded" />
        <div className="h-5 w-32 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const filteredTree = filterFileTree(project.fileTree, searchTerm);

  return (
    <div className="p-6 space-y-6 flex flex-col h-full w-full overflow-auto">
      <ProjectPresenceProvider projectId={projectId}>
        <ProjectHeader
          projectName={project.projectName}
          projectId={projectId}
          editingName={editingName}
          newName={newName}
          setNewName={setNewName}
          setEditingName={setEditingName}
          handleRename={handleRename}
          tags={tags}
          tagInput={tagInput}
          setTagInput={setTagInput}
          setTags={setTags}
          handleDelete={handleDelete}
        />
        <ProjectOverview
          summary={readmeSummary}
          insights={insights}
          packageInfo={project?.packageInfo}
          getLanguageColor={getLanguageColor}
        />
        <DependencyGraph nodesData={nodesData} edgesData={edgesData} />

        <CollaboratorsBar />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ProjectFilesPanel
            project={project}
            setLine={setLine}
            handleFileClick={handleFileClick}
            fileTree={filteredTree}
            setSelectedPath={setSelectedPath}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            entryPoints={project?.entryPoints || []}
            selectedPath={selectedPath}
          />

          <FileViewerPanel
            projectId={project._id}
            project={project}
            handleFileClick={handleFileClick}
            setProject={setProject}
            fileTree={filteredTree || project.fileTree}
            setFilteredFileTree={setFilteredFileTree}
            selectedPath={selectedPath}
            setSelectedPath={setSelectedPath}
            fileContent={fileContent}
            lineNumber={line}
            selectedFileNode={selectedFileNode}
            readmeContent={readmeContent}
            readmeSummary={readmeSummary}
            detectLanguage={detectLanguage}
          />
        </div>
      </ProjectPresenceProvider>
    </div>
  );
}
