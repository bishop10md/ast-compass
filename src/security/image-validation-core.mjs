const supportedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const supportedExtensions = /\.(?:jpe?g|png|webp)$/i;

export async function validateAstImageFile(file) {
  if (!file || typeof file.arrayBuffer !== "function") return { valid: false, reason: "missing" };
  if (file.size > 10 * 1024 * 1024) return { valid: false, reason: "size" };
  if (!supportedMimeTypes.has(String(file.type).toLowerCase()) || !supportedExtensions.test(String(file.name))) return { valid: false, reason: "format" };
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const jpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  const webp = bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  const signatureMatchesMime = file.type === "image/jpeg" ? jpeg : file.type === "image/png" ? png : webp;
  return signatureMatchesMime ? { valid: true, reason: null } : { valid: false, reason: "signature" };
}
