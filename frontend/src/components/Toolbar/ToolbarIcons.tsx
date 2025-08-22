import BoldSvg from "@/assets/toolbar/bold.svg";
import ItalicSvg from "@/assets/toolbar/italic.svg";
import CommentSvg from "@/assets/toolbar/comment.svg";
import HighlightSvg from "@/assets/toolbar/highlight.svg";
import SearchSvg from "@/assets/toolbar/search.svg";
import JoinSvg from "@/assets/toolbar/join.svg";
import UndoSvg from "@/assets/toolbar/undo.svg";
import RedoSvg from "@/assets/toolbar/redo.svg";
import UnderlineSvg from "@/assets/toolbar/underline.svg";
const ICONS = {
  Underline: {
    component: UnderlineSvg,
    alt: "Underline",
  },
  Bold: {
    component: BoldSvg,
    alt: "Bold",
  },
  Italic: {
    component: ItalicSvg,
    alt: "Italic",
  },
  Comment: {
    component: CommentSvg,
    alt: "Comment",
  },
  Highlight: {
    component: HighlightSvg,
    alt: "Highlight",
  },
  Search: {
    component: SearchSvg,
    alt: "Search",
  },
  Join: {
    component: JoinSvg,
    alt: "Join",
  },
  Undo: {
    component: UndoSvg,
    alt: "Undo",
  },
  Redo: {
    component: RedoSvg,
    alt: "Redo",
  },
  Footnote: {
    component:  RedoSvg,
    alt: "Footnote",
  },
};

interface IconProps {
  color?: string;
}

const createIconComponent = (iconKey: keyof typeof ICONS) => {
  return () => {
    const Icon = ICONS[iconKey].component;
    // return <ReactSVG src={Icon} className="toolbar-icon" />;
    const encodedSvg = Icon?.toString().split(",")[1];
    const decodedSvg = decodeURIComponent(encodedSvg);
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(decodedSvg, "image/svg+xml");
    const element = svgDoc.querySelector("svg");
    if (!element) return null;
    element?.classList.add("fill-[#454746]");
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(element);
    return svgString;
  };
};

const BoldIcon = createIconComponent("Bold");
const ItalicIcon = createIconComponent("Italic");
const CommentIcon = createIconComponent("Comment");
const HighlightIcon = createIconComponent("Highlight");
const SearchIcon = createIconComponent("Search");
const JoinIcon = createIconComponent("Join");
const UndoIcon = createIconComponent("Undo");
const RedoIcon = createIconComponent("Redo");
const underlineIcon = createIconComponent("Underline");
const FootnoteIcon = createIconComponent("Footnote");

export {
  BoldIcon,
  ItalicIcon,
  CommentIcon,
  HighlightIcon,
  SearchIcon,
  JoinIcon,
  UndoIcon,
  RedoIcon,
  underlineIcon,
  FootnoteIcon
};
