import React, { useEffect, useState } from "react";
import useThemeStore from "../../store/themeStore";
import useUserStore from "../../store/useUserStore";
import useStatusStore from "../../store/useStatusStore";
import Layout from "../../components/Layout";
import StatusPreview from "./StatusPreview";
import { motion } from "framer-motion";
import { RxCross2 } from "react-icons/rx";
import { FaCamera, FaEllipsisH, FaPlus } from "react-icons/fa";
import formatTimestamp from "../../utils/formetTime";
import StatusList from "./StatusList";

const Status = () => {
  const [previewContact, setPreviewContact] = useState(null);
  const [currentStatusIndex, setCurrentStatusIndex] = useState(0);
  const [showOptions, setShowOptions] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showCreateModel, setShowCreateModel] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [filePreview, setFilePreview] = useState(null);

  const { theme } = useThemeStore();
  const { user } = useUserStore();

  const {
    statuses,
    loading,
    error,
    setStatuses,
    setLoading,
    setError,
    initializeSocket,
    cleanupSocket,
    fetchStatuses,
    createStatus,
    viewStatus,
    deleteStatus,
    getStatusViewers,
    getGroupedStatus,
    getUserStatuses,
    getOtherStatuses,
    clearError,
    reset,
  } = useStatusStore();

  const userStatuses = getUserStatuses(user?._id);
  const otherStatuses = getOtherStatuses(user?._id);

  useEffect(() => {
    fetchStatuses();
    initializeSocket();
    return () => {
      cleanupSocket();
    };
  }, [user?._id]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      if (
        file.type.startsWith("image/") ||
        file.type.startsWith("video/") ||
        file.type.endsWith("mp4")
      ) {
        setFilePreview(URL.createObjectURL(file));
      }
    }
  };

  const handleCreateStatus = async () => {
    if (!newStatus.trim() && !selectedFile) return;
    try {
      await createStatus({
        content: newStatus,
        file: selectedFile,
      });
      setNewStatus("");
      setSelectedFile(null);
      setFilePreview(null);
      setShowCreateModel(false);
    } catch (error) {
      console.error("Error creating status", error);
    }
  };

  const handleViewStatus = async (statusId) => {
    try {
      await viewStatus(statusId);
    } catch (error) {
      console.error("Error viewing status", error);
    }
  };

  const handleDeleteStatus = async (statusId) => {
    try {
      await deleteStatus(statusId);
      setShowOptions(false);
      handlePreviewClose();
    } catch (error) {
      console.error("Error deleting status", error);
    }
  };

  const handlePreviewClose = () => {
    setPreviewContact(null);
    setCurrentStatusIndex(0);
  };

  const handlePreviewNext = () => {
    if (currentStatusIndex < previewContact.statuses.length - 1) {
      setCurrentStatusIndex((prev) => prev + 1);
    } else {
      handlePreviewClose();
    }
  };

  const handlePreviewPrevious = () => {
    setCurrentStatusIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleStatusPreview = (contact, statusIndex) => {
    setPreviewContact(contact);
    setCurrentStatusIndex(statusIndex);
    if (contact.statuses[statusIndex]) {
      handleViewStatus(contact.statuses[statusIndex].id);
    }
  };
  return (
    <Layout
      isStatusPreviewOpen={!!previewContact}
      
      statusPreviewContent={
        previewContact && (
          <StatusPreview
            contact={previewContact}
            currentIndex={currentStatusIndex}
            onClose={handlePreviewClose}
            onNext={handlePreviewNext}
            onPrevious={handlePreviewPrevious}
            onDelete={handleDeleteStatus}
            theme={theme}
            currentUser={user}
            loading={loading}
          />
        )
      }
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className={`flex-1 h-screen border-r ${
          theme === "dark"
            ? "bg-[rgb(12,19,24)] text-white border-gray-600"
            : "bg-gray-100 text-black"
        }`}
      >
        <div
          className={`flex border-b justify-center items-center ${theme === "dark" ? "bg-[rgb(17,27,33)] border-gray-700 " : "bg-white border-gray-300"} p-4`}
        >
          <h2 className="text-2xl font-bold">Status</h2>
        </div>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mx-4 mt-2">
            <span className="block sm:inline">{error}</span>
            <button
              onClick={clearError}
              className="float-right text-red-500 hover:text-red-700 transition-colors"
            >
              <RxCross2 className="h-5 w-5" />
            </button>
          </div>
        )}

        <div className="overflow-y-auto h-[calc(100vh-64px)]">
          <div
            className={`flex p-3 space-x-4 shadow-md ${theme === "dark" ? "bg-[rgb(17,27,33)]" : "bg-white"}`}
          >
            <div
              onClick={() => {
                userStatuses
                  ? handleStatusPreview(userStatuses,currentStatusIndex)
                  : setShowCreateModel(true);
              }}
              className="relative cursor-pointer"
            >
              <img
                src={user?.profilePicture}
                alt={user?.username}
                className="w-12 h-12 rounded-full object-cover"
              />
              {userStatuses ? (
                <>
                  <svg
                    className="absolute top-0 left-0 w-12 h-12"
                    viewBox="0 0 100 100"
                  >
                    {userStatuses.statuses.map((_, index) => {
                      const circumFerence = 2 * Math.PI * 48;
                      const segmentLength =
                        circumFerence / userStatuses.statuses.length;
                      const offset = index * segmentLength;
                      return (
                        <circle
                          key={index}
                          cx="50"
                          cy="50"
                          r="48"
                          fill="none"
                          stroke="#25D366"
                          strokeWidth="4"
                          strokeDasharray={`${segmentLength - 5} 5`}
                          strokeDashoffset={-offset}
                          transform={`rotate(-90 50 50)`}
                        />
                      );
                    })}
                  </svg>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCreateModel(true);
                    }}
                    className="absolute bottom-0 right-0 bg-green-500 hover:bg-green-700 text-white p=1 rounded-full"
                  >
                    <FaPlus className="h-3 w-3" />
                  </button>
                </>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCreateModel(true);
                  }}
                  className="absolute bottom-0 right-0 bg-green-500 hover:bg-green-700 text-white p=1 rounded-full"
                >
                  <FaPlus className="h-3 w-3" />
                </button>
              )}
            </div>
            <div className="flex flex-col items-start flex-1">
              <p className="font-semibold">My Status</p>
              <p
                className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
              >
                {userStatuses
                  ? `${userStatuses.statuses.length} status ${userStatuses.statuses.length > 1 ? "." : ""} ${formatTimestamp(userStatuses.statuses[0].timestamp)} `
                  : "Tap to add status update"}
              </p>
            </div>

            {userStatuses && (
              <button
                onClick={() => setShowOptions(!showOptions)}
                className="ml-auto"
              >
                <FaEllipsisH
                  className={`h-5 w-5 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
                />
              </button>
            )}
          </div>

          {/* options name */}
          {showOptions && userStatuses && (
            <div
              className={`shadow-md p-2 ${theme === "dark" ? "bg-[rgb(17,27,33)]" : "bg-white"}`}
            >
              <button
                onClick={() => {
                  setShowCreateModel(true);
                  setShowOptions(false);
                }}
                className={`w-full text-left text-green-500 py-2 hover:bg-gray-100 px-2 rounded flex items-center`}
              >
                <FaCamera className="inline-block mr-2" /> Add Status
              </button>
              <button
                onClick={() => {
                  handleStatusPreview(userStatuses,currentStatusIndex);
                  setShowOptions(false);
                }}
                className={`w-full text-left text-blue-500 py-2 hover:bg-gray-100 px-2 rounded `}
              >
                View Status
              </button>
            </div>
          )}
          {loading && (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500" />
            </div>
          )}
          {/* Recent updates from other users */}
          {!loading && otherStatuses.length > 0 && (
            <div
              className={`p-4 space-y-4 shadow-md mt-4 ${theme === "dark" ? "bg-[rgb(17,27,33)]" : "bg-white"}`}
            >
              <h3
                className={`font-semibold ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
              >
                Recent Update
              </h3>
              {otherStatuses.map((contact, index) => (
                <React.Fragment key={contact?.id}>
                  <StatusList
                    contact={contact}
                    onPreview={() => handleStatusPreview(contact,currentStatusIndex)}
                    theme={theme}
                  />
                  {index < otherStatuses.length - 1 && (
                    <hr
                      className={`${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Empty Status */}

          {!loading && statuses.length === 0 && (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div
                className={`text-6xl mb-4 ${theme === "dark" ? "text-gray-600" : "text-gray-300"}`}
              >
                📲
              </div>
              <h3
                className={`text-lg mb-2 font-semibold ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
              >
                No Status update yet
              </h3>
              <p
                className={`text-sm mb-2  ${theme === "dark" ? "text-gray-500" : "text-gray-600"}`}
              >
                Be the first to share a status update
              </p>
            </div>
          )}

          {showCreateModel && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div
                className={`p-6 rounded-lg max-w-md w-full mx-4 ${theme === "dark" ? "bg-gray-800" : "bg-white"}`}
              >
                <h3
                  className={`text-lg mb-4 font-semibold ${theme === "dark" ? "text-white" : "text-black"}`}
                >
                  Create status
                </h3>

                {filePreview && (
                  <div className="mb-4">
                    {selectedFile?.type.startsWith("video/") ||
                    selectedFile?.type.endsWith("mp4") ? (
                      <video
                        src={filePreview}
                        controls
                        className="w-full h-32 object-cover rounded"
                      />
                    ) : (
                      <img
                        src={filePreview}
                        alt="file-preview"
                        className="w-full h-32 object-cover rounded"
                      />
                    )}
                  </div>
                )}

                <textarea
                  value={newStatus}
                  placeholder="What's on your mind?"
                  className={`w-full p-3 border rounded-lg mb-4 ${theme === "dark" ? "bg-gray-700 text-white border-gray-600" : "bg-white text-black border-gray-300"}`}
                  rows={3}
                  onChange={(e) => setNewStatus(e.target.value)}
                ></textarea>

                <input
                  onChange={handleFileChange}
                  id="file-upload"
                  type="file"
                  accept="image/*, video/*"
                  className="block w-full text-sm mb-2 text-gray-500
    file:mr-4 file:py-2 file:px-4
    file:rounded-full file:border-0
    file:text-sm file:font-semibold
    file:bg-blue-50 file:text-blue-700
    hover:file:bg-blue-100
    cursor:pointer"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer mb-4 flex items-center justify-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all shadow-md"
                >
                  <span className="mr-2">📁</span>
                  Upload Image or Video
                </label>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setLoading(false)
                      setShowCreateModel(false);
                      setNewStatus("");
                      setSelectedFile(null);
                      setFilePreview(null);
                    }}
                    className="px-4 py-2 text-gray-500 hover:text-gray-700"
                  >
                    Cancle
                  </button>

                  <button
                    onClick={handleCreateStatus}
                    disabled={loading || (!newStatus.trim() && !selectedFile)}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading ? "Creating..." : "Create"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </Layout>
  );
};

export default Status;
