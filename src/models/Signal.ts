import mongoose, { Schema } from "mongoose";

const SignalSchema = new Schema(
  {
    senderDeviceId: {
      type: String,
      required: true,
    },
    senderDeviceName: {
      type: String,
      required: true,
    },
    targetDeviceId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
    },
    payload: {
      type: Schema.Types.Mixed,
      default: {},
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 60, // automatically delete from MongoDB after 60 seconds
    },
  },
  { timestamps: true }
);

export default mongoose.models.Signal || mongoose.model("Signal", SignalSchema);
