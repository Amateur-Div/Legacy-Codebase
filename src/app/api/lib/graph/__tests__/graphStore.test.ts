import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUpdateOne = vi.fn();
const mockFindOne = vi.fn();
const mockFind = vi.fn();
const mockCreateIndex = vi.fn();

vi.mock("../../../../../lib/mongoClient", () => {
  return {
    default: Promise.resolve({
      db: () => ({
        collection: () => ({
          updateOne: mockUpdateOne,
          findOne: mockFindOne,
          find: mockFind,
          createIndex: mockCreateIndex,
        }),
      }),
    }),
  };
});

import {
  ensureGraphIndexes,
  saveGraph,
  getGraph,
  listGraphs,
} from "../graphStore";

describe("graphStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a unique index on projectId", async () => {
    await ensureGraphIndexes();

    expect(mockCreateIndex).toHaveBeenCalledWith(
      { projectId: 1 },
      {
        unique: true,
        name: "unique_project_graph",
      },
    );
  });

  it("saves a graph using an atomic upsert", async () => {
    mockUpdateOne.mockResolvedValueOnce({
      acknowledged: true,
      matchedCount: 0,
      modifiedCount: 0,
      upsertedCount: 1,
    });

    const record = {
      nodes: [{ id: "A" }],
      edges: [{ id: "A-B", from: "A", to: "B" }],
      meta: {
        nodeCount: 1,
        edgeCount: 1,
        mode: "execution",
        generatedAt: new Date(),
      },
    };

    await saveGraph("project-1", record, "owner-1");

    expect(mockUpdateOne).toHaveBeenCalledTimes(1);

    const [filter, update, options] = mockUpdateOne.mock.calls[0];

    expect(filter).toEqual({
      projectId: "project-1",
    });

    expect(update.$setOnInsert).toMatchObject({
      projectId: "project-1",
      ownerId: "owner-1",
    });

    expect(update.$set.record).toBe(record);
    expect(update.$set.ownerId).toBe("owner-1");
    expect(update.$set.updatedAt).toBeInstanceOf(Date);

    expect(update.$setOnInsert.createdAt).toBeInstanceOf(Date);

    expect(options).toEqual({
      upsert: true,
    });
  });

  it("does not use insertOne when saving a graph", async () => {
    mockUpdateOne.mockResolvedValueOnce({
      acknowledged: true,
      matchedCount: 1,
      modifiedCount: 1,
      upsertedCount: 0,
    });

    const record = {
      nodes: [],
      edges: [],
      meta: {
        nodeCount: 0,
        edgeCount: 0,
        mode: "execution",
        generatedAt: new Date(),
      },
    };

    await saveGraph("project-1", record, "owner-1");

    expect(mockUpdateOne).toHaveBeenCalledTimes(1);
  });

  it("loads a graph by projectId", async () => {
    const graph = {
      projectId: "project-1",
      ownerId: "owner-1",
      record: {
        nodes: [{ id: "A" }],
        edges: [],
      },
    };

    mockFindOne.mockResolvedValueOnce(graph);

    const result = await getGraph("project-1");

    expect(mockFindOne).toHaveBeenCalledWith({
      projectId: "project-1",
    });

    expect(result).toEqual(graph);
  });

  it("loads a graph scoped to an owner when ownerId is provided", async () => {
    const graph = {
      projectId: "project-1",
      ownerId: "owner-1",
      record: {
        nodes: [],
        edges: [],
      },
    };

    mockFindOne.mockResolvedValueOnce(graph);

    const result = await getGraph("project-1", "owner-1");

    expect(mockFindOne).toHaveBeenCalledWith({
      projectId: "project-1",
      ownerId: "owner-1",
    });

    expect(result).toEqual(graph);
  });

  it("returns null when a graph does not exist", async () => {
    mockFindOne.mockResolvedValueOnce(null);

    const result = await getGraph("missing-project");

    expect(result).toBeNull();
  });

  it("lists graphs ordered by newest first", async () => {
    const toArray = vi.fn().mockResolvedValueOnce([
      {
        projectId: "project-2",
        createdAt: new Date("2026-09-02"),
        updatedAt: new Date("2026-09-02"),
        record: {
          nodes: [{ id: "A" }, { id: "B" }],
          edges: [{ id: "A-B" }],
        },
      },
      {
        projectId: "project-1",
        createdAt: new Date("2026-09-01"),
        record: {
          nodes: [{ id: "A" }],
          edges: [],
        },
      },
    ]);

    mockFind.mockReturnValueOnce({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          toArray,
        }),
      }),
    });

    const result = await listGraphs(10);

    expect(mockFind).toHaveBeenCalledWith({});

    expect(result).toEqual([
      {
        projectId: "project-2",
        createdAt: new Date("2026-09-02"),
        updatedAt: new Date("2026-09-02"),
        nodeCount: 2,
        edgeCount: 1,
      },
      {
        projectId: "project-1",
        createdAt: new Date("2026-09-01"),
        updatedAt: undefined,
        nodeCount: 1,
        edgeCount: 0,
      },
    ]);
  });
});
