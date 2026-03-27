import { format } from "date-fns";
import React, { useRef, useState } from "react";
import {
  FaCheck,
  FaCheckDouble,
  FaCopy,
  FaPlus,
  FaRegCopy,
  FaSmile,
} from "react-icons/fa";
import { HiDotsVertical } from "react-icons/hi";
import useOutsideclick from "../../hooks/useOutsideclick";
import EmojiPicker from "emoji-picker-react";
import { RxCross2 } from "react-icons/rx";

const MessageBubble = ({
  message,
  theme,
  currentUser,
  onReact,
  deleteMessage,
}) => {
  const quickReactions = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const messageRef = useRef(null);
  const [showOptions, setShowOptions] = useState(false);
  const optionRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const reactionMenuRef = useRef(null);
  const isUserMessage = message.sender._id === currentUser?._id;

  const bubbleClass = isUserMessage ? "chat-end" : "chat-start";

  const bubbleContentClass = isUserMessage
    ? `chat-bubble md:max-w-[50%] min-w-[130px] ${theme === "dark" ? "bg-[#144d38] text-white" : "bg-[#d9fdd3] text-black"}`
    : `chat-bubble md:max-w-[50%] min-w-[130px] ${theme === "dark" ? "bg-[#144d38] text-white" : "bg-white text-black"}`;

  const handleReact = (emoji) => {
    onReact(message?._id, emoji);
    setShowEmojiPicker(false);
    setShowReactions(false);
  };

  useOutsideclick(emojiPickerRef, () => {
    if (showEmojiPicker) setShowEmojiPicker(false);
  });

  useOutsideclick(reactionMenuRef, () => {
    if (showReactions) setShowReactions(false);
  });

  useOutsideclick(optionRef, () => {
    if (showOptions) setShowOptions(false);
  });

  if (message === 0) return;

  return (
    <div className={`chat ${bubbleClass} py-2 `}>
      <div className={`${bubbleContentClass} relative group`} ref={messageRef}>
        <div className="flex flex-col justify-center gap-2">
          {/* Message Content */}
          {message.contentType === "text" && (
            <p className="mr-2">{message.content}</p>
          )}

          {message.contentType === "image" && (
            <div>
              <img
                src={message.imageOrVideoUrl}
                alt="image"
                className="rounded-lg max-w-xs"
              />
              <p className="mt-1 wrap-break-word">{message.content}</p>
            </div>
          )}
          {message.contentType === "video" && (
            <div>
              <video
                src={message.imageOrVideoUrl}
                alt="video"
                controls
                className="rounded-lg max-w-xs"
              />
              <p className="mt-1 wrap-break-word">{message.content}</p>
            </div>
          )}

          {/* Time + Status */}
          <div className="self-end flex mt-2 ml-2 items-center justify-end gap-1 text-xs opacity-60">
            <span>{format(new Date(message.createdAt), "HH:mm")}</span>
            {isUserMessage && (
              <>
                {message.messageStatus === "send" && <FaCheck size={12} />}
                {message.messageStatus === "delivered" && (
                  <FaCheckDouble size={12} />
                )}
                {message.messageStatus === "read" && (
                  <FaCheckDouble className="text-blue-600" size={12} />
                )}
              </>
            )}
          </div>

          <div
            className={`absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-20 `}
          >
            <button
              className={` ${theme === "dark" ? "text-white" : "text-gray-800"} rounded-full p-1`}
              onClick={() => setShowOptions(!showOptions)}
            >
              <HiDotsVertical size={18} />
            </button>
          </div>
          <div
            className={`absolute ${isUserMessage ? "-left-10" : "-right-10"} top-1/4 transform -transition-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2`}
          >
            <button
              onClick={() => setShowReactions(!showReactions)}
              className={`p-2 shadow-lg rounded-full ${theme === "dark" ? "bg-[#202c33] hover:bg-[#202c33]/80" : "bg-white hover:bg-gray-100"}`}
            >
              <FaSmile
                className={`${theme === "dark" ? "text-gray-300" : "text-gray-600"} `}
              />
            </button>
          </div>
          {showReactions && (
            <div
              ref={reactionMenuRef}
              className={`absolute -top-12 ${isUserMessage ? "right-0" : "left-0"} 
    flex items-center bg-white dark:bg-[#233138] rounded-full px-2 py-1.5 
    gap-1 shadow-2xl z-50 border border-gray-200 dark:border-white/10 whitespace-nowrap`}
            >
              {quickReactions.map((emoji, index) => (
                <button
                  key={index}
                  onClick={() => handleReact(emoji)}
                  className="hover:scale-125 transition-transform p-1"
                >
                  {emoji}
                </button>
              ))}

              <div className="mx-1 h-5 bg-gray-600"></div>

              <button
                className="hover:bg-[#ffffff1a] rounded-full p-1"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              >
                <FaPlus className="text-gray-300 h-4 w-4" />
              </button>
            </div>
          )}
          {showEmojiPicker && (
            <div ref={emojiPickerRef} className="absolute left-0 mb-6 z-50">
              <div className="relative">
                <EmojiPicker
                  onEmojiClick={(emojiObject) => 
                    handleReact(emojiObject.emoji)}
                    theme={theme}
                 
                />
                <button
                  onClick={() => setShowEmojiPicker(false)}
                  className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                >
                  <RxCross2 className={`h-6 w-6`} />
                </button>
              </div>
            </div>
          )}
          {message.reactions && message.reactions.length > 0 && (
            <div
              className={`absolute -bottom-5 mb-2 ${isUserMessage ? "right-2" : "left-2"} ${theme === "dark" ? "bg-[#2a3942]" : "bg-gray-200"} rounded-full px-2 shadow-md`}
            >
              {message.reactions.map((reac, index) => (
                <span key={index} className="mr-1 mb-1">
                  {reac.emoji}
                </span>
              ))}
            </div>
          )}

          {showOptions && (
            <div
              ref={optionRef}
              className={`absolute top-8 right-1 z-50 w-36 rounded-xl shadow-lg py-2 text-sm ${theme === "dark" ? "bg-[#1d1f1f] text-white" : "bg-gray-100 text-black"}`}
            >
              <button
                onClick={() => {
                  if (message.contentType === "text") {
                    navigator.clipboard.writeText(message.content);
                  }
                  setShowOptions(!showOptions);
                }}
                className="flex items-center w-full px-4 py-2 gap-3 rounded-lg"
              >
                <FaRegCopy size={14} />
                <span>Copy</span>
              </button>
              {isUserMessage && (
                <button
                  onClick={() => {
                    deleteMessage(message?._id);
                    setShowOptions(!showOptions);
                  }}
                  className="flex items-center w-full px-4 py-2 gap-3 text-red-600 rounded-lg"
                >
                  <FaRegCopy size={14} className="text-red-500" />
                  <span>Delete</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
