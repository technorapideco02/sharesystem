import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Device from "@/models/Device";
import Signal from "@/models/Signal";

export async function POST(req: Request) {
  try {
    const { deviceId, deviceName, email } = await req.json();

    if (!deviceId || !deviceName || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await connectToDatabase();

    // 1. Update heartbeat timestamp for this device by email and deviceName to prevent duplicates
    await Device.findOneAndUpdate(
      { email: email.toLowerCase(), deviceName },
      {
        deviceId,
        lastActive: new Date(),
      },
      { upsert: true }
    );

    // 2. Fetch all registered devices for this user's email, sorted by lastActive descending
    const allDevices = await Device.find({ email: email.toLowerCase() })
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

    // 3. Map devices with online status (online if active in the last 15 seconds)
    const now = Date.now();
    const mappedDevices = uniqueDevices.map((dev: any) => {
      const lastActiveTime = new Date(dev.lastActive).getTime();
      const isOnline = now - lastActiveTime < 15000; // 15 seconds threshold
      return {
        deviceId: dev.deviceId,
        deviceName: dev.deviceName,
        email: dev.email,
        isOnline,
      };
    });

    // 4. Retrieve pending signaling messages for this device
    const pendingSignals = await Signal.find({ targetDeviceId: deviceId });

    // 5. Delete the retrieved signals so they are only processed once
    if (pendingSignals.length > 0) {
      await Signal.deleteMany({ targetDeviceId: deviceId });
    }

    return NextResponse.json(
      {
        devices: mappedDevices,
        signals: pendingSignals,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Polling error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
