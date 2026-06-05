import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Signal from "@/models/Signal";

export async function POST(req: Request) {
  try {
    const { senderDeviceId, senderDeviceName, targetDeviceId, type, payload } = await req.json();

    if (!senderDeviceId || !senderDeviceName || !targetDeviceId || !type || !payload) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await connectToDatabase();

    // Save signaling message
    const newSignal = new Signal({
      senderDeviceId,
      senderDeviceName,
      targetDeviceId,
      type,
      payload,
    });
    await newSignal.save();

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("Sending signal error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
