import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";
import Device from "@/models/Device";

export async function POST(req: Request) {
  try {
    const { email, password, deviceId, deviceName } = await req.json();

    if (!email || !password || !deviceId || !deviceName) {
      return NextResponse.json(
        { error: "Email, password, device ID, and device name are required" },
        { status: 400 }
      );
    }

    const emailLower = email.toLowerCase().trim();
    if (!emailLower.endsWith("@technorapide.com") && !emailLower.endsWith("@technorapide.in")) {
      return NextResponse.json(
        { error: "Only @technorapide.com and @technorapide.in email domains are allowed." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 400 }
      );
    }

    if (!user.verified) {
      return NextResponse.json(
        { error: "Account is not verified yet. Please sign up again to verify your email." },
        { status: 400 }
      );
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 400 }
      );
    }

    // Register or update device association by email and deviceName to prevent duplicates
    await Device.findOneAndUpdate(
      { email: email.toLowerCase(), deviceName },
      {
        deviceId,
        lastActive: new Date(),
      },
      { upsert: true, new: true }
    );

    // Create JWT Session Token
    const jwtSecret = process.env.JWT_SECRET || "sharesystem_super_secret_jwt_key_2026";
    const token = jwt.sign(
      {
        email: user.email,
        deviceId,
        deviceName,
      },
      jwtSecret,
      { expiresIn: "30d" }
    );

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    });

    return NextResponse.json(
      {
        message: "Logged in successfully",
        user: {
          email: user.email,
          verified: true,
        },
        device: {
          deviceId,
          deviceName,
        },
        token,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: error.message || "Something went wrong during login" },
      { status: 500 }
    );
  }
}
