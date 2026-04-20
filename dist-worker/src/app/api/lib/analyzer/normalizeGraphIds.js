"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeGraphIds = normalizeGraphIds;
function normalizeGraphIds(g, filePath) {
    let counter = 0;
    const mapping = new Map();
    const nodes = g.nodes.map((n) => {
        const localId = `${filePath}::${n.type}::${counter++}`;
        mapping.set(n.id, localId);
        return { ...n, id: localId, file: filePath };
    });
    const edges = g.edges
        .map((e) => {
        const from = mapping.get(e.from);
        const to = mapping.get(e.to);
        if (!from || !to)
            return null;
        return { id: `${from}->${to}`, from, to, label: e.label };
    })
        .filter(Boolean);
    return { nodes, edges };
}
