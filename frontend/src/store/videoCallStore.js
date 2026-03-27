import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { getSocket } from "../services/chat_service";
import useUserStore from "./useUserStore";

const useVideoCallStore = create(
  subscribeWithSelector((set, get) => ({
    currentCall: null,
    incomingCall: null,
    isCallActive: false,
    callType: "video",

    localStream: null,
    remoteStream: null,

    isVideoEnabled: true,
    isAudioEnabled: true,

    // webRtc
    peerConnection: null,
    iceCandidateQueue: [],

    isCallModelOpen: false,
    callStatus: "idle",

    setCurrentCall: (call) => {
      set({ currentCall: call });
    },

    setIncomingCall: (call) => {
      set({ incomingCall: call });
    },

    setCallActive: (active) => {
      set({ isCallActive: active });
    },

    setCallType: (type) => set({ callType: type }),

    setLocalStream: (stream) => set({ localStream: stream }),
    setRemoteStream: (stream) => set({ remoteStream: stream }),
    setPeerConnection: (pc) => set({ peerConnection: pc }),

    setCallModelOpen: (open) => set({ isCallModelOpen: open }),

    setCallStatus: (status) => set({ callStatus: status }),

    addIceCandidate: (candidate) => {
      const { iceCandidateQueue } = get();
      set({ iceCandidateQueue: [...iceCandidateQueue, candidate] });
    },

    processQueuedIceCandidates: async () => {
      const { peerConnection, iceCandidateQueue } = get();

      if (
        peerConnection &&
        peerConnection.remoteDescription &&
        iceCandidateQueue.length > 0
      ) {
        for (const candidate of iceCandidateQueue) {
          try {
            await peerConnection.addIceCandidate(
              new RTCIceCandidate(candidate),
            );
          } catch (error) {
            console.error("ICE candidate error", error);
          }
        }
        set({ iceCandidateQueue: [] });
      }
    },

    toggleVideo: () => {
      const { localStream, isVideoEnabled } = get();
      if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = !isVideoEnabled;
          set({ isVideoEnabled: !isVideoEnabled });
        }
      }
    },

    toggleAudio: () => {
      const { localStream, isAudioEnabled } = get();
      if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = !isAudioEnabled;
          set({ isAudioEnabled: !isAudioEnabled });
        }
      }
    },

    endCall: () => {
      const { localStream, peerConnection } = get();

      if (localStream) {
        localStream.getTracks().forEach((track) => 
          track.stop()
        );
      }
      if (peerConnection) {
        peerConnection.close();
      }

      set({
        currentCall: null,
        incomingCall: null,
        isCallActive: false,
        callType: null,
        localStream: null,
        remoteStream: null,
        isVideoEnabled: true,
        isAudioEnabled: true,

        // webRtc
        peerConnection: null,
        iceCandidateQueue: [],

        isCallModelOpen: false,
        callStatus: "idle",
      });
    },

    // Inside useVideoCallStore.js -> initiateCall
    initiateCall: (receiverId, receiverName, avatar, callType = "video") => {
      const socket = getSocket();
      const user = useUserStore.getState().user;

      if (!user || !socket) return;

      set({
        currentCall: {
          participantId: receiverId,
          name: receiverName, // Changed from participantName
          avatar: avatar, // Changed from participantAvatar
        },
        callType,
        isCallModelOpen: true,
        callStatus: "calling",
      });

      // Inside your socket initialization logic
      // Inside your socket.on("incoming_call", (data) => { ... })
      socket.on("incoming_call", (data) => {

        setIncomingCall({
          callId: data.callId,
          callerId: data.callerId,
          // MAP THE KEYS HERE:
          name: data.callerName, 
          avatar: data.callerAvatar, 
        });

        setCallModelOpen(true);
        setCallStatus("incoming");
      });
    },

    clearIncomingCall: () => {
      set({ incomingCall: null });
    },
  })),
);

export default useVideoCallStore;
