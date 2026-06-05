"use client";

import React, { useState, useEffect, useRef } from "react";

// Types
interface OnlineDevice {
  deviceId: string;
  deviceName: string;
  socketId: string;
}

interface UserSession {
  email: string;
  deviceId: string;
  deviceName: string;
}

type UIState = "LOADING" | "AUTH" | "VERIFY_OTP" | "DASHBOARD";
type AuthMode = "LOGIN" | "REGISTER";
type TransferState = "IDLE" | "WAITING_APPROVAL" | "NEGOTIATING" | "TRANSFERRING" | "SUCCESS" | "ERROR" | "REJECTED";

// Inline SVG Icon Helpers (replacing emojis)
const PhoneIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
    <line x1="12" y1="18" x2="12.01" y2="18" />
  </svg>
);

const ComputerIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

const LargeDevicesIcon = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 0.75rem", color: "#a0aec0" }}>
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
    <line x1="12" y1="18" x2="12.01" y2="18" />
  </svg>
);

const PortalPlaceholderIcon = () => (
  <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="var(--brand-plum-light)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: "1.25rem", opacity: 0.6 }}>
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
    <circle cx="12" cy="10" r="2" />
  </svg>
);

const CloudUploadIcon = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--brand-plum-light)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: "0.75rem" }}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const FileIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--brand-plum-light)", display: "block" }}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const ClockIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--brand-plum-light)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 1rem" }}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const SyncIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--brand-plum-light)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 1rem" }}>
    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
  </svg>
);

const LightningIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--brand-plum-light)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 1rem" }}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const CheckIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 1rem" }}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const AlertIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 1rem" }}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

