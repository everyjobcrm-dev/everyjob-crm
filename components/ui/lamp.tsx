"use client";
import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const LampContainer = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "relative flex min-h-[80vh] md:min-h-screen flex-col items-center justify-center overflow-x-hidden bg-obsidian w-full z-0",
        className
      )}
    >
      {/* 
        FIX 1: Added responsive scaling (scale-x, scale-y) to smoothly shrink the 960px lamp down on smaller screens. 
      */}
      <div className="relative flex w-full flex-1 min-h-[250px] sm:min-h-[360px] md:min-h-[420px] scale-x-[0.6] scale-y-[0.75] sm:scale-x-[0.8] sm:scale-y-[0.9] md:scale-x-100 md:scale-y-125 items-center justify-center isolate z-0 ">
        <motion.div
          initial={{ opacity: 0.5, width: "15rem" }}
          whileInView={{ opacity: 1, width: "30rem" }}
          viewport={{ once: true }}
          transition={{
            delay: 0.3,
            duration: 0.8,
            ease: "easeInOut",
          }}
          style={{
            backgroundImage: `conic-gradient(var(--conic-position), var(--tw-gradient-stops))`,
          }}
          className="absolute inset-auto right-1/2 h-56 overflow-visible w-[30rem] bg-gradient-conic from-[#c9a15b] via-transparent to-transparent text-cream [--conic-position:from_70deg_at_center_top]"
        >
          {/* FIX 2: Added [-webkit-mask-image] alongside standard [mask-image] for iOS/Mobile Safari support */}
          <div className="absolute w-[100%] left-0 bg-obsidian h-40 bottom-0 z-20 [mask-image:linear-gradient(to_top,white,transparent)] [-webkit-mask-image:linear-gradient(to_top,white,transparent)]" />
          <div className="absolute w-40 h-[100%] left-0 bg-obsidian bottom-0 z-20 [mask-image:linear-gradient(to_right,white,transparent)] [-webkit-mask-image:linear-gradient(to_right,white,transparent)]" />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0.5, width: "15rem" }}
          whileInView={{ opacity: 1, width: "30rem" }}
          viewport={{ once: true }}
          transition={{
            delay: 0.3,
            duration: 0.8,
            ease: "easeInOut",
          }}
          style={{
            backgroundImage: `conic-gradient(var(--conic-position), var(--tw-gradient-stops))`,
          }}
          className="absolute inset-auto left-1/2 h-56 w-[30rem] bg-gradient-conic from-transparent via-transparent to-[#c9a15b] text-cream [--conic-position:from_290deg_at_center_top]"
        >
          {/* FIX 2: Added [-webkit-mask-image] */}
          <div className="absolute w-40 h-[100%] right-0 bg-obsidian bottom-0 z-20 [mask-image:linear-gradient(to_left,white,transparent)] [-webkit-mask-image:linear-gradient(to_left,white,transparent)]" />
          <div className="absolute w-[100%] right-0 bg-obsidian h-40 bottom-0 z-20 [mask-image:linear-gradient(to_top,white,transparent)] [-webkit-mask-image:linear-gradient(to_top,white,transparent)]" />
        </motion.div>
        
        {/* FIX 3: Changed w-full to w-[200vw] on backgrounds so scaling the parent doesn't expose the hard edges */}
        <div className="absolute top-1/2 h-48 w-[200vw] translate-y-12 scale-x-150 bg-obsidian blur-2xl"></div>
        <div className="absolute top-1/2 z-50 h-48 w-[200vw] bg-transparent opacity-10 backdrop-blur-md"></div>
        <div className="absolute inset-auto z-50 h-36 w-[28rem] -translate-y-1/2 rounded-full bg-[#c9a15b] opacity-40 blur-3xl"></div>
        
        <motion.div
          initial={{ width: "8rem" }}
          whileInView={{ width: "16rem" }}
          viewport={{ once: true }}
          transition={{
            delay: 0.3,
            duration: 0.8,
            ease: "easeInOut",
          }}
          className="absolute inset-auto z-30 h-36 w-64 -translate-y-[6rem] rounded-full bg-[#e3c789] blur-2xl"
        ></motion.div>
        
        <motion.div
          initial={{ width: "15rem" }}
          whileInView={{ width: "30rem" }}
          viewport={{ once: true }}
          transition={{
            delay: 0.3,
            duration: 0.8,
            ease: "easeInOut",
          }}
          className="absolute inset-auto z-50 h-0.5 w-[30rem] -translate-y-[7rem] bg-[#e3c789] "
        ></motion.div>

        {/* FIX 3: w-full changed to w-[200vw] to prevent layout cuts on smaller viewports */}
        <div className="absolute inset-auto z-40 h-44 w-[200vw] -translate-y-[12.5rem] bg-obsidian "></div>
      </div>

      <div className="relative z-50 flex w-full flex-col items-center px-5 pt-6 -mt-8 sm:-mt-12 md:-mt-16">
        {/* ambient cinematic glow behind the card/CTA content, so the
            section reads as lit rather than a flat black rectangle */}
        <div
          className="pointer-events-none absolute inset-x-0 top-1/3 -z-10 h-[36rem] opacity-70"
          style={{
            background:
              "radial-gradient(45% 55% at 50% 30%, rgba(201,161,91,0.16), transparent 70%)",
          }}
          aria-hidden
        />
        {children}
      </div>
    </div>
  );
};