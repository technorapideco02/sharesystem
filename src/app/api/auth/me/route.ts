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
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const jwtSecret = process.env.JWT_SECRET || "sharesystem_super_secret_jwt_key_2026";
    let decoded: any;

    try {
      decoded = jwt.verify(sessionCookie.value, jwtSecret);
    } catch (err) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    if (!decoded || !decoded.email || !decoded.deviceId || !decoded.deviceName) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    await connectToDatabase();

    // Refresh device activity timestamp
    await Device.findOneAndUpdate(
      { deviceId: decoded.deviceId },
      { lastActive: new Date() }
    );

    return NextResponse.json(
      {
        authenticated: true,
        user: {
          email: decoded.email,
          deviceId: decoded.deviceId,
          deviceName: decoded.deviceName,
        },
        token: sessionCookie.value,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Session verification error:", error);
    return NextResponse.json({ authenticated: false, error: "Server error" }, { status: 500 });
  }
}