export default function Home() {
  // Client Init
  const [uiState, setUiState] = useState<UIState>("LOADING");
  const [authMode, setAuthMode] = useState<AuthMode>("LOGIN");
  const [user, setUser] = useState<UserSession | null>(null);
  const [token, setToken] = useState<string>("");
  const [deviceId, setDeviceId] = useState<string>("");
  const [detectedDeviceName, setDetectedDeviceName] = useState<string>("");

  // Auth Forms
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [toast, setToast] = useState<{ message: string; isError: boolean } | null>(null);

  // Dashboard state
  const [onlineDevices, setOnlineDevices] = useState<OnlineDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<OnlineDevice | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // P2P / Transfer States
  const [transferState, setTransferState] = useState<TransferState>("IDLE");
  const [transferProgress, setTransferProgress] = useState(0);
  const [transferFileMeta, setTransferFileMeta] = useState<{ name: string; size: number } | null>(null);
  const [transferDeviceName, setTransferDeviceName] = useState("");
  const [isIncoming, setIsIncoming] = useState(false);

  // WebRTC & WebSocket Refs
  const socketRef = useRef<WebSocket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const receivedChunksRef = useRef<ArrayBuffer[]>([]);
  const receivedBytesRef = useRef<number>(0);
  const incomingRequestRef = useRef<{ senderDeviceId: string; fileName: string; fileSize: number; fileType: string } | null>(null);

  // 1. Detect Device & LocalStorage UUID
  useEffect(() => {
    // Generate or get device UUID
    let id = localStorage.getItem("sharesystem_device_id");
    if (!id) {
      id = "dev_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem("sharesystem_device_id", id);
    }
    setDeviceId(id);

    // Guess Device Name
    const ua = navigator.userAgent;
    let name = "Web Browser";
    if (/iPhone/i.test(ua)) name = "iPhone";
    else if (/iPad/i.test(ua)) name = "iPad";
    else if (/Android/i.test(ua)) name = "Android Device";
    else if (/Macintosh/i.test(ua)) name = "Mac";
    else if (/Windows/i.test(ua)) name = "Windows PC";
    else if (/Linux/i.test(ua)) name = "Linux Device";

    setDetectedDeviceName(name);
    setDeviceName(name);

    // Check Active Session
    checkSession();
  }, []);

  // Toast auto-dismiss
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Show Toast Helper
  const showToast = (message: string, isError = false) => {
    setToast({ message, isError });
  };

  const [allDevices, setAllDevices] = useState<any[]>([]);

  // Fetch registered devices when dashboard becomes active
  useEffect(() => {
    if (uiState === "DASHBOARD") {
      fetchDevices();
    }
  }, [uiState]);

  const fetchDevices = async () => {
    try {
      const res = await fetch("/api/devices");
      if (res.ok) {
        const data = await res.json();
        setAllDevices(data.devices);
      }
    } catch (err) {
      console.error("Error fetching devices:", err);
    }
  };

  // Check Session API
  const checkSession = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setToken(data.token);
        setUiState("DASHBOARD");
      } else {
        setUiState("AUTH");
      }
    } catch (err) {
      setUiState("AUTH");
    }
  };

  // Sign Up / Register Submit
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (res.ok) {
        showToast("OTP code sent to your email!");
        setUiState("VERIFY_OTP");
      } else {
        setErrorMsg(data.error || "Registration failed");
      }
    } catch (err) {
      setErrorMsg("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // OTP Verification Submit
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          otp,
          deviceId,
          deviceName: deviceName || detectedDeviceName,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        showToast("Email verified and device registered!");
        setUser(data.device ? { email: data.user.email, deviceId: data.device.deviceId, deviceName: data.device.deviceName } : null);
        setToken(data.token);
        setUiState("DASHBOARD");
      } else {
        setErrorMsg(data.error || "Verification failed");
      }
    } catch (err) {
      setErrorMsg("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Login Submit
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          deviceId,
          deviceName: deviceName || detectedDeviceName,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        showToast("Logged in successfully!");
        setUser({ email: data.user.email, deviceId: data.device.deviceId, deviceName: data.device.deviceName });
        setToken(data.token);
        setUiState("DASHBOARD");
      } else {
        setErrorMsg(data.error || "Login failed");
      }
    } catch (err) {
      setErrorMsg("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      // Reset state
      setUser(null);
      setToken("");
      setOnlineDevices([]);
      setSelectedDevice(null);
      setSelectedFile(null);
      if (socketRef.current) socketRef.current.close();
      setUiState("AUTH");
      showToast("Logged out successfully");
    } catch (err) {
      showToast("Logout failed", true);
    }
  };

  // 2. WebSocket Signaling & WebRTC Setup
  useEffect(() => {
    if (uiState !== "DASHBOARD" || !token || !user) return;

    // Connect dynamically to the server hosting port 3001
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.hostname;
    const wsUrl = `${protocol}//${host}:3001?token=${encodeURIComponent(token)}&deviceId=${encodeURIComponent(user.deviceId)}`;

    console.log("[Client] Connecting to signaling:", wsUrl);
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log("[Client] Connected to signaling server");
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleSignalingMessage(message);
      } catch (err) {
        console.error("[Client] Error parsing message:", err);
      }
    };

    ws.onclose = (event) => {
      console.log("[Client] Signaling server disconnected:", event.reason);
      // Try to reconnect in 5 seconds if still on Dashboard
      setTimeout(() => {
        if (uiState === "DASHBOARD" && (!socketRef.current || socketRef.current.readyState === WebSocket.CLOSED)) {
          checkSession(); // Validate session and reconnect
        }
      }, 5000);
    };

    return () => {
      ws.close();
      cleanupTransfer();
    };
  }, [uiState, token]);

  // Handle Signaling Packets
  const handleSignalingMessage = async (msg: any) => {
    const { type, senderDeviceId, senderDeviceName, payload } = msg;

    switch (type) {
      case "devices-update":
        setOnlineDevices(payload.devices);
        fetchDevices();
        break;

      case "transfer-request":
        console.log("[Client] Incoming transfer request from:", senderDeviceName);
        incomingRequestRef.current = {
          senderDeviceId,
          fileName: payload.fileName,
          fileSize: payload.fileSize,
          fileType: payload.fileType,
        };
        setTransferFileMeta({ name: payload.fileName, size: payload.fileSize });
        setTransferDeviceName(senderDeviceName);
        setIsIncoming(true);
        setTransferState("WAITING_APPROVAL");
        break;

      case "transfer-rejected":
        console.log("[Client] Transfer rejected by recipient");
        setTransferState("REJECTED");
        showToast("Transfer rejected by recipient.", true);
        setTimeout(resetTransferUI, 3000);
        break;

      case "transfer-accepted":
        console.log("[Client] Transfer accepted, initiating WebRTC offer");
        setTransferState("NEGOTIATING");
        initiateWebRTCOffer(senderDeviceId);
        break;

      case "webrtc-offer":
        console.log("[Client] Received WebRTC offer, answering...");
        handleWebRTCOffer(senderDeviceId, payload.sdp);
        break;

      case "webrtc-answer":
        console.log("[Client] Received WebRTC answer, finalizing...");
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        }
        break;

      case "ice-candidate":
        console.log("[Client] Received ICE candidate");
        if (peerConnectionRef.current && payload.candidate) {
          try {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } catch (e) {
            console.error("[Client] Error adding ICE candidate:", e);
          }
        }
        break;

      case "transfer-error":
        showToast(payload.message, true);
        setTransferState("ERROR");
        setTimeout(resetTransferUI, 3000);
        break;

      default:
        break;
    }
  };

  // Helper to send message via WebSocket
  const sendSignal = (type: string, targetDeviceId: string, payload: any = {}) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type,
        targetDeviceId,
        payload,
      }));
    }
  };

  // 3. P2P WebRTC Transfer Handlers

  // Reset transfer and clean WebRTC structures
  const cleanupTransfer = () => {
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    receivedChunksRef.current = [];
    receivedBytesRef.current = 0;
  };

  const resetTransferUI = () => {
    cleanupTransfer();
    setSelectedFile(null);
    setTransferState("IDLE");
    setTransferProgress(0);
    setTransferFileMeta(null);
    setTransferDeviceName("");
    setIsIncoming(false);
    incomingRequestRef.current = null;
  };

  // Start file transfer request immediately
  const startFileTransfer = (file: File, device: any) => {
    if (!device || !file) return;

    // Check if device is online
    const isDeviceOnline = onlineDevices.some((d) => d.deviceId === device.deviceId);
    if (!isDeviceOnline) {
      showToast(`Cannot transfer: "${device.deviceName}" is offline`, true);
      return;
    }

    setTransferFileMeta({ name: file.name, size: file.size });
    setTransferDeviceName(device.deviceName);
    setIsIncoming(false);
    setTransferState("WAITING_APPROVAL");

    // Send transfer request signal via WS
    sendSignal("transfer-request", device.deviceId, {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });
  };

  // Recipient Accepts Transfer
  const handleAcceptTransfer = () => {
    if (!incomingRequestRef.current) return;
    setTransferState("NEGOTIATING");
    // Send acceptance to sender
    sendSignal("transfer-accepted", incomingRequestRef.current.senderDeviceId);
  };

  // Recipient Rejects Transfer
  const handleRejectTransfer = () => {
    if (!incomingRequestRef.current) return;
    sendSignal("transfer-rejected", incomingRequestRef.current.senderDeviceId);
    resetTransferUI();
  };

  // Sender initiates WebRTC
  const initiateWebRTCOffer = async (recipientId: string) => {
    if (!selectedFile) return;

    cleanupTransfer();

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    peerConnectionRef.current = pc;

    // Create Data Channel
    const dc = pc.createDataChannel("file-transfer", { ordered: true });
    dataChannelRef.current = dc;

    setupSenderDataChannel(dc);

    // ICE Candidate handler
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal("ice-candidate", recipientId, { candidate: event.candidate });
      }
    };

    // Create SDP Offer
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendSignal("webrtc-offer", recipientId, { sdp: offer });
    } catch (err) {
      console.error("[Client] Error creating offer:", err);
      setTransferState("ERROR");
    }
  };

  // Recipient handles WebRTC Offer
  const handleWebRTCOffer = async (senderId: string, sdp: any) => {
    cleanupTransfer();

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    peerConnectionRef.current = pc;

    // ICE Candidate handler
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal("ice-candidate", senderId, { candidate: event.candidate });
      }
    };

    // Listen for data channel
    pc.ondatachannel = (event) => {
      const dc = event.channel;
      dataChannelRef.current = dc;
      setupRecipientDataChannel(dc);
    };

    // Set Remote Description and Create Answer
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      sendSignal("webrtc-answer", senderId, { sdp: answer });
    } catch (err) {
      console.error("[Client] Error answering WebRTC:", err);
      setTransferState("ERROR");
    }
  };

  // Setup Sender Data Channel Logic (Sends file)
  const setupSenderDataChannel = (dc: RTCDataChannel) => {
    dc.onopen = () => {
      console.log("[WebRTC] Data channel open! Starting file send.");
      setTransferState("TRANSFERRING");
      sendFileChunks();
    };

    dc.onclose = () => {
      console.log("[WebRTC] Data channel closed");
    };

    dc.onerror = (err) => {
      console.error("[WebRTC] Data channel error:", err);
      setTransferState("ERROR");
    };
  };

  // Sender slice-and-send loop with backpressure
  const sendFileChunks = () => {
    const file = selectedFile;
    const dc = dataChannelRef.current;
    if (!file || !dc) return;

    const CHUNK_SIZE = 16384; // 16KB
    let offset = 0;
    const reader = new FileReader();

    const readSlice = (o: number) => {
      const slice = file.slice(o, o + CHUNK_SIZE);
      reader.readAsArrayBuffer(slice);
    };

    reader.onload = (e) => {
      if (!e.target || !e.target.result) return;
      const buffer = e.target.result as ArrayBuffer;

      try {
        dc.send(buffer);
        offset += buffer.byteLength;
        const progress = Math.round((offset / file.size) * 100);
        setTransferProgress(progress);

        if (offset < file.size) {
          // Prevent buffer bloat
          if (dc.bufferedAmount > 1048576) { // 1MB buffer limit
            dc.onbufferedamountlow = () => {
              dc.onbufferedamountlow = null;
              readSlice(offset);
            };
          } else {
            // Keep sending
            readSlice(offset);
          }
        } else {
          // File fully sent!
          setTransferState("SUCCESS");
          showToast("File sent successfully!");
          setSelectedFile(null);
          // Wait briefly, then close WebRTC
          setTimeout(resetTransferUI, 3000);
        }
      } catch (err) {
        console.error("[WebRTC] Error sending chunk:", err);
        setTransferState("ERROR");
        setTimeout(resetTransferUI, 3000);
      }
    };

    // Start sending first slice
    readSlice(0);
  };

  // Setup Recipient Data Channel Logic (Receives file)
  const setupRecipientDataChannel = (dc: RTCDataChannel) => {
    const meta = incomingRequestRef.current;
    if (!meta) return;

    dc.onopen = () => {
      console.log("[WebRTC] Data channel open! Receiving file...");
      setTransferState("TRANSFERRING");
    };

    dc.onmessage = (event) => {
      const buffer = event.data as ArrayBuffer;
      receivedChunksRef.current.push(buffer);
      receivedBytesRef.current += buffer.byteLength;

      const progress = Math.round((receivedBytesRef.current / meta.fileSize) * 100);
      setTransferProgress(progress);

      if (receivedBytesRef.current >= meta.fileSize) {
        console.log("[WebRTC] File fully received!");
        setTransferState("SUCCESS");
        showToast("File received successfully!");

        // Assemble Blob and trigger auto-download
        const blob = new Blob(receivedChunksRef.current, { type: meta.fileType });
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = meta.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);

        // Reset
        setTimeout(resetTransferUI, 3500);
      }
    };

    dc.onclose = () => {
      console.log("[WebRTC] Data channel closed by peer");
    };

    dc.onerror = (err) => {
      console.error("[WebRTC] Recipient data channel error:", err);
      setTransferState("ERROR");
      setTimeout(resetTransferUI, 3000);
    };
  };

  // Outgoing transfer request trigger
  const handleSendFileClick = () => {
    if (!selectedDevice || !selectedFile) return;

    setTransferFileMeta({ name: selectedFile.name, size: selectedFile.size });
    setTransferDeviceName(selectedDevice.deviceName);
    setIsIncoming(false);
    setTransferState("WAITING_APPROVAL");

    // Send transfer request signal via WS
    sendSignal("transfer-request", selectedDevice.deviceId, {
      fileName: selectedFile.name,
      fileSize: selectedFile.size,
      fileType: selectedFile.type,
    });
  };

  // 4. File Drag and Drop Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      if (selectedDevice) {
        startFileTransfer(file, selectedDevice);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (selectedDevice) {
        startFileTransfer(file, selectedDevice);
      }
    }
  };

  // Formatter utilities
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // 5. Render Loading
  if (uiState === "LOADING") {
    return (
      <div className="auth-wrapper" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center", color: "var(--brand-plum)" }}>
          <div className="brand-circle-logo" style={{ margin: "0 auto 1.5rem" }}>
            <div className="brand-circle-logo-inner">tbs</div>
          </div>
          <h2>Loading ShareSphere...</h2>
        </div>
      </div>
    );
  }

  // 6. Render Authentication / Register / OTP
  if (uiState === "AUTH" || uiState === "VERIFY_OTP") {
    return (
      <div className="auth-split-container">
        {/* Left Panel - Brand info matching the screenshot style */}
        <div className="auth-left-panel">
          <div className="brand-top">
            <img
              src="/tbs.png"
              alt="TBS Logo"
              width={48}
              height={48}
              style={{ borderRadius: "50%", objectFit: "cover" }}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
                const fallback = target.nextSibling as HTMLDivElement;
                if (fallback) fallback.style.display = "flex";
              }}
            />
            <div className="brand-circle-logo" style={{ display: "none" }}>
              <div className="brand-circle-logo-inner">tbs</div>
            </div>
            <span className="brand-text" style={{ marginLeft: "0.5rem" }}>Share System for TBS</span>
          </div>

          <div className="brand-center-text">
            <h1 className="brand-headline">
              Technorapide <em>Business Solution</em>
            </h1>
            <p className="brand-desc">
              Access your secure workspace to transfer files directly across your devices. Direct, P2P, serverless fileshare.
            </p>
          </div>

          <div className="brand-footer">
            © 2026 TBSCRM. Secure Workspace System.
          </div>
        </div>

        {/* Right Panel - Auth Card */}
        <div className="auth-right-panel">
          <div className="auth-card">
            <h1 className="auth-title">
              {uiState === "VERIFY_OTP" ? "Verify OTP" : authMode === "LOGIN" ? "Sign In" : "Sign Up"}
            </h1>
            <p className="auth-subtitle">
              {uiState === "VERIFY_OTP"
                ? "Enter verification code"
                : authMode === "LOGIN"
                ? "Welcome back to your workspace"
                : "Create your secure sharing account"}
            </p>

            {errorMsg && (
              <div style={{ background: "#fff5f5", border: "1px solid #feb2b2", color: "#c53030", padding: "0.75rem 1rem", borderRadius: "8px", fontSize: "0.85rem", marginBottom: "1.25rem", textAlign: "center" }}>
                {errorMsg}
              </div>
            )}

            {uiState === "AUTH" && authMode === "LOGIN" && (
              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label className="form-label">Business Email</label>
                  <input className="form-input" type="email" placeholder="you@domain.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input className="form-input" type="password" placeholder="••••••••" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Device Name (This Device)</label>
                  <input className="form-input" type="text" placeholder={detectedDeviceName} value={deviceName} onChange={(e) => setDeviceName(e.target.value)} />
                </div>
                <button className="btn btn-primary" type="submit" disabled={loading}>
                  {loading ? "Signing In..." : "Sign In"}
                </button>
                <div style={{ textAlign: "center", marginTop: "1rem", fontSize: "0.85rem" }}>
                  <a href="#" className="auth-link" style={{ color: "#718096" }} onClick={(e) => { e.preventDefault(); showToast("Reset password not configured.", true); }}>
                    Forgot password?
                  </a>
                </div>
                <div className="auth-footer">
                  Don't have an account?{" "}
                  <a href="#" className="auth-link" onClick={(e) => { e.preventDefault(); setAuthMode("REGISTER"); setErrorMsg(""); }}>
                    Create one
                  </a>
                </div>
              </form>
            )}

            {uiState === "AUTH" && authMode === "REGISTER" && (
              <form onSubmit={handleRegister}>
                <div className="form-group">
                  <label className="form-label">Business Email</label>
                  <input className="form-input" type="email" placeholder="you@domain.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input className="form-input" type="password" placeholder="Min 6 characters" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <button className="btn btn-primary" type="submit" disabled={loading}>
                  {loading ? "Sending OTP..." : "Register & Send OTP"}
                </button>
                <div className="auth-footer">
                  Already have an account?{" "}
                  <a href="#" className="auth-link" onClick={(e) => { e.preventDefault(); setAuthMode("LOGIN"); setErrorMsg(""); }}>
                    Sign In
                  </a>
                </div>
              </form>
            )}

            {uiState === "VERIFY_OTP" && (
              <form onSubmit={handleVerifyOtp}>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.25rem", textAlign: "center" }}>
                  We sent a 6-digit OTP to <strong>{email}</strong>. Enter the code below to verify your account and register this device.
                </p>
                <div className="form-group">
                  <label className="form-label">OTP Code</label>
                  <input
                    className="form-input"
                    style={{ textAlign: "center", fontSize: "1.5rem", letterSpacing: "8px", fontWeight: "bold" }}
                    type="text"
                    maxLength={6}
                    pattern="\d{6}"
                    placeholder="000000"
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Device Name (This Device)</label>
                  <input className="form-input" type="text" placeholder={detectedDeviceName} value={deviceName} onChange={(e) => setDeviceName(e.target.value)} />
                </div>
                <button className="btn btn-primary" type="submit" disabled={loading}>
                  {loading ? "Verifying..." : "Verify & Connect"}
                </button>
                <div className="auth-footer">
                  <a href="#" className="auth-link" onClick={(e) => { e.preventDefault(); setUiState("AUTH"); setErrorMsg(""); }}>
                    Back to Sign In
                  </a>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Global Toast */}
        {toast && (
          <div className={`toast ${toast.isError ? "toast-error" : "toast-success"}`}>
            <span>{toast.message}</span>
          </div>
        )}
      </div>
    );
  }

  // 7. Render Dashboard
  return (
    <div className="app-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="user-badge">
          <img
            src="/tbs.png"
            alt="TBS Logo"
            width={36}
            height={36}
            style={{ borderRadius: "50%", objectFit: "cover" }}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
              const fallback = target.nextSibling as HTMLDivElement;
              if (fallback) fallback.style.display = "flex";
            }}
          />
          <div className="avatar" style={{ display: "none" }}>
            {user?.email?.substring(0, 2).toUpperCase() || "SS"}
          </div>
          <div className="user-info">
            <span className="user-email">{user?.email || ""}</span>
            <span className="device-name">Share System for TBS | Device: <strong>{user?.deviceName || ""}</strong></span>
          </div>
        </div>
        <div>
          <button className="btn btn-secondary" style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* Grid */}
      <div className="dashboard-grid">
        {/* Left Side: Devices list */}
        <aside className="card">
          <h2 className="card-title">
            <span>My Devices</span>
            <span style={{ fontSize: "0.75rem", fontWeight: "normal", color: "var(--text-muted)" }}>
              {onlineDevices.length} online
            </span>
          </h2>

          <div className="devices-list">
            {allDevices.filter(d => d.deviceId !== user?.deviceId).length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem 0", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                <LargeDevicesIcon />
                <div>No other devices registered yet. Log in on your other systems.</div>
              </div>
            ) : (
              allDevices
                .filter(d => d.deviceId !== user?.deviceId)
                .map((dev) => {
                  const isOnline = onlineDevices.some((d) => d.deviceId === dev.deviceId);
                  return (
                    <div
                      key={dev.deviceId}
                      className={`device-item ${selectedDevice?.deviceId === dev.deviceId ? "active-target" : ""}`}
                      onClick={() => setSelectedDevice(dev)}
                    >
                      <div className="device-details" style={{ opacity: isOnline ? 1 : 0.6 }}>
                        <span className="device-icon-wrapper">
                          {dev.deviceName.toLowerCase().includes("iphone") || dev.deviceName.toLowerCase().includes("android") ? <PhoneIcon /> : <ComputerIcon />}
                        </span>
                        <div style={{ display: "flex", flexDirection: "column", maxWidth: "180px", overflow: "hidden" }}>
                          <span style={{ fontWeight: 600, fontSize: "0.9rem", color: isOnline ? "#2d3748" : "#718096", textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden" }}>
                            {dev.deviceName}
                          </span>
                          <span style={{ fontSize: "0.7rem", color: "#a0aec0", textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden" }}>
                            {dev.email}
                          </span>
                          <span style={{ fontSize: "0.65rem", fontWeight: "bold", color: isOnline ? "var(--success)" : "var(--text-muted)", marginTop: "1px" }}>
                            {isOnline ? "Online" : "Offline"}
                          </span>
                        </div>
                      </div>
                      <span className={`device-status ${isOnline ? "online" : ""}`}></span>
                    </div>
                  );
                })
            )}
          </div>
        </aside>

        {/* Right Side: Share Panel */}
        <main className="card share-panel">
          {!selectedDevice ? (
            <div style={{ textAlign: "center", color: "var(--text-muted)", maxWidth: "320px", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <PortalPlaceholderIcon />
              <h3 style={{ color: "#2d3748", marginBottom: "0.5rem" }}>Select a device</h3>
              <p style={{ fontSize: "0.9rem" }}>Choose one of your active online devices from the sidebar to begin direct WebRTC file transfer.</p>
            </div>
          ) : (
            <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <h3 style={{ marginBottom: "1.5rem", color: "#2d3748" }}>
                Send to <strong>{selectedDevice.deviceName}</strong>
              </h3>

              {!onlineDevices.some(d => d.deviceId === selectedDevice.deviceId) ? (
                <div style={{ textAlign: "center", padding: "2.5rem 1.5rem", color: "var(--text-muted)", border: "2px dashed #cbd5e0", borderRadius: "8px", width: "100%", maxWidth: "500px", background: "#f8f9fa", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "0.25rem" }}>😴</div>
                  <h4 style={{ color: "#4a5568", marginBottom: "0.25rem", fontWeight: "600" }}>Device Offline</h4>
                  <p style={{ fontSize: "0.8rem", maxWidth: "320px", lineHeight: "1.5" }}>
                    To send files, please make sure <strong>{selectedDevice.deviceName}</strong> is logged in and online.
                  </p>
                </div>
              ) : (
                <div
                  className={`dropzone ${dragActive ? "drag-active" : ""}`}
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById("fileElem")?.click()}
                >
                  <input type="file" id="fileElem" className="file-input" onChange={handleFileChange} />
                  <CloudUploadIcon />
                  <span className="dropzone-text">Drag & drop your file here</span>
                  <span className="dropzone-subtext">or click to browse your local device files</span>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Outgoing & Incoming Transfer Modal */}
      {transferState !== "IDLE" && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h2 className="modal-title">
              {isIncoming ? "Incoming File Transfer" : "P2P File Transfer"}
            </h2>
            <div className="modal-body">
              <div style={{ margin: "1rem auto", display: "flex", justifyContent: "center" }}>
                {transferState === "WAITING_APPROVAL" ? <ClockIcon /> :
                 transferState === "NEGOTIATING" ? <SyncIcon /> :
                 transferState === "TRANSFERRING" ? <LightningIcon /> :
                 transferState === "SUCCESS" ? <CheckIcon /> :
                 transferState === "REJECTED" ? <AlertIcon /> : <AlertIcon />}
              </div>

              {transferFileMeta && (
                <div style={{ marginBottom: "1rem" }}>
                  <div style={{ fontWeight: "bold", fontSize: "1.05rem", wordBreak: "break-all" }}>
                    {transferFileMeta.name}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                    Size: {formatBytes(transferFileMeta.size)}
                  </div>
                </div>
              )}

              {/* Status explanation */}
              <div style={{ fontSize: "0.95rem", fontWeight: "500", marginTop: "1rem" }}>
                {transferState === "WAITING_APPROVAL" && (
                  isIncoming
                    ? `"${transferDeviceName}" wants to send you a file.`
                    : `Waiting for "${transferDeviceName}" to approve...`
                )}
                {transferState === "NEGOTIATING" && "Establishing direct P2P link..."}
                {transferState === "TRANSFERRING" && `Transferring... ${transferProgress}%`}
                {transferState === "SUCCESS" && "Transfer complete!"}
                {transferState === "REJECTED" && "The request was rejected."}
                {transferState === "ERROR" && "An error occurred during transfer."}
              </div>

              {/* Progress Bar */}
              {(transferState === "TRANSFERRING" || transferState === "SUCCESS") && (
                <div className="progress-container">
                  <div className="progress-bar-fill" style={{ width: `${transferProgress}%` }}></div>
                </div>
              )}
            </div>

            {/* Modal Controls */}
            <div className="modal-footer">
              {transferState === "WAITING_APPROVAL" && isIncoming && (
                <>
                  <button className="btn btn-secondary" onClick={handleRejectTransfer}>
                    Reject
                  </button>
                  <button className="btn btn-primary" onClick={handleAcceptTransfer}>
                    Accept
                  </button>
                </>
              )}
              
              {transferState === "WAITING_APPROVAL" && !isIncoming && (
                <button className="btn btn-secondary" style={{ width: "100%" }} onClick={resetTransferUI}>
                  Cancel
                </button>
              )}

              {transferState === "TRANSFERRING" && (
                <button className="btn btn-danger" style={{ width: "100%" }} onClick={resetTransferUI}>
                  Cancel Connection
                </button>
              )}

              {(transferState === "SUCCESS" || transferState === "ERROR" || transferState === "REJECTED") && (
                <button className="btn btn-secondary" style={{ width: "100%" }} onClick={resetTransferUI}>
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Global Toast */}
      {toast && (
        <div className={`toast ${toast.isError ? "toast-error" : "toast-success"}`}>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
