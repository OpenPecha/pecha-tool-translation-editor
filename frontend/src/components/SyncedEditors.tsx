import React, { useEffect, useRef, useState } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";

interface SyncedEditorsProps {
  onChange?: (content: string) => void;
}

const SyncedEditors: React.FC<SyncedEditorsProps> = ({ onChange }) => {
  const editor1Ref = useRef<HTMLDivElement>(null);
  const editor2Ref = useRef<HTMLDivElement>(null);
  const quill1Ref = useRef<Quill | null>(null);
  const quill2Ref = useRef<Quill | null>(null);
  const [syncMode, setSyncMode] = useState<"scroll" | "click" | "none">("none");
  const ignoreScrollEvents = useRef(false);

  // Initialize Quill editors only once
  useEffect(() => {
    if (
      editor1Ref.current &&
      editor2Ref.current &&
      !quill1Ref.current &&
      !quill2Ref.current
    ) {
      const options = {
        theme: "snow",
        modules: {
          toolbar: [
            [{ header: [1, 2, 3, false] }],
            ["bold", "italic", "underline"],
            [{ list: "ordered" }, { list: "bullet" }],
          ],
        },
      };

      quill1Ref.current = new Quill(editor1Ref.current, options);
      quill2Ref.current = new Quill(editor2Ref.current, options);

      // Set different initial content for each editor
      quill1Ref.current.setText(SAMPLE_TEXT_1);
      quill2Ref.current.setText(SAMPLE_TEXT_2);

      // Store the onChange handler in a ref to avoid dependency issues
      const handleTextChange = (quill: Quill) => {
        onChange?.(quill.getText());
      };

      // Handle text changes without syncing content
      quill1Ref.current.on("text-change", () => {
        if (quill1Ref.current) handleTextChange(quill1Ref.current);
      });

      quill2Ref.current.on("text-change", () => {
        if (quill2Ref.current) handleTextChange(quill2Ref.current);
      });
    }

    // Cleanup function to destroy Quill instances
    return () => {
      if (quill1Ref.current) {
        quill1Ref.current.off("text-change");
        quill1Ref.current = null;
      }
      if (quill2Ref.current) {
        quill2Ref.current.off("text-change");
        quill2Ref.current = null;
      }
    };
  }, []); // Explicitly empty

  // Handle sync behaviors separately
  useEffect(() => {
    if (!quill1Ref.current || !quill2Ref.current) return;

    const handleScroll = (source: Quill, target: Quill) => {
      if (syncMode !== "scroll" || ignoreScrollEvents.current) return;
      console.log("editors", source, target);

      ignoreScrollEvents.current = true;
      const sourceEditor = source.container.querySelector(
        ".ql-editor"
      ) as HTMLElement;
      const targetEditor = target.container.querySelector(
        ".ql-editor"
      ) as HTMLElement;
      console.log("sourceEditor", sourceEditor);
      console.log("targetEditor", targetEditor);

      if (!sourceEditor || !targetEditor) return;

      // Get current scroll position
      const scrollTop = sourceEditor.scrollTop;

      // Get all text blocks and calculate line height
      const sourceBlocks = sourceEditor.querySelectorAll(
        "p, h1, h2, h3, pre, li"
      );
      const targetBlocks = targetEditor.querySelectorAll(
        "p, h1, h2, h3, pre, li"
      );

      const computedStyle = window.getComputedStyle(sourceEditor);
      const lineHeight = parseInt(computedStyle.lineHeight || "20");
      const paddingTop = parseInt(computedStyle.paddingTop || "0");

      // Find the block and line at current scroll position
      let currentBlockIndex = 0;
      let accumulatedHeight = paddingTop;

      // Find which block contains the current scroll position
      for (let i = 0; i < sourceBlocks.length; i++) {
        const block = sourceBlocks[i] as HTMLElement;
        const blockHeight = block.offsetHeight;

        if (accumulatedHeight + blockHeight > scrollTop) {
          currentBlockIndex = i;
          break;
        }
        accumulatedHeight += blockHeight;
      }

      // Handle case when scrolled past last block
      if (currentBlockIndex >= sourceBlocks.length) {
        currentBlockIndex = sourceBlocks.length - 1;
      }

      // Calculate exact line position
      const currentBlock = sourceBlocks[currentBlockIndex] as HTMLElement;
      const blockOffset = Math.max(0, scrollTop - accumulatedHeight);
      const linesInBlock = Math.ceil(currentBlock.offsetHeight / lineHeight);
      const currentLine = Math.min(
        Math.floor(blockOffset / lineHeight),
        Math.max(0, linesInBlock - 1)
      );

      // Calculate target scroll position
      if (currentBlockIndex < targetBlocks.length) {
        let targetScrollTop = paddingTop;

        // Add heights of preceding blocks
        for (let i = 0; i < currentBlockIndex; i++) {
          const block = targetBlocks[i] as HTMLElement;
          targetScrollTop += block.offsetHeight;
        }

        // Calculate line position in target block
        const targetBlock = targetBlocks[currentBlockIndex] as HTMLElement;
        const targetBlockLines = Math.ceil(
          targetBlock.offsetHeight / lineHeight
        );

        if (targetBlockLines > 1 && linesInBlock > 1) {
          // Calculate relative line position
          const lineProgress = currentLine / (linesInBlock - 1);
          const targetLine = Math.round(lineProgress * (targetBlockLines - 1));
          targetScrollTop += targetLine * lineHeight;
        }

        // Scroll target smoothly
        targetEditor.scrollTo({
          top: targetScrollTop,
        });
      }

      setTimeout(() => {
        ignoreScrollEvents.current = false;
      }, 50);
    };

    const handleClick = (source: Quill, target: Quill) => {
      if (syncMode !== "click") return;

      const [range] = source.selection.getRange();
      console.log("range", range);
      if (range) {
        // scroll the target to the same position as the source
        target.setSelection(range.index, range.length);
        source.setSelection(range.index, range.length);
      }
    };

    const scrollHandler1 = () =>
      handleScroll(quill1Ref.current!, quill2Ref.current!);
    const scrollHandler2 = () =>
      handleScroll(quill2Ref.current!, quill1Ref.current!);
    const clickHandler1 = () =>
      handleClick(quill1Ref.current!, quill2Ref.current!);
    const clickHandler2 = () =>
      handleClick(quill2Ref.current!, quill1Ref.current!);

    // Add event listeners
    quill1Ref.current.root.addEventListener("scroll", scrollHandler1);
    quill2Ref.current.root.addEventListener("scroll", scrollHandler2);
    quill1Ref.current.root.addEventListener("click", clickHandler1);
    quill2Ref.current.root.addEventListener("click", clickHandler2);

    // Cleanup
    return () => {
      quill1Ref.current?.root.removeEventListener("scroll", scrollHandler1);
      quill2Ref.current?.root.removeEventListener("scroll", scrollHandler2);
      quill1Ref.current?.root.removeEventListener("click", clickHandler1);
      quill2Ref.current?.root.removeEventListener("click", clickHandler2);
    };
  }, [syncMode]); // Only re-run when syncMode changes

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex gap-4 items-center">
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="syncMode"
              value="scroll"
              checked={syncMode === "scroll"}
              onChange={() => setSyncMode("scroll")}
            />
            <span>Scroll Sync</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="syncMode"
              value="click"
              checked={syncMode === "click"}
              onChange={() => setSyncMode("click")}
            />
            <span>Click Sync</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="syncMode"
              value="none"
              checked={syncMode === "none"}
              onChange={() => setSyncMode("none")}
            />
            <span>No Sync</span>
          </label>
        </div>
      </div>
      <div className="flex gap-4">
        <div className="flex-1" style={{ maxWidth: "600px", width: "600px" }}>
          <div
            ref={editor1Ref}
            style={{
              height: "500px",
              overflowY: "auto",
              border: "1px solid #ccc",
              borderRadius: "4px",
              padding: "1rem",
            }}
          />
        </div>
        <div className="flex-1" style={{ maxWidth: "600px", width: "600px" }}>
          <div
            ref={editor2Ref}
            style={{
              height: "500px",
              overflowY: "auto",
              border: "1px solid #ccc",
              borderRadius: "4px",
              padding: "1rem",
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default SyncedEditors;

const SAMPLE_TEXT_1 = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut convallis gravida ligula at tempor. Sed at ante vitae ex eleifend dignissim vel id massa. Nullam tempor dapibus erat. Nulla ullamcorper, enim at convallis egestas, risus purus sollicitudin augue, ut eleifend enim velit vel sapien. In tincidunt et nunc eget placerat. Proin urna urna, consectetur pulvinar convallis id, imperdiet sodales massa. Integer at risus in dui tempus consequat.

Nulla augue orci, tristique vel lorem sit amet, imperdiet bibendum dolor. Vivamus sagittis arcu non enim convallis, quis suscipit augue facilisis. Etiam eu ornare mi. Maecenas tortor augue, lobortis sit amet posuere a, pulvinar sed arcu. Vestibulum at ante eget tortor condimentum consectetur quis nec magna. Mauris sit amet efficitur purus, id fringilla erat. Proin id leo ante. Morbi sit amet nisl semper, cursus ipsum in, pretium est. Orci varius natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Cras sed justo ut mauris luctus efficitur eu ut nibh. Cras porttitor, neque sit amet iaculis sollicitudin, erat justo porttitor nulla, eu accumsan odio purus at ipsum. Proin suscipit, diam ut pretium aliquet, lorem lorem malesuada odio, a sagittis est ligula vel velit.

Suspendisse in scelerisque augue. Praesent malesuada eget ipsum varius gravida. Fusce vitae accumsan quam. Donec semper cursus nisl, ac viverra turpis facilisis id. Duis id maximus purus. Aenean vehicula diam ac mi rhoncus, gravida lacinia tellus aliquam. Integer dapibus arcu non felis consequat vehicula. Integer scelerisque commodo turpis, volutpat iaculis diam gravida sed. Praesent pulvinar dictum condimentum. Nulla auctor leo nisl, pulvinar vehicula erat porta id.

Nullam urna ex, hendrerit sit amet sollicitudin lobortis, convallis at orci. Fusce vestibulum dolor ut nunc porttitor consequat. Phasellus blandit nulla sit amet tincidunt aliquet. Etiam consequat lectus quis metus sodales mollis. Fusce et pharetra diam. Fusce lobortis justo a elit laoreet ultricies. Sed aliquam efficitur felis, a imperdiet nulla posuere ac. Vivamus tincidunt lacinia purus. Donec nec pulvinar lacus, non fermentum lectus. Integer eu dui lorem. Aenean erat libero, tempus eu tellus in, consequat lacinia est. Donec pulvinar purus a odio vestibulum dictum. Cras ac gravida mauris, dictum venenatis nibh. Suspendisse sed maximus libero. Integer luctus lacus nec dui feugiat rhoncus.

Fusce mollis velit vitae blandit consequat. Etiam et dolor augue. Phasellus vulputate, mi in imperdiet convallis, ligula purus fermentum arcu, at viverra risus leo a ante. Aenean elementum, augue eget congue efficitur, nulla lorem fringilla diam, at molestie libero sem nec tortor. Maecenas orci neque, aliquet ut efficitur id, scelerisque vel orci. Mauris congue mauris sit amet odio laoreet dapibus. Maecenas sed ex vel augue luctus feugiat sed nec nisl. In id elementum neque. Integer ultricies a turpis in mollis. Nullam feugiat volutpat libero vel mattis. Ut condimentum id metus nec luctus. Cras tortor massa, tempus ac porttitor sed, ultricies vitae nisl. Sed eu eros nec nisi pharetra auctor a vitae leo. Suspendisse consequat ipsum in urna varius pretium. In mattis fringilla nibh, vitae convallis erat laoreet sed.
`;

const SAMPLE_TEXT_2 = `So we’ve talked in the past, for example, how epistemology and evolution connected, that they’re both forms of knowledge creation. We’ve talked about how quantum physics and computation connect to create quantum computation. I’d just love to get as many examples. How does physics connect to evolution? How does evolution connect to computation?

For example, things that may be less obvious where people might view things as different theories, but to you, they’re fundamentally the same.

David: Yeah. Evolution and epistemology, people find both of those, the connection between both of those and physics, very counterintuitive because most people think of physics in a very bottom-up way.

And I think, for completely independent reasons, such as Constructor Theory, that’s a mistake. Ever since that idea caught on, like sometime after Newton, physicists have tried to shoehorn other physical theories into that mold, and that gives rise to, for example, the problem of the foundations of thermodynamics and statistical mechanics.

How can you have an exact second law when the fundamental theories of physics are all time-reversible and the second law is time-irreversible? How can you have that? The prevailing view is thermodynamics and epistemology are both emergent theories. And, therefore, not fundamental from the physics point of view.

And therefore, if we want to understand the universe at a fundamental level, we needn’t bother with those. Those are just like the theory of washing machines or gardening. I think that’s artificial. And especially when they have to get very embarrassed when they exclude thermodynamics from physics in that way.

I think a theory which is going to go deeper than the current paradigm of physics is going to have to put emergent phenomena and emergent theories on the same level as microscopic theories. People talk about reductionism and holism and some people are reductionists and some people are holists. I think I want to put them both in a sack and tie it up and let them come out with a resolution.
`;
