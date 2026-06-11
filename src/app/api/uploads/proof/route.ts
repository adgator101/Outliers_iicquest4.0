import { NextRequest, NextResponse } from "next/server";
import exifr from "exifr";
import { getCurrentUser } from "@/lib/session";
import { uploadBuffer } from "@/lib/cloudinary";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

// Single-image geotagged proof upload (STORY-012).
// Parses EXIF GPS from the buffer, then uploads to Cloudinary.
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: `Unsupported file type: ${file.type}` }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 8 MB)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Parse EXIF GPS before upload (may be absent — camera/browser dependent).
  let latitude: number | null = null;
  let longitude: number | null = null;
  try {
    const gps = await exifr.gps(buffer);
    if (gps && Number.isFinite(gps.latitude) && Number.isFinite(gps.longitude)) {
      latitude = gps.latitude;
      longitude = gps.longitude;
    }
  } catch {
    // No/unsupported EXIF — fall back to device geolocation on the client.
  }

  const url = await uploadBuffer(buffer, "civicchain/proofs");

  return NextResponse.json({
    url,
    latitude,
    longitude,
    source: latitude != null ? "exif" : "none",
  });
}
