"use client";
import { useEffect, useRef } from "react";
import { motion, stagger, useAnimate, useInView } from "motion/react";
import { cn } from "~/lib/utils";

export const TextGenerateEffect = ({
  words,
  className,
  filter = true,
  duration = 0.5,
  textClassName,
  once = true,
}: {
  words: string;
  className?: string;
  filter?: boolean;
  duration?: number;
  textClassName?: string;
  once?: boolean;
}) => {
  const [scope, animate] = useAnimate();
  const isInView = useInView(scope, { once, amount: 0.15 });
  const wordsArray = words.split(" ");

  useEffect(() => {
    if (isInView) {
      animate(
        "span",
        {
          opacity: 1,
          filter: filter ? "blur(0px)" : "none",
        },
        {
          duration: duration ? duration : 1,
          delay: stagger(0.05),
        }
      );
    }
  }, [isInView, animate, filter, duration]);

  const renderWords = () => {
    return (
      <motion.div ref={scope}>
        {wordsArray.map((word, idx) => {
          return (
            <motion.span
              key={word + idx}
              className={cn("opacity-0 text-foreground", textClassName)}
              style={{
                filter: filter ? "blur(4px)" : "none",
              }}
            >
              {word}{" "}
            </motion.span>
          );
        })}
      </motion.div>
    );
  };

  return (
    <div className={cn("", className)}>
      <div className="mt-4">
        <div>
          {renderWords()}
        </div>
      </div>
    </div>
  );
};
