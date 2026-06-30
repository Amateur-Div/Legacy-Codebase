import { useState } from "react";
import { getAuth } from "firebase/auth";

export function useFileHandler(projectId: string) {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState("");

  const handleFileClick = async (path: string) => {
    setSelectedPath(path);

    if (!path.split("\\").pop()?.includes(".")) return;

    try {
      setFileContent("Loading file content...");

      const token = await getAuth().currentUser?.getIdToken();
      const res = await fetch(
        `/api/projects/${projectId}/file-content?path=${encodeURIComponent(path)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await res.json();

      setFileContent(data.content || "Unable to load file.");
    } catch (err) {
      console.error("File load error", err);
      setFileContent("Error loading file.");
    }
  };

  return {
    selectedPath,
    setSelectedPath,
    fileContent,
    setFileContent,
    handleFileClick,
  };
}
