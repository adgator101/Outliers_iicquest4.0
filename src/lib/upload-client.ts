export type UploadFolder = "civicchain/reports" | "civicchain/proofs" | "civicchain/updates";

// Server-proxied upload: browser → our /api/uploads → Cloudinary.
// The API key never touches the browser. Upload happens immediately on file-pick
// so the URL is ready by the time the user hits submit — zero upload wait on submit.

export async function uploadImageViaServer(
  file: File,
  folder: UploadFolder = "civicchain/reports"
): Promise<string> {
  const endpoint =
    folder === "civicchain/proofs" ? "/api/uploads/proof" : "/api/uploads";

  const fd = new FormData();
  // /api/uploads expects "files[]", /api/uploads/proof expects "file"
  if (folder === "civicchain/proofs") {
    fd.append("file", file);
  } else {
    fd.append("files", file);
  }

  const res = await fetch(endpoint, { method: "POST", body: fd });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error ?? "Upload failed"
    );
  }

  const data = (await res.json()) as { urls?: string[]; url?: string };
  const url = data.url ?? data.urls?.[0];
  if (!url) throw new Error("No URL returned from upload");
  return url;
}

// Upload multiple files in parallel through our server.
export async function uploadImagesViaServer(
  files: File[],
  folder: UploadFolder = "civicchain/reports"
): Promise<string[]> {
  // Each file is sent as a single-file request so they all run in parallel.
  return Promise.all(files.map((f) => uploadImageViaServer(f, folder)));
}

// Legacy alias — kept so existing callers don't break.
export const uploadImagesToCloudinary = uploadImagesViaServer;
export const uploadImageToCloudinary = uploadImageViaServer;
