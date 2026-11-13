import { useEffect, useState } from "react";

type ImageFallbackProps = {
  src: string;
  fallback?: string;
} & React.ImgHTMLAttributes<HTMLImageElement>;

const ImageFallback = (props: ImageFallbackProps) => {
  const { src, fallback, ...rest } = props;
  const [imgSrc, setImgSrc] = useState(src);

  useEffect(() => {
    setImgSrc(src);
  }, [src]);

  return (
    <img
      {...rest}
      src={imgSrc}
      onError={() => {
        if (fallback) setImgSrc(fallback);
      }}
    />
  );
};

export default ImageFallback;
