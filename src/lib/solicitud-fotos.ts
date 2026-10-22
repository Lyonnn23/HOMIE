/** Convert stored private paths or legacy Storage URLs to safe bucket paths. */
export function solicitudFotoPath(value: string, storageOrigin: string): string | null {
  let path = value;
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      if (url.origin !== new URL(storageOrigin).origin) return null;
      const prefix = "/storage/v1/object/public/solicitudes/";
      if (!url.pathname.startsWith(prefix)) return null;
      path = decodeURIComponent(url.pathname.slice(prefix.length));
    } catch {
      return null;
    }
  }
  const parts = path.split("/");
  if (parts.length < 2 || parts.some((part) => !part || part === "." || part === "..")
      || /[?#\\]/.test(path)) return null;
  return path;
}