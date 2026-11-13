import ImageFallback from "@/helpers/ImageFallback";
import type { LogoMarqueeType } from "@/types/index";
import { motion, useAnimationControls, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

interface PageData {
  notFound?: boolean;
  content?: string;
  frontmatter: LogoMarqueeType;
}

const LOGO_GAP_PX = 72;
const MARQUEE_SPEED_PX_PER_SECOND = 90;

const TrustedClients = ({ data }: { data: PageData }) => {
  const section = data.frontmatter;
  const groupRef = useRef<HTMLDivElement>(null);
  const [groupWidth, setGroupWidth] = useState(0);
  // Pause control + reduced-motion (H8): the infinite loop is driven
  // by motion, so the CSS prefers-reduced-motion rule cannot stop it.
  const [paused, setPaused] = useState(false);
  const reduceMotion = useReducedMotion();
  const controls = useAnimationControls();

  useEffect(() => {
    const updateGroupWidth = () => {
      setGroupWidth(groupRef.current?.scrollWidth ?? 0);
    };

    updateGroupWidth();

    window.addEventListener("resize", updateGroupWidth);

    return () => {
      window.removeEventListener("resize", updateGroupWidth);
    };
  }, [section.items]);

  if (!section.items.length) {
    return null;
  }

  const loopDistance = groupWidth + LOGO_GAP_PX;
  const loopDuration = loopDistance
    ? loopDistance / MARQUEE_SPEED_PX_PER_SECOND
    : 12;

  // Drive the loop through controls so it can be stopped (paused /
  // reduced-motion) and restarted. Stopping freezes the strip at its
  // current position; restarting re-enters at x=0, which looks the
  // same as the loop wrap because the list is duplicated.
  useEffect(() => {
    if (!loopDistance || reduceMotion || paused) {
      controls.stop();
      return;
    }
    controls.start({
      x: [0, -loopDistance],
      transition: {
        x: {
          repeat: Infinity,
          repeatType: "loop",
          duration: loopDuration,
          ease: "linear",
        },
      },
    });
  }, [controls, loopDistance, loopDuration, paused, reduceMotion]);

  const renderLogoList = (listKey: string, hidden = false) => (
    <div
      ref={hidden ? undefined : groupRef}
      className="flex shrink-0 gap-18"
      aria-hidden={hidden}
    >
      {section.items.map((logo, index) => (
        <div key={`${listKey}-${index}`} className="shrink-0">
          <ImageFallback
            src={logo?.logo}
            alt={logo.name || ""}
            className="w-45 grayscale opacity-70"
            width="190"
            height="40"
          />
        </div>
      ))}
    </div>
  );

  return (
    <section>
      <div className="main-container">
        <div className="container">
          <div className="py-20">
            <h2 className="text-h6 text-center mb-10 text-text-light font-medium">
              {data.frontmatter.title}
            </h2>
            <div
              className="z-10 flex items-center relative  overflow-hidden"
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
              onFocus={() => setPaused(true)}
              onBlur={() => setPaused(false)}
            >
              <motion.div
                className="flex w-max gap-18"
                animate={controls}
                style={{ willChange: "transform" }}
              >
                {renderLogoList("primary")}
                {renderLogoList("duplicate", true)}
              </motion.div>
            </div>
            {!reduceMotion && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={() => setPaused((p) => !p)}
                  aria-pressed={paused}
                  className="btn btn-dark cursor-pointer"
                >
                  {paused ? "Play logos" : "Pause logos"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustedClients;
