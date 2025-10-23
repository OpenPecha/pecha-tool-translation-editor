import { generateJsonFromText } from "@/lib/segmentFromText";
import Quill from "quill";

export const PublishButton = ({ quill }: { quill: Quill }) => {
  const handlePublish = () => {
    const text = quill.getText();
    const json = generateJsonFromText(text);
    // alert("data:" + json);
  };

  return (
    <div className="flex items-center mr-2">
      <div
        className="bg-gray-300 shadow rounded px-2 cursor-pointer capitalize text-gray-700 font-google-sans hover:bg-gray-200 transition-all"
        onClick={handlePublish}
      >
        publish
      </div>
    </div>
  );
};
