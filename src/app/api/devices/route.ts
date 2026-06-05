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

    // Retrieve all registered devices in the system for this user's email, sorted by lastActive descending
    const allDevices = await Device.find({ email: decoded.email.toLowerCase() })
      .sort({ lastActive: -1 })
      .select("deviceId deviceName email lastActive -_id");

    // Filter duplicates and delete stale records in the background
    const uniqueDevices: any[] = [];
    const seenNames = new Set();
    for (const dev of allDevices) {
      if (!seenNames.has(dev.deviceName)) {
        seenNames.add(dev.deviceName);
        uniqueDevices.push(dev);
      } else {
        // Delete stale duplicate in the background
        Device.deleteOne({ deviceId: dev.deviceId }).catch((err) =>
          console.error("Error deleting stale duplicate:", err)
        );
      }
    }

    return NextResponse.json({ devices: uniqueDevices }, { status: 200 });
  } catch (error: any) {
    console.error("Fetch devices error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
