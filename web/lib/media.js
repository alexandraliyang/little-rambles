/* media — turn a camera or file input into something storable: downscaled and
   re-encoded. Video passes through as a data URL. */
export async function shrink(file, max = 1000, q = 0.72) {
  const data = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
  if (!String(file.type).startsWith("image/")) return { t: "v", d: data };
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = data; });
  const sc = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement("canvas"); c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  return { t: "i", d: c.toDataURL("image/jpeg", q) };
}

