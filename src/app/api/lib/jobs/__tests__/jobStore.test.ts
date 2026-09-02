import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockUpdateOne, mockFindOne, mockFind, mockDeleteMany, mockDb } =
  vi.hoisted(() => {
    const mockUpdateOne = vi.fn();
    const mockFindOne = vi.fn();
    const mockFind = vi.fn();
    const mockDeleteMany = vi.fn();

    const mockCollection = vi.fn(() => ({
      updateOne: mockUpdateOne,
      findOne: mockFindOne,
      find: mockFind,
      deleteMany: mockDeleteMany,
    }));

    const mockDb = vi.fn(() => ({
      collection: mockCollection,
    }));

    return {
      mockUpdateOne,
      mockFindOne,
      mockFind,
      mockDeleteMany,
      mockCollection,
      mockDb,
    };
  });

vi.mock("../../../../../lib/mongoClient", () => ({
  default: Promise.resolve({
    db: mockDb,
  }),
}));

import {
  saveJob,
  loadJob,
  loadJobForOwner,
  listJobs,
  deleteOldJobs,
  hasProjectFileMetadata,
} from "../jobStore";

describe("jobStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves a job using an atomic upsert", async () => {
    mockUpdateOne.mockResolvedValueOnce({
      acknowledged: true,
      matchedCount: 0,
      modifiedCount: 0,
      upsertedCount: 1,
    });

    const job = {
      id: "job-1",
      projectId: "project-1",
      ownerId: "owner-1",
      status: "running" as const,
      progress: 50,
      message: "Analyzing",
    };

    await saveJob(job);

    expect(mockUpdateOne).toHaveBeenCalledTimes(1);

    const [filter, update, options] = mockUpdateOne.mock.calls[0];

    expect(filter).toEqual({
      id: "job-1",
    });

    expect(update).toEqual({
      $set: {
        projectId: "project-1",
        ownerId: "owner-1",
        status: "running",
        progress: 50,
        message: "Analyzing",
      },
    });

    expect(options).toEqual({
      upsert: true,
    });
  });

  it("loads a job by id", async () => {
    const job = {
      id: "job-1",
      projectId: "project-1",
      ownerId: "owner-1",
      status: "done",
    };

    mockFindOne.mockResolvedValueOnce(job);

    const result = await loadJob("job-1");

    expect(mockFindOne).toHaveBeenCalledWith({
      id: "job-1",
    });

    expect(result).toEqual(job);
  });

  it("returns null when a job does not exist", async () => {
    mockFindOne.mockResolvedValueOnce(null);

    const result = await loadJob("missing-job");

    expect(result).toBeNull();
  });

  it("loads a job scoped to an owner", async () => {
    const job = {
      id: "job-1",
      projectId: "project-1",
      ownerId: "owner-1",
      status: "running",
    };

    mockFindOne.mockResolvedValueOnce(job);

    const result = await loadJobForOwner("job-1", "owner-1");

    expect(mockFindOne).toHaveBeenCalledWith({
      id: "job-1",
      ownerId: "owner-1",
    });

    expect(result).toEqual(job);
  });

  it("returns null when the owner does not match", async () => {
    mockFindOne.mockResolvedValueOnce(null);

    const result = await loadJobForOwner("job-1", "wrong-owner");

    expect(mockFindOne).toHaveBeenCalledWith({
      id: "job-1",
      ownerId: "wrong-owner",
    });

    expect(result).toBeNull();
  });

  it("lists jobs for a project ordered by newest first", async () => {
    const jobs = [
      {
        id: "job-2",
        projectId: "project-1",
        createdAt: new Date("2026-09-02"),
      },
      {
        id: "job-1",
        projectId: "project-1",
        createdAt: new Date("2026-09-01"),
      },
    ];

    const toArray = vi.fn().mockResolvedValueOnce(jobs);
    const limit = vi.fn().mockReturnValue({
      toArray,
    });
    const sort = vi.fn().mockReturnValue({
      limit,
    });

    mockFind.mockReturnValueOnce({
      sort,
    });

    const result = await listJobs("project-1");

    expect(mockFind).toHaveBeenCalledWith({
      projectId: "project-1",
    });

    expect(sort).toHaveBeenCalledWith({
      createdAt: -1,
    });

    expect(limit).toHaveBeenCalledWith(50);

    expect(result).toEqual(jobs);
  });

  it("lists jobs scoped to an owner", async () => {
    const jobs = [
      {
        id: "job-1",
        projectId: "project-1",
        ownerId: "owner-1",
      },
    ];

    const toArray = vi.fn().mockResolvedValueOnce(jobs);

    mockFind.mockReturnValueOnce({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          toArray,
        }),
      }),
    });

    const result = await listJobs("project-1", "owner-1");

    expect(mockFind).toHaveBeenCalledWith({
      projectId: "project-1",
      ownerId: "owner-1",
    });

    expect(result).toEqual(jobs);
  });

  it("deletes jobs older than the requested number of days", async () => {
    mockDeleteMany.mockResolvedValueOnce({
      acknowledged: true,
      deletedCount: 3,
    });

    await deleteOldJobs(7);

    expect(mockDeleteMany).toHaveBeenCalledTimes(1);

    const [filter] = mockDeleteMany.mock.calls[0];

    expect(filter.createdAt.$lt).toBeInstanceOf(Date);

    const cutoff = filter.createdAt.$lt as Date;
    const now = new Date();

    const ageInDays =
      (now.getTime() - cutoff.getTime()) / (1000 * 60 * 60 * 24);

    expect(ageInDays).toBeGreaterThanOrEqual(6.9);
    expect(ageInDays).toBeLessThanOrEqual(7.1);
  });

  it("uses the default seven-day retention period", async () => {
    mockDeleteMany.mockResolvedValueOnce({
      acknowledged: true,
      deletedCount: 0,
    });

    await deleteOldJobs();

    const [filter] = mockDeleteMany.mock.calls[0];

    expect(filter.createdAt.$lt).toBeInstanceOf(Date);

    const cutoff = filter.createdAt.$lt as Date;
    const now = new Date();

    const ageInDays =
      (now.getTime() - cutoff.getTime()) / (1000 * 60 * 60 * 24);

    expect(ageInDays).toBeGreaterThanOrEqual(6.9);
    expect(ageInDays).toBeLessThanOrEqual(7.1);
  });

  it("returns true when project file metadata exists", async () => {
    mockFindOne.mockResolvedValueOnce({
      _id: "file-1",
    });

    const db = mockDb();

    const result = await hasProjectFileMetadata(
      db,
      "project-1",
      "src/index.ts",
    );

    expect(mockFindOne).toHaveBeenCalledWith(
      {
        projectId: "project-1",
        path: "src/index.ts",
      },
      {
        projection: {
          _id: 1,
        },
      },
    );

    expect(result).toBe(true);
  });

  it("returns false when project file metadata does not exist", async () => {
    mockFindOne.mockResolvedValueOnce(null);

    const db = mockDb();

    const result = await hasProjectFileMetadata(
      db,
      "project-1",
      "src/missing.ts",
    );

    expect(mockFindOne).toHaveBeenCalledWith(
      {
        projectId: "project-1",
        path: "src/missing.ts",
      },
      {
        projection: {
          _id: 1,
        },
      },
    );

    expect(result).toBe(false);
  });

  it("only requests the _id field when checking project file metadata", async () => {
    mockFindOne.mockResolvedValueOnce({
      _id: "file-1",
      path: "src/index.ts",
      content: "large content",
    });

    const db = mockDb();

    await hasProjectFileMetadata(db, "project-1", "src/index.ts");

    const [, options] = mockFindOne.mock.calls[0];

    expect(options).toEqual({
      projection: {
        _id: 1,
      },
    });
  });
});
