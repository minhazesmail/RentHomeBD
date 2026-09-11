import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const sourcePath = path.join(root, "src/lib/public-media.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  fileName: sourcePath,
});
const module = { exports: {} };
new Function("exports", "module", "URL", compiled.outputText)(module.exports, module, URL);
const { PUBLIC_MEDIA_TTL_SECONDS, PUBLIC_MEDIA_REFRESH_MS, publicMediaRefreshIsBeforeExpiry, storagePathFromSignedUrl } = module.exports;

if (PUBLIC_MEDIA_TTL_SECONDS !== 300) throw new Error(`Unexpected public media TTL: ${PUBLIC_MEDIA_TTL_SECONDS}`);
if (!publicMediaRefreshIsBeforeExpiry() || PUBLIC_MEDIA_REFRESH_MS >= PUBLIC_MEDIA_TTL_SECONDS * 1000) {
  throw new Error("Public media refresh must happen before signed URLs expire.");
}
const samplePath = "owner-id/property-id/photo.jpg";
const sampleUrl = `https://example.supabase.co/storage/v1/object/sign/property-media/${samplePath}?token=abc`;
if (storagePathFromSignedUrl(sampleUrl) !== samplePath) throw new Error("Signed URL storage-path recovery failed.");

const gallery = fs.readFileSync(path.join(root, "src/components/property-media-gallery.tsx"), "utf8");
const results = fs.readFileSync(path.join(root, "src/components/renter-results-list.tsx"), "utf8");
const hook = fs.readFileSync(path.join(root, "src/hooks/use-renewing-public-media.ts"), "utf8");
if (!gallery.includes("useRenewingPublicMedia") || !gallery.includes("onError")) throw new Error("Property gallery is missing renewal/error recovery.");
if (!results.includes("useRenewingPublicMedia") || !results.includes("onMediaError")) throw new Error("Renter result cards are missing renewal/error recovery.");
if (!hook.includes("createSignedUrls") || !hook.includes("PUBLIC_MEDIA_REFRESH_MS")) throw new Error("Renewal hook does not re-sign media on a schedule.");

console.log("Public media renewal QA passed.");
