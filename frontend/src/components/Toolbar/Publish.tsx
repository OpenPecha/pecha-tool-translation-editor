import { generateJsonFromText } from "@/lib/segmentFromText";
import Quill from "quill";

export const PublishButton = ({ quill }: { quill: Quill }) => {
  const handlePublish = () => {
    // const text = quill.getText();
    // const json = generateJsonFromText(text);
    const json = quill.getContents();
    console.log("published", json);
  };

  return (
    <div className="flex items-center mr-2">
      <div
        className="bg-blue-300 shadow rounded px-2 cursor-pointer capitalize text-gray-600"
        onClick={handlePublish}
      >
        publish
      </div>
    </div>
  );
};
