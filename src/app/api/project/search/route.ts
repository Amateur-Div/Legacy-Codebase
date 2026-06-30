import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongoClient";

const MAX_RESULTS = 75;

export async function POST(req: NextRequest) {
  try {
    const { projectId, query } = await req.json();

    if (!projectId || !query?.trim()) {
      return NextResponse.json(
        {
          error: "Missing query or projectId",
        },
        {
          status: 400,
        },
      );
    }

    const normalizedQuery = query.trim().toLowerCase();

    const db = (await clientPromise).db();

    const projectExists = await db.collection("projects").findOne(
      {
        projectId,
      },
      {
        projection: {
          _id: 1,
        },
      },
    );

    if (!projectExists) {
      return NextResponse.json(
        {
          error: "Project not found",
        },
        {
          status: 404,
        },
      );
    }

    const metadataFiles = await db
      .collection("project_files")
      .find({
        projectId,

        $or: [
          {
            "functions.name": {
              $regex: normalizedQuery,
              $options: "i",
            },
          },

          {
            "classes.name": {
              $regex: normalizedQuery,
              $options: "i",
            },
          },

          {
            "exports.name": {
              $regex: normalizedQuery,
              $options: "i",
            },
          },

          {
            "components.name": {
              $regex: normalizedQuery,
              $options: "i",
            },
          },
        ],
      })
      .project({
        path: 1,
        functions: 1,
        classes: 1,
        exports: 1,
        components: 1,
      })
      .limit(25)
      .toArray();

    const matches: any[] = [];

    for (const file of metadataFiles) {
      const symbolGroups = [
        {
          items: file.functions || [],
          type: "function",
        },

        {
          items: file.classes || [],
          type: "class",
        },

        {
          items: file.exports || [],
          type: "export",
        },

        {
          items: file.components || [],
          type: "component",
        },
      ];

      for (const group of symbolGroups) {
        for (const item of group.items) {
          if (item?.name?.toLowerCase().includes(normalizedQuery)) {
            matches.push({
              path: file.path,
              line: item.loc || item.line || 1,
              snippet: item.name,
              type: group.type,
              match: item.name,
            });

            if (matches.length >= MAX_RESULTS) {
              break;
            }
          }
        }

        if (matches.length >= MAX_RESULTS) {
          break;
        }
      }

      if (matches.length >= MAX_RESULTS) {
        break;
      }
    }

    if (matches.length < MAX_RESULTS) {
      const textFiles = await db
        .collection("project_files")
        .find({
          projectId,

          content: {
            $exists: true,
            $ne: "",
          },

          $text: {
            $search: normalizedQuery,
          },
        })
        .project({
          path: 1,
          content: 1,

          score: {
            $meta: "textScore",
          },
        })
        .sort({
          score: {
            $meta: "textScore",
          },
        })
        .limit(25)
        .toArray();

      for (const file of textFiles) {
        if (!file.content) continue;

        const lines = file.content.split("\n");

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];

          if (line.toLowerCase().includes(normalizedQuery)) {
            matches.push({
              path: file.path,
              line: i + 1,
              snippet: line.trim(),
              type: "text",
              match: normalizedQuery,
            });

            if (matches.length >= MAX_RESULTS) {
              break;
            }
          }
        }

        if (matches.length >= MAX_RESULTS) {
          break;
        }
      }
    }

    const deduplicated = [];

    const seen = new Set();

    for (const item of matches) {
      const key = `${item.path}|${item.line}|${item.type}`;

      if (!seen.has(key)) {
        seen.add(key);

        deduplicated.push(item);
      }
    }

    return NextResponse.json({
      results: deduplicated,
    });
  } catch (err) {
    console.error("SEARCH_ERROR:", err);

    return NextResponse.json(
      {
        error: "Internal server error",
      },
      {
        status: 500,
      },
    );
  }
}
