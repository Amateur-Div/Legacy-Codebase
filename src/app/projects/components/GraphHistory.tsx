"use client";
import { useEffect, useState } from "react";

export default function GraphHistory({
  projectId,
  onSelect,
}: {
  projectId: any;
  onSelect: any;
}) {
  const [graphs, setGraphs] = useState([]);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/projects/${projectId}/graphs`);
      if (res.ok) {
        const data = await res.json();
        setGraphs(data.graphs);
      }
    }
    load();
  }, [projectId]);

  if (!graphs.length)
    return <p className="text-sm text-gray-500">No previous analyses yet.</p>;

  return (
    <div className="p-2">
      <h2 className="font-semibold text-lg mb-2">Previous Analyses</h2>
      <ul className="space-y-2">
        {graphs.map((g: any) => (
          <li
            key={g._id}
            onClick={() => onSelect(g)}
            className="p-2 border rounded cursor-pointer hover:bg-gray-50"
          >
            <div className="font-medium">{g.name || "Unnamed Run"}</div>
            <div className="text-xs text-gray-500">
              {new Date(g.createdAt).toLocaleString()}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
