import mongoose, { Schema } from "mongoose";

const DeviceSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    deviceId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    deviceName: {
      type: String,
      required: true,
      trim: true,
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Device || mongoose.model("Device", DeviceSchema);
