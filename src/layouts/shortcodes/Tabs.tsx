import { marked } from "marked";
import React, { useEffect, useId, useRef, useState } from "react";

const Tabs = ({
  children,
}: {
  children: React.ReactElement<{ value: string }>;
}) => {
  const [active, setActive] = useState<number>(0);
  const baseId = useId().replace(/:/g, "");

  const tabRefs = useRef<(HTMLElement | null)[]>([]);
  // Focus follows the active tab only when it was changed from the
  // keyboard (arrow/Home/End/Enter/Space). Mouse activation must not
  // yank focus — the previous effect moved focus on every change,
  // including clicks.
  const moveFocus = useRef(false);
  useEffect(() => {
    if (moveFocus.current) {
      tabRefs.current[active]?.focus();
      moveFocus.current = false;
    }
  }, [active]);

  const tabLinks = Array.from(
    children.props.value.matchAll(
      /<div\s+data-name="([^"]+)"[^>]*>((?:.|\n)*?)<\/div>/g,
    ),
    (match: RegExpMatchArray) => ({ name: match[1], children: match[0] }),
  );

  const handleKeyDown = (
    event: React.KeyboardEvent<EventTarget>,
    index: number,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      moveFocus.current = true;
      setActive(index);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      moveFocus.current = true;
      setActive((active + 1) % tabLinks.length);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveFocus.current = true;
      setActive((active - 1 + tabLinks.length) % tabLinks.length);
    } else if (event.key === "Home") {
      event.preventDefault();
      moveFocus.current = true;
      setActive(0);
    } else if (event.key === "End") {
      event.preventDefault();
      moveFocus.current = true;
      setActive(tabLinks.length - 1);
    }
  };

  return (
    <div className="tab">
      <ul className="tab-nav" role="tablist" aria-orientation="horizontal">
        {tabLinks.map(
          (item: { name: string; children: string }, index: number) => (
            <li key={index} role="presentation">
              <button
                type="button"
                id={`tab-${baseId}-${index}`}
                className={`tab-nav-item ${index === active && "active"}`}
                role="tab"
                aria-selected={index === active}
                aria-controls={`tabpanel-${baseId}-${index}`}
                tabIndex={index === active ? 0 : -1}
                onKeyDown={(event) => handleKeyDown(event, index)}
                onClick={() => setActive(index)}
                ref={(ref) => {
                  tabRefs.current[index] = ref;
                }}
              >
                {item.name}
              </button>
            </li>
          ),
        )}
      </ul>
      {tabLinks.map((item: { name: string; children: string }, i: number) => (
        <div
          id={`tabpanel-${baseId}-${i}`}
          role="tabpanel"
          aria-labelledby={`tab-${baseId}-${i}`}
          tabIndex={0}
          className={active === i ? "tab-content block px-5" : "hidden"}
          key={i}
          dangerouslySetInnerHTML={{
            __html: marked.parse(item.children),
          }}
        />
      ))}
    </div>
  );
};

export default Tabs;
