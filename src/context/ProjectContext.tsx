"use client";

import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

interface ProjectContextProps {
  ProjectName: string;
}

const ProjectContext = createContext<ProjectContextProps>({
  ProjectName: "",
});

export const useProject = () => useContext(ProjectContext);

export const ProjectProvider = ({ children }: { children: ReactNode }) => {
  const [ProjectName, setProjectName] = useState("");

  useEffect(() => {
    setProjectName("My project!...");
  }, []);

  return (
    <ProjectContext.Provider value={{ ProjectName }}>
      {children}
    </ProjectContext.Provider>
  );
};
