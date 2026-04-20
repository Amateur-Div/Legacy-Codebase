"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.injectSchemaNodes = injectSchemaNodes;
function injectSchemaNodes(merged, fileTree) {
    const { mergedNodes, mergedEdges } = merged;
    const existingIds = new Set(mergedNodes.map((n) => n.id));
    const collect = (nodes) => {
        var _a;
        for (const node of nodes) {
            if (node.type === "file" && ((_a = node.schemas) === null || _a === void 0 ? void 0 : _a.length)) {
                const fileRootId = `file::${node.fullPath}`;
                for (const schema of node.schemas) {
                    const schemaId = `schema::${schema.framework}::${schema.name}`;
                    if (!existingIds.has(schemaId)) {
                        mergedNodes.push({
                            id: schemaId,
                            type: "schema",
                            name: schema.name,
                            file: node.fullPath,
                            meta: {
                                framework: schema.framework,
                            },
                        });
                        existingIds.add(schemaId);
                    }
                    mergedEdges.push({
                        id: `schema-def::${fileRootId}->${schemaId}`,
                        from: fileRootId,
                        to: schemaId,
                        label: "definesSchema",
                    });
                }
            }
            if (node.children)
                collect(node.children);
        }
    };
    collect(fileTree);
    return { mergedNodes, mergedEdges };
}
