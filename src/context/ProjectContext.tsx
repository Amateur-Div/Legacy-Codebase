"use client";

import React, { createContext, ReactNode, useContext, useState } from "react";

interface ProjectContextProps {
  project: any;
  setProject: (project: any) => void;
  graphData: any;
  setGraphData: (graphData: any) => void;
}

const ProjectContext = createContext<ProjectContextProps>({
  project: null,
  setProject() {
    return null;
  },
  graphData: null,
  setGraphData() {
    return null;
  },
});

export const useProject = () => useContext(ProjectContext);

export const ProjectProvider = ({ children }: { children: ReactNode }) => {
  const [project, setProject] = useState<any>(null);
  const [graphData, setGraphData] = useState(null);

  return (
    <ProjectContext.Provider
      value={{ project, setProject, graphData, setGraphData }}
    >
      {children}
    </ProjectContext.Provider>
  );
};
