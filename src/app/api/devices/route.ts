import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { connectToDatabase } from "@/lib/db";
import Device from "@/models/Device";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const jwtSecret = process.env.JWT_SECRET || "sharesystem_super_secret_jwt_key_2026";
    let decoded: any;

    try {
      decoded = jwt.verify(sessionCookie.value, jwtSecret);
    } catch (err) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!decoded || !decoded.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    // Retrieve all registered devices in the system
    const devices = await Device.find({}).select(
      "deviceId deviceName email lastActive -_id"
    );

    return NextResponse.json({ devices }, { status: 200 });
  } catch (error: any) {
    console.error("Fetch devices error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
