import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedId = searchParams.get("id");

    const users = await prisma.user.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        username: true,
        createdAt: true,
        isBanned: true,
      },
    });

    if (requestedId && !users.find((u) => u.id === requestedId)) {
      const specificUser = await prisma.user.findUnique({
        where: { id: requestedId },
        select: {
          id: true,
          username: true,
          createdAt: true,
          isBanned: true,
        },
      });

      if (specificUser) {
        users.unshift(specificUser);
      }
    }

    return NextResponse.json(users);
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, username, password, isBanned } = body;

    if (!id || !username) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const dataToUpdate: { username: string; isBanned: boolean; password?: string } = {
      username,
      isBanned: Boolean(isBanned),
    };

    if (password && password.trim().length > 0) {
      const hashedPassword = await bcrypt.hash(password, 10);
      dataToUpdate.password = hashedPassword;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        username: true,
        createdAt: true,
        isBanned: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Failed to update user:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete user:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}