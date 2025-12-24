export type FlowNode = {
  id: string;
  type: string;
  name?: string;
  file?: string;
  line?: number;
  code?: string;
  semantic?: {
    complexity?: number;
    importance?: number;
    dead?: boolean;
  };
  meta?: Record<string, any>;
};

export type FlowEdge = {
  id: string;
  from: string;
  to: string;
  label?: string;
};

export type FlowGraph = {
  nodes: FlowNode[];
  edges: FlowEdge[];
  meta?: { file?: string; projectId?: string };
};

export type ProjectFlow = {
  projectId: string;
  version: string;
  files: string[];
  graph: FlowGraph;
  stats?: Record<string, any>;
  createdAt: string;
};
