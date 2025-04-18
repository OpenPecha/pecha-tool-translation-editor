import BoldSvg from "@/assets/toolbar/bold.svg";
import ItalicSvg from "@/assets/toolbar/italic.svg";
import CommentSvg from "@/assets/toolbar/comment.svg";
import HighlightSvg from "@/assets/toolbar/highlight.svg";
import SearchSvg from "@/assets/toolbar/search.svg";
import JoinSvg from "@/assets/toolbar/join.svg";
import UndoSvg from "@/assets/toolbar/undo.svg";
import RedoSvg from "@/assets/toolbar/redo.svg";
import { ReactSVG } from "react-svg";
const ICONS = {
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
};

interface IconProps {
  color?: string;
}

const createIconComponent = (iconKey: keyof typeof ICONS) => {
  return ({ color }: IconProps) => {
    const Icon = ICONS[iconKey].component;
    return <ReactSVG src={Icon} className="toolbar-icon" />;
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

export {
  BoldIcon,
  ItalicIcon,
  CommentIcon,
  HighlightIcon,
  SearchIcon,
  JoinIcon,
  UndoIcon,
  RedoIcon,
};
