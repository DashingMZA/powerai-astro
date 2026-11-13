import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

function getYouTubeId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

interface VideoModalProps {
  videoUrl: string;
  onClose: () => void;
}

export default function VideoModal({ videoUrl, onClose }: VideoModalProps) {
  const videoId = getYouTubeId(videoUrl);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Focus moves into the dialog on open and returns to the trigger
    // on close; Tab is trapped inside while it is open (H1).
    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    // Inert the page behind the dialog so keyboard/AT users cannot
    // reach it while the modal is open. The portal renders the dialog
    // as a direct child of <body>, so every other body child is
    // background.
    const background = Array.from(document.body.children).filter(
      (el) => el !== dialogRef.current,
    );
    background.forEach((el) => el.setAttribute("inert", ""));
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      // Trap Tab/Shift+Tab among the dialog's focusable elements
      // (close button + iframe). Note: once focus enters the YouTube
      // iframe, Tab cycles inside the player until it leaves — the
      // trap cannot intercept keystrokes inside the iframe document.
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute("disabled"));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
      background.forEach((el) => el.removeAttribute("inert"));
      previouslyFocused?.focus();
    };
  }, [onClose]);

  if (!videoId) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Case study video"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-4xl">
        <button
          ref={closeButtonRef}
          onClick={onClose}
          className="absolute -top-10 right-0 text-white hover:text-gray transition-colors"
          aria-label="Close video"
        >
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        <div
          className="relative w-full bg-black rounded-lg overflow-hidden"
          style={{ paddingBottom: "56.25%" }}
        >
          <iframe
            className="absolute inset-0 w-full h-full"
            src={`https://www.youtube.com/embed/${videoId}`}
            title="Case Study Video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
