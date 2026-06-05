import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";
import Device from "@/models/Device";

export async function POST(req: Request) {
  try {
    const { email, otp, deviceId, deviceName } = await req.json();

    if (!email || !otp || !deviceId || !deviceName) {
      return NextResponse.json(
        { error: "Email, OTP, Device ID, and Device Name are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 400 }
      );
    }

    if (user.verified) {
      return NextResponse.json(
        { error: "User is already verified" },
        { status: 400 }
      );
    }

    // Verify OTP
    if (!user.otp || !user.otpExpires) {
      return NextResponse.json(
        { error: "No OTP request found for this user" },
        { status: 400 }
      );
    }

    if (user.otp !== otp) {
      return NextResponse.json(
        { error: "Invalid OTP code" },
        { status: 400 }
      );
    }

    if (new Date() > user.otpExpires) {
      return NextResponse.json(
        { error: "OTP code has expired" },
        { status: 400 }
      );
    }

    // OTP is valid, mark user as verified
    user.verified = true;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    // Register or update the device by email and deviceName to prevent duplicates
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
        message: "Account verified successfully",
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
    console.error("Verification error:", error);
    return NextResponse.json(
      { error: error.message || "Something went wrong during verification" },
      { status: 500 }
    );
  }
}
