"use client";

import React, { createContext, ReactNode, useContext, useState } from "react";

interface ProjectContextProps {
  project: any;
  setProject: (project: any) => void;
}

const ProjectContext = createContext<ProjectContextProps>({
  project: null,
  setProject() {
    return null;
  },
});

export const useProject = () => useContext(ProjectContext);

export const ProjectProvider = ({ children }: { children: ReactNode }) => {
  const [project, setProject] = useState<any>(null);

  return (
    <ProjectContext.Provider value={{ project, setProject }}>
      {children}
    </ProjectContext.Provider>
  );
};
