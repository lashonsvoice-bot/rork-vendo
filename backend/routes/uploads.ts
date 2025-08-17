import { Hono } from "hono";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

const app = new Hono();

const UPLOADS_DIR = path.join(process.cwd(), "backend", "uploads");
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_MIME_TYPES = {
  images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  documents: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  all: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
};

async function ensureUploadsDir(): Promise<void> {
  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  } catch {}
}

function getFileExtension(mimeType: string): string {
  const extensions: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx'
  };
  return extensions[mimeType] || '';
}

app.post("/upload", async (c) => {
  try {
    await ensureUploadsDir();
    
    const body = await c.req.parseBody();
    const file = body.file as File;
    const fileType = body.type as string || 'all';
    
    if (!file) {
      return c.json({ error: "No file provided" }, 400);
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return c.json({ error: "File too large. Maximum size is 10MB" }, 400);
    }
    
    const allowedTypes = ALLOWED_MIME_TYPES[fileType as keyof typeof ALLOWED_MIME_TYPES] || ALLOWED_MIME_TYPES.all;
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: `File type ${file.type} not allowed for ${fileType}` }, 400);
    }
    
    const fileId = randomUUID();
    const extension = getFileExtension(file.type);
    const fileName = `${fileId}${extension}`;
    const filePath = path.join(UPLOADS_DIR, fileName);
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    await fs.writeFile(filePath, buffer);
    
    const fileUrl = `/api/uploads/files/${fileName}`;
    
    return c.json({
      success: true,
      fileId,
      fileName,
      fileUrl,
      mimeType: file.type,
      size: file.size
    });
  } catch (error) {
    console.error("Upload error:", error);
    return c.json({ error: "Upload failed" }, 500);
  }
});

app.get("/files/:fileName", async (c) => {
  try {
    const fileName = c.req.param("fileName");
    const filePath = path.join(UPLOADS_DIR, fileName);
    
    try {
      await fs.access(filePath);
    } catch {
      return c.json({ error: "File not found" }, 404);
    }
    
    const fileBuffer = await fs.readFile(filePath);
    const extension = path.extname(fileName).toLowerCase();
    
    let mimeType = 'application/octet-stream';
    if (extension === '.jpg' || extension === '.jpeg') mimeType = 'image/jpeg';
    else if (extension === '.png') mimeType = 'image/png';
    else if (extension === '.gif') mimeType = 'image/gif';
    else if (extension === '.webp') mimeType = 'image/webp';
    else if (extension === '.pdf') mimeType = 'application/pdf';
    else if (extension === '.doc') mimeType = 'application/msword';
    else if (extension === '.docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    
    c.header('Content-Type', mimeType);
    c.header('Cache-Control', 'public, max-age=31536000');
    
    return c.body(fileBuffer);
  } catch (error) {
    console.error("File serve error:", error);
    return c.json({ error: "Failed to serve file" }, 500);
  }
});

app.delete("/files/:fileName", async (c) => {
  try {
    const fileName = c.req.param("fileName");
    const filePath = path.join(UPLOADS_DIR, fileName);
    
    try {
      await fs.unlink(filePath);
      return c.json({ success: true, message: "File deleted" });
    } catch {
      return c.json({ error: "File not found" }, 404);
    }
  } catch (error) {
    console.error("Delete error:", error);
    return c.json({ error: "Failed to delete file" }, 500);
  }
});

export default app;