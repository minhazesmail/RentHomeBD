// Shared provider configuration for every map. CARTO now requires a public,
// domain-restricted key. Without one, retain a usable OSM map in both themes.
export const LIGHT_BASEMAP = {
  url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
};
const cartoKey = process.env.NEXT_PUBLIC_CARTO_BASEMAP_KEY?.trim();

export const DARK_BASEMAP = cartoKey ? {
  url: `https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=${encodeURIComponent(cartoKey)}`,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
} : LIGHT_BASEMAP;
