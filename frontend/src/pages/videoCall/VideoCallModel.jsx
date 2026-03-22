import React, { useEffect, useMemo, useRef } from "react";
import useVideoCallStore from "../../store/videoCallStore";
import useUserStore from "../../store/useUserStore";
import useThemeStore from "../../store/themeStore";
import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaVideoSlash,
  FaPhoneSlash,
  FaTimes,
  FaVideo,
  FaShieldAlt,
} from "react-icons/fa";

const VideoCallModel = ({ socket }) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const {
    currentCall,
    incomingCall,
    isCallActive,
    localStream,
    callType,
    remoteStream,
    isVideoEnabled,
    isAudioEnabled,
    peerConnection,
    iceCandidateQueue,
    isCallModelOpen,
    callStatus,
    setIncomingCall,
    setCurrentCall,
    setCallType,
    setCallModelOpen,
    endCall,
    setCallStatus,
    setCallActive,
    setLocalStream,
    setRemoteStream,
    setPeerConnection,
    addIceCandidate,
    processQueuedIceCandidates,
    toggleVideo,
    toggleAudio,
    clearIncomingCall,
  } = useVideoCallStore();

  const { user } = useUserStore();
  const { theme } = useThemeStore();

  const rtcConfiguration = {
    iceServers: [
      {
        urls: "stun:stun.1.google.com:19302",
      },
      {
        urls: "stun:stun.1.google.com:19302",
      },
      {
        urls: "stun:stun.1.google.com:19302",
      },
    ],
  };



  //   Memorize display the user info it is prevent the unnessacery render
  const displayInfo = useMemo(() => {
    // If there's an incoming call, use that; otherwise use the active/current call
    const source = incomingCall && !isCallActive ? incomingCall : currentCall;

    return {
      // Check all possible variations just in case
      name:
        source?.name ||
        source?.callerName ||
        source?.participantName ||
        "Unknown User",

      avatar:
        source?.avatar ||
        source?.callerAvatar ||
        source?.participantAvatar ||
        null,
    };

  }, [incomingCall, currentCall, isCallActive]);




  // Connect detection
  useEffect(() => {
    if (peerConnection && remoteStream) {
      console.log("Both peer connection and remote stream is available");
      setCallStatus("connected");
      setCallActive(true);
    }
  }, [peerConnection, remoteStream, setCallStatus, setCallActive]);

  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // intilize media stream

  const initializeMedia = async (video = true) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: video ? { width: 640, height: 480 } : false,
        audio: true,
      });
      console.log("Local media stream", stream.getTracks());
      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.log(error);
      throw error;
    }
  };

  const createPeerConnection = (stream, role) => {
    const pc = new RTCPeerConnection(rtcConfiguration);
    // add a local tracks immediatly
    if (stream) {
      stream.getTracks().forEach((track) => {
        console.log(`${role} adding ${track.kind} track`, track.id.slice(0, 8));
        pc.addTrack(track, stream);
      });
    }
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        const participantId =
          currentCall?.participantId || incomingCall?.callerId;
        const callId = currentCall?.callId || incomingCall?.callId;
        if (participantId && callId) {
          socket.emit("webrtc_ice_candidate", {
            candidate: event.candidate,
            receiverId: participantId,
            callId: callId,
          });
        }
      }
    };
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      } else {
        // If tracks arrive individually, we get the current stream from the store
        const currentRemoteStream = useVideoCallStore.getState().remoteStream;
        const stream = currentRemoteStream || new MediaStream();

        stream.addTrack(event.track);
        setRemoteStream(stream);
      }
    };
    // connection monitor
    pc.onconnectionstatechange = () => {
      console.log(`role: ${role}: connection status: `, pc.connectionState);
      if (pc.connectionState === "failed") {
        setCallStatus("failed");
        setTimeout(handleEndCall, 2000);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`role: ${role}: ICE state `, pc.iceConnectionState);
    };

    pc.onsignalingstatechange = () => {
      console.log(`${role} : Signaling state`, pc.signalingState);
    };

    setPeerConnection(pc);
    return pc;
  };

  //   caller : Initilize call after acceptance
  const initializeCallerCall = async () => {
    try {
      setCallStatus("connecting");
      const stream = await initializeMedia(callType === "video");
      const pc = createPeerConnection(stream, "CALLER");
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === "video",
      });
      await pc.setLocalDescription(offer);
      socket.emit("webrtc_offer", {
        offer,
        receiverId: currentCall?.participantId,
        callId: currentCall?.callId,
      });
    } catch (error) {
      console.log("Caller Error", error);
      setCallStatus("failed");
      setTimeout(handleEndCall, 2000);
    }
  };

  //   Receiver : Asnswer call after acceptance
  const handleAnswerCall = async () => {
    try {
      setCallStatus("connecting");
      const stream = await initializeMedia(callType === "video");
      createPeerConnection(stream, "RECEIVER");
      socket.emit("accept_call", {
        callerId: incomingCall?.callerId,
        callId: incomingCall?.callId,
        receiverInfo: {
          username: user?.username,
          profilePicture: user?.profilePicture,
        },
      });

      setCurrentCall({
        callId: incomingCall?.callId,
        participantId: incomingCall?.callerId,
        participantName: incomingCall?.callerName,
        participantAvatar: incomingCall?.callerAvatar,
      });

      clearIncomingCall();
    } catch (error) {
      console.log("receiver error", error);
      handleEndCall();
    }
  };

  const handleRejectCall = () => {
    if (incomingCall) {
      socket.emit("reject_call", {
        callerId: incomingCall?.callerId,
        callId: incomingCall?.callId,
      });
    }
    endCall();
  };

  const handleSenderRejectCall = () => {
    // 1. Get IDs needed for the socket emit
    const participantId = currentCall?.participantId || incomingCall?.callerId;
    const callId = currentCall?.callId || incomingCall?.callId;

    // 2. Tell the server to tell the receiver to stop ringing
    if (participantId && callId && socket) {
      socket.emit("end_call", {
        callId: callId,
        participantId: participantId,
      });
    }

    // 3. Clean up local state (Stop camera, reset store)
    endCall();
  };

  const handleEndCall = () => {
    // 1. Identify who to tell (the other person)
    const participantId = currentCall?.participantId || incomingCall?.callerId;
    const callId = currentCall?.callId || incomingCall?.callId;

    // 2. Tell the server to tell them to hang up
    if (participantId && callId) {
      socket.emit("end_call", {
        callId: callId,
        participantId: participantId,
      });
    }

    // 3. CRITICAL: Clean up YOUR own screen and camera
    // Make sure 'endCall' is destructured from useVideoCallStore()
    endCall();
  };

  //   socket event listeners
  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleCallAccepted = () => {
      if (currentCall) {
        setTimeout(() => {
          initializeCallerCall();
        }, 500);
      }
    };

    const handleCallRejected = () => {
      setCallStatus("rejected");
      setTimeout(() => {
        endCall();
      }, 2000);
    };

    const handleCallEnded = () => {
      endCall();
    };

    const handleWebRTCOffer = async ({ offer, senderId, callId }) => {
      // 1. Safety check (peerConnection is the object from useVideoCallStore)
      if (!peerConnection) {
        console.error("No peer connection available to handle offer");
        return;
      }

      try {
        // 2. Set the remote description (Handshake step 1)
        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(offer),
        );
        await processQueuedIceCandidates();
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit("webrtc_answer", {
          answer,
          receiverId: senderId,
          callId,
        });

        console.log("Receiver: Answer sent. Waiting for ICE connection...");
      } catch (error) {
        console.error("Receiver offer error:", error);
        // Optional: setCallStatus("failed") here if the handshake fails
      }
    };

    const handleWebRTCAnswer = async ({ answer, senderId, callId }) => {
      if (!peerConnection) return;
      if (peerConnection.signalingState === "closed") {
        console.log("Caller: Peer connection is closed");
        return;
      }

      try {
        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(answer),
        );

        await processQueuedIceCandidates();
        const receivers = peerConnection.getReceivers();
        console.log("Receiver", receivers);
      } catch (error) {
        console.error("caller answer error ", error);
      }
    };

    // Receiver ICE candidates
    const handleWebRTCIceCandidates = async ({ candidate }) => {
      if (peerConnection && peerConnection.signalingState !== "closed") {
        if (peerConnection.remoteDescription) {
          try {
            await peerConnection.addIceCandidate(
              new RTCIceCandidate(candidate),
            );
            console.log("ICE candidate added successfully");
          } catch (error) {
            console.error("Failed to add ICE candidate:", error);
          }
        } else {
          console.log("Remote description not ready, queueing candidate...");
          addIceCandidate(candidate);
        }
      } else {
        console.log("PeerConnection not ready, queueing candidate...");
        addIceCandidate(candidate);
      }
    };

    socket.on("call_accepted", handleCallAccepted);
    socket.on("call_rejected", handleCallRejected);
    socket.on("call_ended", handleCallEnded);
    socket.on("webrtc_offer", handleWebRTCOffer);
    socket.on("webrtc_answer", handleWebRTCAnswer);
    socket.on("webrtc_ice_candidate", handleWebRTCIceCandidates);

    console.log("socekt listeners register");
    return () => {
      socket.off("call_accepted", handleCallAccepted);
      socket.off("call_rejected", handleCallRejected);
      socket.off("call_ended", handleCallEnded);
      socket.off("webrtc_offer", handleWebRTCOffer);
      socket.off("webrtc_answer", handleWebRTCAnswer);
      socket.off("webrtc_ice_candidate", handleWebRTCIceCandidates);
    };
  }, [socket, peerConnection, currentCall, incomingCall, user]);

  if (!isCallModelOpen && !incomingCall) return null;

  const shouldShowActiveCall =
    isCallActive || callStatus === "calling" || callStatus === "connecting";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black75">
      <div
        className={`relative w-full h-full max-w-4xl max-h-3xl rounded-lg overflow-hidden ${theme === "dark" ? "bg-gray-900" : "bg-white"}`}
      >
        {/* Incoming call ui */}
        {incomingCall && !isCallActive && (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <div className="text-center mb-8">
              <div className="w-32 h-32 rounded-full bg-gray-300 mx-auto mb-4 overflow-hidden">
                <img
                  className="w-full h-full object-cover"
                  src={displayInfo?.avatar}
                  alt={displayInfo?.name}
                />
              </div>
              <h2
                className={`text-2xl font-semibold mb-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}
              >
                {displayInfo?.name}
              </h2>
              <p
                className={`text-lg ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}
              >
                Incoming {callType} call...
              </p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={handleRejectCall}
                className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-colors"
              >
                <FaPhoneSlash className="w-6 h-6" />
              </button>
              <button
                onClick={handleAnswerCall}
                className="w-16 h-16 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center text-white transition-colors"
              >
                <FaVideo className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}

        {/* Active call ui */}

        {shouldShowActiveCall && (
          <div className="relative w-full h-full">
            {callType === "video" && (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={`w-full h-full object-cover bg-gray-800 ${remoteStream ? "block" : "hidden"}`}
                src=""
              />
            )}

            {(!remoteStream || callType !== "connected") && (
              <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-32 h-32 rounded-full bg-gray-600 mx-auto mb-4 overflow-hidden">
                    <img
                      src={displayInfo?.avatar}
                      alt={displayInfo?.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-white text-xl">
                    {callStatus === "calling"
                      ? `Calling ${displayInfo?.name}...`
                      : callStatus === "connecting"
                        ? "Connecting..."
                        : callStatus === "connected"
                          ? displayInfo?.name
                          : callStatus === "failed"
                            ? "Connection Failed"
                            : displayInfo?.name}
                  </p>
                </div>
              </div>
            )}
            {/* Local video picture in picture */}
            {callType === "video" && localStream && (
              <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden border-2 border-white">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            {/* Call status */}
            <div className="absolute top-4 left-4">
              <div
                className={`px-4 py-2 rounded-full ${theme === "dark" ? "bg-gray-800/75" : "bg-white/75"} `}
              >
                <p
                  className={`text-sm ${theme === "dark" ? "text-white" : "text-black"}`}
                >
                  {callStatus === "connected" ? "Connected" : callStatus}
                </p>
              </div>
            </div>

            {/* Call controls */}
            <div className="absolute left-1/2 bottom-8 transform -translate-x-1/2">
              <div className="flex space-x-4">
                {callType === "video" && (
                  <button
                    onClick={toggleVideo}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isVideoEnabled ? "bg-gray-600 hover:bg-gray-700 text-white" : "bg-red-500 hover:bg-red-6000 text-white"} `}
                  >
                    {isVideoEnabled ? (
                      <FaVideo className="w-5 h-5" />
                    ) : (
                      <FaVideoSlash className="w-5 h-5" />
                    )}
                  </button>
                )}
                {callType === "video" && (
                  <button
                    onClick={toggleAudio}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isAudioEnabled ? "bg-gray-600 hover:bg-gray-700 text-white" : "bg-red-500 hover:bg-red-6000 text-white"} `}
                  >
                    {isAudioEnabled ? (
                      <FaMicrophone className="w-5 h-5" />
                    ) : (
                      <FaMicrophoneSlash className="w-5 h-5" />
                    )}
                  </button>
                )}
                <button
                  onClick={handleEndCall}
                  className="w-12 h-12 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-colors"
                >
                  <FaPhoneSlash className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
        {callStatus === "calling" && (
          <button
            onClick={handleEndCall}
            className=" absolute top-4 right-4  w-16 h-16 bg-gray-600 hover:bg-gray-700 rounded-full flex items-center justify-center text-white transition-colors"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};
export default VideoCallModel;
