import { marked } from "marked";
import React, { useEffect, useId, useRef, useState } from "react";

const Tabs = ({
  children,
}: {
  children: React.ReactElement<{ value: string }>;
}) => {
  const [active, setActive] = useState<number>(0);
  const [defaultFocus, setDefaultFocus] = useState<boolean>(false);
  const baseId = useId().replace(/:/g, "");

  const tabRefs = useRef<(HTMLElement | null)[]>([]);
  useEffect(() => {
    if (defaultFocus) {
      tabRefs.current[active]?.focus();
    } else {
      setDefaultFocus(true);
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
      setActive(index);
    } else if (event.key === "ArrowRight") {
      setActive((active + 1) % tabLinks.length);
    } else if (event.key === "ArrowLeft") {
      setActive((active - 1 + tabLinks.length) % tabLinks.length);
    }
  };

  return (
    <div className="tab">
      <ul className="tab-nav" role="tablist">
        {tabLinks.map(
          (item: { name: string; children: string }, index: number) => (
            <li
              key={index}
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
            </li>
          ),
        )}
      </ul>
      {tabLinks.map((item: { name: string; children: string }, i: number) => (
        <div
          id={`tabpanel-${baseId}-${i}`}
          role="tabpanel"
          aria-labelledby={`tab-${baseId}-${i}`}
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
