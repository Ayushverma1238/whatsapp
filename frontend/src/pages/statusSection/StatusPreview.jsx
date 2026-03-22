import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import formatTimestamp from "../../utils/formetTime";
import {
  FaChevronDown,
  FaChevronLeft,
  FaChevronRight,
  FaEye,
  FaTimes,
  FaTrash,
} from "react-icons/fa";

const StatusPreview = ({
  contact,
  currentIndex,
  onClose,
  onNext,
  onPrevious,
  onDelete,
  theme,
  loading,
  currentUser,
}) => {
  const [progress, setProgress] = useState(0);
  const [showViewers, setShowViewers] = useState(false);
  const currentStatus = contact?.statuses[currentIndex];
  const isOwnerStatus = contact?.id === currentUser?._id;

  useEffect(() => {
    setProgress(0);

    let current = 0;
    const intervel = setInterval(() => {
      current += 2;
      setProgress(current);
      if (current >= 100) {
        clearInterval(intervel);
        onNext();
      }
    }, 100);

    return () => clearInterval(intervel);
  }, [currentIndex]);

  const handleViewersToggle = () => {
    setShowViewers(!showViewers);
  };

  const handleDeleteStatus = () => {
    if (onDelete && currentStatus?.id) {
      onDelete(currentStatus?.id);
    }
    if (contact?.statuses.length === 1) {
      onClose();
    } else {
      onPrevious();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      exit={{ opacity: 0 }}
      style={{ backdropFilter: "blur(5px" }}
      onClick={onClose}
      className={`fixed inset-0 bg-black/50 w-full h-full z-50 flex items-center justify-center`}
    >
      <div
        className="relative w-full max-w-4xl h-full mx-auto flex justify-center items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`w-full h-full ${theme === "dark" ? "bg-[#202c33]" : "bg-gray-800"} relative`}
        >
          <div className="absolute top-0  left-0 right-0 flex justify-between p-4 z-10 gap-1">
            {contact?.statuses.map((_, index) => (
              <div
                key={index}
                className="h-1 bg-gray-400/50 flex-1 rounded-full overflow-hidden "
              >
                <div
                  style={{
                    width:
                      index < currentIndex
                        ? "100%"
                        : index === currentIndex
                          ? `${progress}%`
                          : "0%",
                  }}
                  className="h-full bg-white transition-all duration-100 ease-linear rounded-full"
                ></div>
              </div>
            ))}
          </div>
          <div className="absolute top-8 left-4 right-16 z-10 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img
                src={contact?.avatar}
                alt={contact?.username}
                className="w-10 h-10 rounded-full object-cover border-2 border-white"
              />
              <div>
                <p className="text-white font-semibold">{contact?.username}</p>
                <p className="text-gray-300 text-sm">
                  {formatTimestamp(currentStatus.timestamp)}
                </p>
              </div>
            </div>
            {/* Status action */}

            {isOwnerStatus && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleDeleteStatus}
                  className="text-white bg-red-500/70 p-2 rounded-full hover:bg-red-500/90 transition-all"
                >
                  <FaTrash className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          <div className="w-full h-full flex items-center justify-center">
            {currentStatus.contentType === "text" ? (
              <div className="text-white text-center p-8">
                <p className="text-2xl font-medium">{currentStatus.media}</p>
              </div>
            ) : currentStatus.contentType === "image" ? (
              <img
                src={currentStatus.media}
                alt="image"
                className="max-w-full max-h-full object-contain"
              />
            ) : currentStatus.contentType === "video" ? (
              <video
                src={currentStatus.media}
                alt="video"
                controls
                autoPlay
                className="max-w-full max-h-full object-contain"
              />
            ) : null}
          </div>

          <button
            onClick={onClose}
            className="absolute p-2 top-4 right-4 text-white bg-black/50 rounded-full hover:bg-black/70 transition-all z-10"
          >
            <FaTimes className="w-5 h-5" />
          </button>

          {currentIndex > 0 && (
            <button
              onClick={onPrevious}
              className="absolute p-2 top-1/2 left-4 text-white bg-black/50 transition rounded-full hover:bg-black/70 -translate-y-1/2 "
            >
              <FaChevronLeft className="w-5 h-5" />
            </button>
          )}

          {currentIndex < contact?.statuses.length && (
            <button
              onClick={onNext}
              className="absolute p-2 top-1/2 right-4 text-white bg-black/50 transition rounded-full hover:bg-black/70 -translate-y-1/2 "
            >
              <FaChevronRight className="w-5 h-5" />
            </button>
          )}

          {isOwnerStatus && (
            <div className="absolute bottom-4 left-4 right-4">
              <button
                onClick={handleViewersToggle}
                className="flex items-center justify-between w-full text-white bg-black/50 rounded-lg px-4 py- hover:bg-black/70 transition-all "
              >
                <div className="flex items-center space-x-2">
                  <FaEye className="w-4 h-4" />
                  <span>{currentStatus.viewers.length}</span>
                </div>
                <FaChevronDown
                  className={`h-4 w-4 transition-transform ${showViewers ? "rotate-180" : ""}`}
                />
              </button>

              <AnimatePresence>
                {showViewers && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 bg-black/70 rounded-lg p-4 max-h-40 overflow-y-auto"
                  >
                    {loading ? (
                      <p className="text-white text-center">Loading Viewers</p>
                    ): currentStatus.viewers.length > 0 ? (
                      <div className="gap-2 flex flex-col">
                        {currentStatus?.viewers.map((viewer) =>(
                          <div key={viewer?._id} className="flex items-center space-x-3">
                            <img src={viewer.profilePicture} alt={viewer.username} className="w-8 h-8 object-cover rounded-full" />
                            <span className="text-white">{viewer.username}</span>
                          </div>
                        ))}
                      </div>
                    ):(
                      <p className="text-white text-center">No Viewers yet</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default StatusPreview;
