const { WebSocketServer } = require("ws");
const jwt = require("jsonwebtoken");
const url = require("url");

const PORT = process.env.SIGNALING_PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "sharesystem_super_secret_jwt_key_2026";

const wss = new WebSocketServer({ port: PORT });
console.log(`[Signaling] WebSocket server running on port ${PORT}`);

// Map of socket ID to client info: { socket, email, deviceId, deviceName }
const clients = new Map();

wss.on("connection", (socket, req) => {
  const parsedUrl = url.parse(req.url, true);
  const { token, deviceId } = parsedUrl.query;

  if (!token || !deviceId) {
    console.log("[Signaling] Connection rejected: Missing token or deviceId");
    socket.close(4001, "Missing token or deviceId");
    return;
  }

  // Verify JWT
  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    console.log("[Signaling] Connection rejected: Invalid JWT token");
    socket.close(4002, "Invalid token");
    return;
  }

  const { email, deviceName } = decoded;

  // Store client connection
  const socketId = Math.random().toString(36).substring(2, 9);
  const clientInfo = {
    socket,
    socketId,
    email: email.toLowerCase(),
    deviceId,
    deviceName,
  };

  clients.set(socketId, clientInfo);
  console.log(`[Signaling] Device connected: "${deviceName}" (${email}) [ID: ${deviceId}]`);

  // Send welcome message to the client
  sendToSocket(socket, {
    type: "welcome",
    payload: {
      socketId,
      email,
      deviceId,
      deviceName,
    },
  });

  // Notify all devices under this email of updated online list
  broadcastDeviceList(email);

  // Handle incoming messages
  socket.on("message", (messageStr) => {
    try {
      const message = JSON.parse(messageStr);
      handleMessage(clientInfo, message);
    } catch (err) {
      console.error("[Signaling] Error parsing message:", err.message);
    }
  });

  // Handle disconnection
  socket.on("close", () => {
    clients.delete(socketId);
    console.log(`[Signaling] Device disconnected: "${deviceName}" (${email}) [ID: ${deviceId}]`);
    
    // Notify others
    broadcastDeviceList(email);
  });

  socket.on("error", (err) => {
    console.error(`[Signaling] Socket error for ${deviceName}:`, err.message);
  });
});

// Broadcast the list of online devices to everyone registered under this email
function broadcastDeviceList(email) {
  const normalizedEmail = email.toLowerCase();
  
  // Find all online devices for this email
  const onlineDevicesForEmail = [];
  clients.forEach((client) => {
    if (client.email === normalizedEmail) {
      onlineDevicesForEmail.push({
        deviceId: client.deviceId,
        deviceName: client.deviceName,
        socketId: client.socketId,
      });
    }
  });

  // Send the list to all sockets under this email
  clients.forEach((client) => {
    if (client.email === normalizedEmail) {
      sendToSocket(client.socket, {
        type: "devices-update",
        payload: {
          devices: onlineDevicesForEmail.filter(d => d.deviceId !== client.deviceId), // exclude self
        },
      });
    }
  });
}

// Handle message routing
function handleMessage(sender, message) {
  const { type, targetDeviceId, payload } = message;

  if (!targetDeviceId) {
    console.log(`[Signaling] Message ignored: targetDeviceId is missing`);
    return;
  }

  // Find recipient socket
  let recipient = null;
  clients.forEach((client) => {
    if (client.deviceId === targetDeviceId) {
      recipient = client;
    }
  });

  if (!recipient) {
    console.log(`[Signaling] Recipient device ${targetDeviceId} is offline`);
    sendToSocket(sender.socket, {
      type: "transfer-error",
      payload: {
        message: "Target device is offline.",
      },
    });
    return;
  }

  // Security check: ensure sender and recipient have the same email address
  if (sender.email !== recipient.email) {
    console.log(`[Signaling] Security alert: ${sender.email} tried to send signaling to device of ${recipient.email}`);
    return;
  }

  // Relay the message, adding the sender's deviceId and deviceName
  sendToSocket(recipient.socket, {
    type,
    senderDeviceId: sender.deviceId,
    senderDeviceName: sender.deviceName,
    payload,
  });
}

function sendToSocket(socket, data) {
  if (socket.readyState === 1) { // OPEN
    socket.send(JSON.stringify(data));
  }
}
