export type FlowNodeSemantic = {
  complexity?: number;
  importance?: number;
  dead?: boolean;

  connectivity?: {
    inDegree: number;
    outDegree: number;
    totalDegree: number;
    score: number;
  };

  structure?: {
    importCount: number;
    exportCount: number;
    functionCount: number;
    classCount: number;
    componentCount: number;
    apiCount: number;
    schemaCount: number;
    blockCount: number;
  };
};

export type FlowNode = {
  id: string;
  type: string;
  name?: string;
  file?: string;
  line?: number;
  code?: string;
  semantic?: FlowNodeSemantic;
  meta?: Record<string, any>;
};

export type FlowEdge = {
  id: string;
  from: string;
  to: string;
  label?: string;
};

export type GraphIntelligence = {
  deadFiles: string[];
  circularDependencies: string[][];
  importanceRanking: {
    fileId: string;
    score: number;
  }[];
};

export type FlowGraphMeta = {
  file?: string;
  projectId?: string;
  nodeCount?: number;
  edgeCount?: number;
  mode?: string | null;
  generatedAt?: Date;
  intelligence?: GraphIntelligence;
};

export type FlowGraph = {
  nodes: FlowNode[];
  edges: FlowEdge[];
  meta?: FlowGraphMeta;
};

export type ProjectFlow = {
  projectId: string;
  version: string;
  files: string[];
  graph: FlowGraph;
  stats?: Record<string, any>;
  createdAt: string;
};
