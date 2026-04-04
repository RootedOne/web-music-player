import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPresignedUploadUrl } from "@/lib/s3";
import crypto from "crypto";
import path from "path";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const basicAuth = req.headers.get("authorization");

    // Check if user is authenticated via NextAuth OR Basic Auth (for Admin panel)
    let isAuthorized = false;

    if (session?.user?.id) {
      isAuthorized = true;
    } else if (basicAuth) {
      const authValue = basicAuth.split(' ')[1];
      const [user, pwd] = atob(authValue).split(':');
      if (user === process.env.ADMIN_USERNAME && pwd === process.env.ADMIN_PASSWORD) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { files } = await req.json();

    if (!files || !Array.isArray(files)) {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    const urls = await Promise.all(
      files.map(async (file: { name: string; type: string }) => {
        const ext = path.extname(file.name).toLowerCase() || (file.type === "image/png" ? ".png" : file.type === "image/jpeg" ? ".jpg" : "");
        const uniqueId = crypto.randomBytes(16).toString("hex");
        const isCover = file.type.startsWith("image/");
        const prefix = isCover ? "cover_" : "";
        const key = `${prefix}${uniqueId}${ext}`;

        const { presignedUrl, publicUrl } = await getPresignedUploadUrl(key, file.type);
        return {
          originalName: file.name,
          presignedUrl,
          publicUrl,
        };
      })
    );

    return NextResponse.json({ urls });
  } catch (error) {
    console.error("Presigned URL Error:", error);
    return NextResponse.json({ error: "Failed to generate presigned URLs" }, { status: 500 });
  }
}
