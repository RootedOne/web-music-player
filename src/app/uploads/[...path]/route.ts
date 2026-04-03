import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const filename = params.path.join("/");
    const filePath = path.join(process.cwd(), "uploads", filename);

    if (!fs.existsSync(filePath)) {
      return new NextResponse("File not found", { status: 404 });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.get("range");

    let contentType = "application/octet-stream";
    const ext = path.extname(filename).toLowerCase();

    if (ext === ".mp3") contentType = "audio/mpeg";
    else if (ext === ".wav") contentType = "audio/wav";
    else if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
    else if (ext === ".png") contentType = "image/png";
    else if (ext === ".webp") contentType = "image/webp";

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });

      return new NextResponse(fileStream as unknown as ReadableStream, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunksize.toString(),
          "Content-Type": contentType,
        },
      });
    }

    const fileStream = fs.createReadStream(filePath);
    return new NextResponse(fileStream as unknown as ReadableStream, {
      status: 200,
      headers: {
        "Content-Length": fileSize.toString(),
        "Content-Type": contentType,
      },
    });
  } catch (error) {
    console.error("Error serving file:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
