import { NextRequest, NextResponse } from 'next/server';
import { generatePresignedUrl } from '@/lib/s3';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth'; // Ensure we check if user is authed or admin

// Helper function to verify admin basic auth if needed.
function isAdmin(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return false;

  const authMatch = authHeader.match(/^Basic\s+(.*)$/);
  if (!authMatch) return false;

  const credentials = Buffer.from(authMatch[1], 'base64').toString();
  const [username, password] = credentials.split(':');

  return (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  );
}

export async function POST(req: NextRequest) {
  try {
    // Check if the user is authorized either via next-auth or basic auth (admin panel)
    const session = await getServerSession(authOptions);
    const isBasicAuthAdmin = isAdmin(req);

    // For now we assume if they are logged in or admin they can upload.
    // You could adjust authorization rules if needed.
    if (!session && !isBasicAuthAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { key } = await req.json();

    if (!key) {
      return NextResponse.json({ error: 'Missing key parameter' }, { status: 400 });
    }

    const { presignedUrl, publicUrl } = await generatePresignedUrl(key);

    return NextResponse.json({ presignedUrl, publicUrl }, { status: 200 });
  } catch (error: unknown) {
    console.error('Error generating presigned URL:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
