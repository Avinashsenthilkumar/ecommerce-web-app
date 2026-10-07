import { v2 as cloudinary } from "cloudinary";
import { z } from "zod";
import { ApiError, handle, parseBody } from "@/lib/api";
import { requireRole } from "@/lib/auth";

const uploadSchema = z.object({
  image: z
    .string()
    .trim()
    .min(1)
    .regex(/^data:image\/(?:jpeg|png|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/),
});

const cloudinaryConfig = {
  cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  apiKey: process.env.CLOUDINARY_API_KEY,
  apiSecret: process.env.CLOUDINARY_API_SECRET,
};

if (
  !cloudinaryConfig.cloudName ||
  !cloudinaryConfig.apiKey ||
  !cloudinaryConfig.apiSecret
) {
  console.warn("Cloudinary is not configured. Image uploads will fail.");
} else {
  cloudinary.config({
    cloud_name: cloudinaryConfig.cloudName,
    api_key: cloudinaryConfig.apiKey,
    api_secret: cloudinaryConfig.apiSecret,
    secure: true,
  });
}

export const POST = handle(async (req) => {
  await requireRole(["VENDOR", "ADMIN"], { allowAdmin: false });

  const { image } = await parseBody(req, uploadSchema);

  if (
    !cloudinaryConfig.cloudName ||
    !cloudinaryConfig.apiKey ||
    !cloudinaryConfig.apiSecret
  ) {
    throw new ApiError(500, "Cloudinary configuration is missing.");
  }

  const result = await cloudinary.uploader.upload(image, {
    folder: "ecommerce/products",
    resource_type: "image",
    transformation: [
      { width: 1200, height: 1200, crop: "limit" },
      { quality: "auto:good" },
    ],
  });

  return { url: result.secure_url, publicId: result.public_id };
});

export const dynamic = "force-dynamic";
