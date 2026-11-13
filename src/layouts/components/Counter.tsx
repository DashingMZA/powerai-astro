import React, { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import { fadeInUpVariants, useHydrated } from "@/lib/animations";

export interface CounterProps {
  target: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  startDelay?: number;
}

const Counter: React.FC<CounterProps> = ({
  target,
  duration = 2000,
  prefix = "",
  suffix = "",
  className = "counter",
  startDelay = 0,
}) => {
  const spanRef = useRef<HTMLSpanElement>(null);
  const hydrated = useHydrated();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    // Reduced motion: leave the SSR final value in place — counting
    // up is decoration, not content.
    if (reduceMotion) return;
    let frame: number;
    let startTime: number | null = null;
    let observer: IntersectionObserver | null = null;

    const animateCount = (
      element: HTMLElement,
      start: number,
      end: number,
      duration: number,
      prefix: string,
      suffix: string,
    ) => {
      prefix = prefix || "";
      suffix = suffix || "";
      startTime = null;

      function step(timestamp: number) {
        if (!startTime) {
          startTime = timestamp;
        }
        const progress = Math.min((timestamp - startTime) / duration, 1);
        const value = Math.floor(progress * (end - start) + start);
        element.textContent = prefix + value + suffix;
        if (progress < 1) {
          frame = requestAnimationFrame(step);
        }
      }
      frame = requestAnimationFrame(step);
    };

    const startAnimation = () => {
      if (spanRef.current) {
        setTimeout(() => {
          animateCount(spanRef.current!, 0, target, duration, prefix, suffix);
        }, startDelay);
      }
    };

    if (spanRef.current) {
      observer = new window.IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              startAnimation();
              observer?.disconnect();
            }
          });
        },
        {
          threshold: 0.1,
          rootMargin: "0px 0px -50px 0px",
        },
      );
      observer.observe(spanRef.current);
    }

    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [target, duration, prefix, suffix, startDelay, reduceMotion]);

  return (
    <motion.span
      ref={spanRef}
      // No-JS/hydration-failure safe: the SSR HTML ships the final
      // value visible (initial={false}); the fade-in only engages
      // once JS is running.
      initial={hydrated && !reduceMotion ? "hidden" : false}
      whileInView="visible"
      viewport={{ once: true, margin: "0px", amount: 0.05 }}
      variants={fadeInUpVariants}
      className={className}
      data-target={target}
      data-duration={duration}
      data-prefix={prefix}
      data-suffix={suffix}
      data-delay={startDelay}
    >
      {prefix}
      {target}
      {suffix}
    </motion.span>
  );
};

export default Counter;
