export const TypingAnimation = ({ message }: { message?: string }) => {
  return (
    <div className="flex items-center gap-1">
      {message && <span className="text-[10px] text-gray-500">{message}</span>}
      <div className="flex gap-0.5 px-1">
        <span className="animate-[bounce_1s_ease-in-out_0s_infinite]">.</span>
        <span className="animate-[bounce_1s_ease-in-out_0.2s_infinite]">.</span>
        <span className="animate-[bounce_1s_ease-in-out_0.4s_infinite]">.</span>
      </div>
    </div>
  );
};