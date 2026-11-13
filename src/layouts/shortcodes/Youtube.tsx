import React, { useEffect } from "react";

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
    // @ts-expect-error - <lite-youtube> is a custom element registered by @justinribeiro/lite-youtube
    <lite-youtube
      className="rounded-lg"
      videoid={id}
      videotitle={title}
      {...rest}
    />
  );
};

export default Youtube;
