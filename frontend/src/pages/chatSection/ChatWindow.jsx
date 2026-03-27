import React, { useEffect, useRef, useState } from "react";
import useThemeStore from "../../store/themeStore";
import useUserStore from "../../store/useUserStore";
import { useChatStore } from "../../store/chatStore";
import { isToday, isYesterday, format } from "date-fns";
import whatsappImage from "../../images/whatsapp_image.png";
import { CiLock } from "react-icons/ci";
import VideoCallManager from "../videoCall/VideoCallManager";

import {
  FaArrowLeft,
  FaEllipsisV,
  FaFile,
  FaImage,
  FaPaperclip,
  FaPaperPlane,
  FaSmile,
  FaTimes,
  FaVideo,
} from "react-icons/fa";
import EmojiPicker from "emoji-picker-react";

import MessageBubble from "./MessageBubble";
import { getSocket } from "../../services/chat_service";
import useVideoCallStore from "../../store/videoCallStore";

const isValidate = (date) => {
  return date instanceof Date && !isNaN(date);
};

const ChatWindow = ({ selectedContact, setSelectedContact }) => {
  const [message, setMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const typingTimeoutRef = useRef(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messageEndRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const fileInputRef = useRef(null);
  const { theme } = useThemeStore();
  const [showFileMenu, setShowFileMenu] = useState(false);
  const { user } = useUserStore();
  const {
    messages,
    sendMessage,
    fetchConversations,
    fetchMessages,
    conversations,
    isUserOnline,
    deleteMessage,
    addReaction,
    startTyping,
    stopTyping,
    isUserTyping,
    getUserLastSeen,
  } = useChatStore();

  const socket = getSocket();

  // const onlineStatus = useChatStore((state) =>
  //   state.onlineUsers.get(selectedContact?._id),
  // );
  const online = isUserOnline(selectedContact?._id)
  const lastSeen= getUserLastSeen(selectedContact?._id);
  const isTyping = isUserTyping(selectedContact?._id);


  // Fetch messages when contact changes
  useEffect(() => {
    if (selectedContact?._id && conversations?.data?.length > 0) {
      const conversation = conversations?.data?.find((conv) =>
        conv.participants.some((p) => p._id === selectedContact._id),
      );

      if (conversation?._id) {
        fetchMessages(conversation._id);
      }
    }
  }, [selectedContact, conversations]);

  useEffect(() => {
    fetchConversations();
  }, []);

  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: "auto" });
  };

    useEffect(() => {
    scrollToBottom();
  }, [messages]);


  // need updation
  const handleVideoCall = () => {
    if (selectedContact && online) {
      const { initiateCall } = useVideoCallStore.getState();
      const avatar = selectedContact?.profilePicture;

      initiateCall(
        selectedContact?._id,
        selectedContact?.username,
        avatar,
        "video",
      );
    } else {
      alert("User is offline. cannot initiate the call");
    }
  };


  const handleReaction = async (messageId, emoji) => {
    try {
     
      await addReaction(messageId, emoji);
      console.log(`Reaction ${emoji} added to message ${messageId}`);
    } catch (error) {
      console.error("Failed to add reaction:", error);
    }
  };
  // Typing logic
  useEffect(() => {
    if (messages && selectedContact) {
      startTyping(selectedContact?._id);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      typingTimeoutRef.current = setTimeout(() => {
        stopTyping(selectedContact._id);
      }, 2000);
    }
    return () => clearTimeout(typingTimeoutRef.current);
  }, [messages, selectedContact, startTyping, stopTyping]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setShowFileMenu(false);
      if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
        setFilePreview(URL.createObjectURL(file));
      }
    }
  };

  const handleSendMessage = async () => {
    if (!selectedContact || (!message.trim() && !selectedFile)) return;
    setFilePreview(null);
    try {
      const formData = new FormData();
      formData.append("senderId", user?._id);
      formData.append("receiverId", selectedContact?._id);
      formData.append("messageStatus", online ? "delivered" : "send");

      if (message.trim()) formData.append("content", message.trim());
      if (selectedFile) formData.append("media", selectedFile);
      await sendMessage(formData);

      setMessage("");
      setFilePreview(null);
      setShowFileMenu(false);
      setSelectedFile(null);
    } catch (error) {
      console.error("Failed to send message", error);
    }
  };

  const renderDateSeperator = (date) => {
    if (!isValidate(date)) return null;
    let dateString = isToday(date)
      ? "Today"
      : isYesterday(date)
        ? "Yesterday"
        : format(date, "EEEE, MMMM d");

    return (
      <div className="flex justify-center my-4">
        <span
          className={`px-4 py-1 rounded-full text-sm  ${theme === "dark" ? "bg-[#1f2225] text-gray-400" : "bg-white text-gray-500 shadow-sm"}`}
        >
          {dateString}
        </span>
      </div>
    );
  };

  const handleInputChange = (e) => {
    setMessage(e.target.value);

    if (selectedContact?._id) {
      startTyping(selectedContact._id); // Emit "typing_start"

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      typingTimeoutRef.current = setTimeout(() => {
        stopTyping(selectedContact._id); // Emit "typing_stop"
      }, 2000);
    }
  };

  // Group messages by date
  const groupedMessages = Array.isArray(messages)
    ? messages.reduce((acc, msg) => {
        if (!msg.createdAt) return acc;
        const date = new Date(msg.createdAt);
        if(isValidate(date)){
          const dateKey = format(date, "yyyy-MM-dd");
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(msg);
      }else{
        console.error("invalid date for message ", message);
      }
        
        return acc;
      }, {})
    : {};

  if (!selectedContact) {
    return (
      <div
        className={`flex-1 flex items-center justify-center mx-auto h-screen text-center ${theme === "dark" ? "bg-[#222e35]" : "bg-[#f0f2f5]"}`}
      >
        <div className="max-w-md">
          <img src={whatsappImage} alt="whatsapp" className="w-full h-auto" />
          <h2
            className={`text-3xl font-semibold mb-4 ${theme === "dark" ? "text-white" : "text-black"}`}
          >
            Select a conversation to start chatting
          </h2>
          <p
            className={`mb-6 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
          >
            Choose a contact from the list on the left side to begin messaging
          </p>
          <p
            className={`mt-8 ${theme === "dark" ? "text-gray-400" : "text-gray-600"} text-sm flex items-center justify-center gap-2`}
          >
            <CiLock className="w-4 h-4" /> Your personal message are end to end
            encrypted
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 h-screen w-full flex flex-col ">
        {/* Header */}
        <div
          className={`p-4 flex items-center   ${theme === "dark" ? "bg-[#303430]  text-white" : "bg-[rgb(239,242,245)] text-gray-600"}`}
        >
          <button
            onClick={() => setSelectedContact(null)}
            className="mr-2 focus:outline-none"
          >
            <FaArrowLeft className="h-6 w-6" />
          </button>
          <img
            src={selectedContact?.profilePicture}
            className="h-10 w-10 rounded-full"
            alt={selectedContact?.username}
          />
          <div className="ml-3 grow">
            <h2 className="font-semibold text-start">{selectedContact?.username}</h2>
            {isTyping ? (
              <div>Typing...</div>
            ):(
                <p className={`text-sm ${theme === 'dark' ? "text-gray-400": 'text-gray-500'}`}>
                  {online ? "Online": lastSeen ? `Last Seen ${format(new Date(lastSeen), "HH:mm")}`: "Offline"}
               </p>
            )}
          </div>

          <div className="flex items-center space-x-4">
            <button
              className="focus:outline-none"
              onClick={handleVideoCall}
              title={online ? "Start Video Call" : "User offline"}
            >
              <FaVideo className="h-5 w-5 text-green-500 hover:text-green-600" />
            </button>
            <button className="focus:outline-none">
              <FaEllipsisV className="cursor-pointer" size={20} />
            </button>
            
          </div>
        </div>

        {/* Message Area */}
        <div
          className={`flex-1 overflow-y-auto p-4 ${theme === "dark" ? "bg-[#191a1a]" : "bg-[rgb(241,236,229)]"}`}
        >
          {Object.entries(groupedMessages).map(([date, msgs]) => {
            return (
              <React.Fragment key={date}>
                {renderDateSeperator(new Date(date))}
                {msgs
                  .filter((msg) => msg.conversation === selectedContact?.conversation?._id)
                  .map((msg1) => {
                    return (
                      <MessageBubble
                        key={msg1._id || msg1.tempId}
                        message={msg1}
                        theme={theme}
                        currentUser={user}
                        onReact={handleReaction}
                        deleteMessage={deleteMessage}
                      />
                    );
                  })}
              </React.Fragment>
            );
          })}
          <div ref={messageEndRef} />
        </div>

        {filePreview && (
          <div className="relative p-2">
            {selectedFile?.type.startsWith("video/") ||
            selectedFile?.type.endsWith("mp4") ? (
              <video
                src={filePreview}
                controls
                className="w-80 h-60 object-cover rounded shadow-lg mx-auto"
              />
            ) : (
              <img
                src={filePreview}
                alt="file-preview"
                className="w-80 object-cover rounded shadow-lg mx-auto"
              />
            )}

            <button
              onClick={() => {
                setSelectedFile(null);
                setFilePreview(null);
              }}
              className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1"
            >
              <FaTimes className="h-4 w-4" />
            </button>
          </div>
        )}

        <div
          className={` p-4 ${theme === "dark" ? "bg-[#303430]" : "bg-white"} flex items-center space-x-2 relative`}
        >
          <button
            className="focus:outline-none"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            <FaSmile
              className={`h-6 w-6  ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
            />
          </button>
          {showEmojiPicker && (
            <div
              ref={emojiPickerRef}
              className="absolute left-0 bottom-16 z-50"
            >
              <EmojiPicker
                onEmojiClick={(emojiObject) => {
                  setMessage((prev) => prev + emojiObject.emoji);
                  setShowEmojiPicker(false);
                }}
                theme={theme}
              />
            </div>
          )}
          <div className="relative">
            <button
              className="focus:outline:none"
              onClick={() => setShowFileMenu(!showFileMenu)}
            >
              <FaPaperclip
                className={`h-6 w-6 mt-2  ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
              />
            </button>
            {showFileMenu && (
              <div
                className={`absolute bottom-full shadow-2xl  left-0 mb-2 ${theme === "dark" ? "bg-gray-700 shadow-white" : "bg-white shadow-gray-700"} rounded-2xl shadow-lg `}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/, video/"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current.click()}
                  className={`flex items-center px-4 py-2 w-full rounded-t-2xl transition-colors ${theme === "dark" ? "hover:bg-gray-500" : "hover:bg-gray-100"}`}
                >
                  <FaImage className="mr-2" /> Image/Video
                </button>
                <button
                  onClick={() => fileInputRef.current.click()}
                  className={`flex rounded-b-2xl items-center px-4 py-3 w-full transition-colors ${theme === "dark" ? "hover: bg-gray-500" : "hover:bg-gray-100"}`}
                >
                  <FaFile className="mr-2" /> Documents
                </button>
              </div>
            )}
          </div>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSendMessage();
              }
            }}
            placeholder="Type a message"
            className={`grow px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-green-500
          ${theme === "dark" ? "bg-gray-700 text-white border-gray-600" : "bg-white text-black border-gray-300"}
          `}
          />
          <button onClick={handleSendMessage} className="focus:outline:none">
            <FaPaperPlane className="h-6 w-6 text-green-500" />
          </button>
        </div>
      </div>

      <VideoCallManager socket={socket} />
    </>
  );
};

export default ChatWindow;
