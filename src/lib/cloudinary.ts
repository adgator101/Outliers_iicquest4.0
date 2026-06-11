import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Upload a Buffer to Cloudinary and return the secure URL.
 *
 * @param buffer  Raw image bytes
 * @param folder  Cloudinary folder to place the asset in
 * @param options Additional upload options (resource_type, etc.)
 */
export async function uploadBuffer(
  buffer: Buffer,
  folder = "civicchain",
  options: Record<string, unknown> = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, ...options },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload returned no result"));
        } else {
          resolve(result.secure_url);
        }
      }
    );
    stream.end(buffer);
  });
}

export { cloudinary };
