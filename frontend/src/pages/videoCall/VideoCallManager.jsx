import React, { useCallback, useEffect } from 'react';
import useVideoCallStore from '../../store/videoCallStore';
import useUserStore from "../../store/useUserStore";
import VideoCallModel from './VideoCallModel';

const VideoCallManager = ({ socket }) => {
  const { 
    setIncomingCall, 
    setCurrentCall, 
    setCallType, 
    setCallModelOpen, 
    endCall, 
    setCallStatus 
  } = useVideoCallStore();

  const { user } = useUserStore();

useEffect(() => {
    if (!socket) return;

    const handleIncomingCall = ({ callerId, callerName, callerAvatar, callType, callId }) => {
      setIncomingCall({
        callerId,
        callerName,
        callerAvatar,
        callId
      });

      setCallType(callType);
      setCallModelOpen(true);
      setCallStatus("ringing");
    };

    const handleCallEnded = ({ reason }) => {
      setCallStatus("failed");
      setTimeout(() => {
        endCall();
      }, 2000);
    };


    // Attach listeners
    socket.on("incoming_call", handleIncomingCall);
    socket.on("call_failed", handleCallEnded);

    return () => {
      socket.off("incoming_call", handleIncomingCall);
      socket.off("call_failed", handleCallEnded);
    };

    
  }, [socket, setIncomingCall, setCallType, setCallModelOpen, setCallStatus, endCall]);
  // Memorized function to initiate call
  const initiateCall = useCallback((receiverId, receiverName, receiverAvatar, callType = "video") => {
    if (!user?._id) return;

    const callId = `${user._id}-${receiverId}-${Date.now()}`;

    const callData = {
      callId,
      participantId: receiverId, // Fixed key name for consistency
      participantName: receiverName,
      participantAvatar: receiverAvatar
    };

    setCurrentCall(callData);
    setCallType(callType);
    setCallModelOpen(true);
    setCallStatus("calling");

    socket.emit("initiate_call", {
      callId, // Added callId to signaling
      callerId: user._id,
      receiverId,
      callType,
      callerInfo: {
        username: user.username,
        profilePicture: user.profilePicture
      }
    });
  }, [user, socket, setCurrentCall, setCallType, setCallModelOpen, setCallStatus]);

  // Expose initiateCall via the store or a ref if needed
  useEffect(() => {
    useVideoCallStore.getState().initiateCall = initiateCall;
    
  }, [initiateCall]);

  return <VideoCallModel socket={socket} />;
};

export default VideoCallManager;