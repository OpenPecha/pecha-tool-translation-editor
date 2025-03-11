import React from "react";
import formatTimeAgo from "../lib/formatTimeAgo";

function Comments({ comments }) {
  return (
    <div className="max-w-3xl mx-auto p-4">
      <h2 className="text-lg font-semibold mb-4">Comments</h2>
      {comments.length === 0 ? (
        <p className="text-gray-500">No comments yet.</p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <Comment key={comment.id} comment={comment} />
          ))}
        </div>
      )}
    </div>
  );
}

function Comment({ comment }) {
  const handleClickComment = () => {
    const targetElement = document.querySelector(`[data-id="${comment.id}"]`);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
      targetElement.style.transition = "background-color 0.5s ease";
      targetElement.style.backgroundColor = "yellow";

      setTimeout(() => {
        targetElement.style.backgroundColor = "lightyellow";
      }, 1500);
    }
  };

  return (
    <div
      onClick={handleClickComment}
      data-id={comment.id}
      className="bg-white shadow-md p-4 rounded-lg border border-gray-200"
    >
      <div className="flex items-center space-x-3 mb-2">
        <div className="bg-gray-300 w-8 h-8 rounded-full flex items-center justify-center font-bold text-gray-700">
          {comment.user.username.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-medium">{comment.user.username}</p>
          <p className="text-xs text-gray-500">{formatTimeAgo(comment.createdAt)}</p>
        </div>
      </div>
      <p className="text-gray-700">{comment.content}</p>
    </div>
  );
}

export default Comments;
