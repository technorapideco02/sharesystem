import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser && existingUser.verified) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Generate 6-digit OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    const hashedPassword = await bcrypt.hash(password, 10);

    if (existingUser) {
      // Update unverified user details
      existingUser.password = hashedPassword;
      existingUser.otp = otp;
      existingUser.otpExpires = otpExpires;
      await existingUser.save();
    } else {
      // Create new unverified user
      const newUser = new User({
        email: email.toLowerCase(),
        password: hashedPassword,
        verified: false,
        otp,
        otpExpires,
      });
      await newUser.save();
    }

    // Configure SMTP transport
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "465"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_MAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    // Send the OTP email
    const mailOptions = {
      from: `"ShareSphere Service" <${process.env.SMTP_MAIL}>`,
      to: email.toLowerCase(),
      subject: "Your ShareSphere Verification OTP Code",
      text: `Welcome to ShareSphere! Your verification OTP code is: ${otp}. It is valid for 10 minutes.`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background: #0c0827; color: #f3f4f6; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
          <h2 style="color: #8b5cf6; text-align: center;">Verify Your Account</h2>
          <p>Thank you for signing up for ShareSphere, your private P2P device sharing portal.</p>
          <p>Please use the following 6-digit One-Time Password (OTP) to complete your registration:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 2.5rem; font-weight: bold; letter-spacing: 6px; padding: 10px 20px; background: rgba(255,255,255,0.05); border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); color: #a78bfa;">${otp}</span>
          </div>
          <p style="color: #9ca3af; font-size: 0.85rem; text-align: center;">This code is valid for 10 minutes. If you did not request this code, you can ignore this email.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json(
      { message: "OTP sent successfully. Please check your email." },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: error.message || "Something went wrong during registration" },
      { status: 500 }
    );
  }
}
