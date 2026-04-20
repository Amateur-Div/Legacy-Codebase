"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useMediaQuery = useMediaQuery;
const react_1 = require("react");
function useMediaQuery(query) {
    const [matches, setMatches] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        const media = window.matchMedia(query);
        setMatches(media.matches);
        const listener = () => setMatches(media.matches);
        media.addEventListener("change", listener);
        return () => media.removeEventListener("change", listener);
    }, [query]);
    return matches;
}
