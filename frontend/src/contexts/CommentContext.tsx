import { fetchCommentsByThreadId } from "@/api/comment";
import emitter from "@/services/eventBus";
import { createContext, useContext, useEffect, useState } from "react";

const CommentContext = createContext(null);

export const CommentProvider = ({ children }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [commentThread, setCommentThread] = useState(null);

  useEffect(() => {
    const openHandler = (data) => {
      setIsModalOpen(true);
      setPosition(data.position);
      fetchCommentsByThreadId(data.id).then((comments) => {
        console.log("comments", comments);
        setCommentThread(comments);
      });
    };

    emitter.on("showCommentBubble", openHandler);

    return () => {
      emitter.off("showCommentBubble", openHandler);
    };
  }, []);

  return (
    <CommentContext.Provider
      value={{
        isModalOpen,
        position,
        commentThread,
        setIsModalOpen,
      }}
    >
      {children}
    </CommentContext.Provider>
  );
};

export const useComment = () => useContext(CommentContext);
