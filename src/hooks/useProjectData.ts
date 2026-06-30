import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { useProject } from "@/context/ProjectContext";

export function useProjectData(projectId: string) {
  const { project, setProject } = useProject();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!projectId) return;

    const loadProject = async () => {
      try {
        const token = await getAuth().currentUser?.getIdToken();

        const res = await fetch(`/api/project?id=${projectId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();

        if (data) {
          setProject(data);
          setIsLoaded(true);
        }
      } catch (err) {
        console.error("Failed to load project", err);
      }
    };

    loadProject();
  }, [projectId]);

  return {
    project,
    setProject,
    isLoaded,
  };
}
