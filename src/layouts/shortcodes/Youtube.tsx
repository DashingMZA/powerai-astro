import React, { useEffect } from "react";

// <lite-youtube> is a custom element registered by
// @justinribeiro/lite-youtube; declare it so TS accepts it (with its
// fallback children) instead of suppressing the error per use.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- React.JSX namespace augmentation
  namespace React {
    // eslint-disable-next-line @typescript-eslint/no-namespace -- React.JSX namespace augmentation
    namespace JSX {
      interface IntrinsicElements {
        "lite-youtube": React.DetailedHTMLProps<
          React.HTMLAttributes<HTMLElement> & {
            videoid?: string;
            videotitle?: string;
          },
          HTMLElement
        >;
      }
    }
  }
}

const Youtube = ({
  id,
  title,
  ...rest
}: {
  id: string;
  title: string;
  // Extra attributes passed through to <lite-youtube>.
  [key: string]: unknown;
}) => {
  useEffect(() => {
    import("@justinribeiro/lite-youtube");
  }, []);

  return (
    <lite-youtube
      className="rounded-lg"
      videoid={id}
      videotitle={title}
      {...rest}
    >
      {/* Fallback when the custom element never registers (no JS):
          a plain link to the video. */}
      <a href={`https://www.youtube.com/watch?v=${id}`}>
        Watch &ldquo;{title}&rdquo; on YouTube
      </a>
    </lite-youtube>
  );
};

export default Youtube;
