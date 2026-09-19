// Presentation state is tab-local and short lived. Search criteria remain in the URL.
export type MapViewport = { center: [number, number]; zoom: number };
export type MapSession = {
  view: "map" | "list";
  sheet: "collapsed" | "partial" | "expanded";
  selectedId: string | null;
  listScroll: number;
  viewport?: MapViewport;
  polygon: [number, number][];
};

const PREFIX = "nearbasha:map:v1:";
function key(path: string) {
  const url = new URL(path, "https://local.invalid");
  url.searchParams.delete("selected");
  url.searchParams.delete("listScroll");
  url.searchParams.sort();
  return PREFIX + url.pathname + "?" + url.searchParams.toString();
}

function point(value: unknown): value is [number, number] {
  return Array.isArray(value) && value.length === 2
    && value.every((coordinate) => typeof coordinate === "number" && Number.isFinite(coordinate))
    && Math.abs(value[0]) <= 90 && Math.abs(value[1]) <= 180;
}

export function readMapSession(path: string): MapSession | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(key(path)) ?? "null");
    if (!value || !Number.isFinite(value.savedAt) || Date.now() - value.savedAt > 30 * 60_000 || value.savedAt > Date.now()
      || !["map", "list"].includes(value.view)
      || !["collapsed", "partial", "expanded"].includes(value.sheet)
      || !Number.isFinite(value.listScroll) || value.listScroll < 0
      || !(value.selectedId === null || typeof value.selectedId === "string")
      || !Array.isArray(value.polygon) || (value.polygon.length > 0 && value.polygon.length < 3)
      || value.polygon.length > 100 || !value.polygon.every(point)) return null;
    if (value.viewport && (!point(value.viewport.center) || !Number.isFinite(value.viewport.zoom)
      || value.viewport.zoom < 0 || value.viewport.zoom > 20)) return null;
    return value;
  } catch { return null; }
}

export function writeMapSession(path: string, value: MapSession) {
  try { sessionStorage.setItem(key(path), JSON.stringify({ ...value, savedAt: Date.now() })); }
  catch { /* Storage can be blocked; shareable URL state still works. */ }
}
