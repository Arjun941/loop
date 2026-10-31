"use client";

import { animate, useMotionValue, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const plain = new Intl.NumberFormat("en-IN");

// Counts up to its value once, on first render.
export function AnimatedNumber({ value, format = "number" }: { value: number; format?: "money" | "number" }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);
  const [display, setDisplay] = useState(0);
  const fmt = (n: number) => (format === "money" ? inr.format(n / 100) : plain.format(Math.round(n)));

  useEffect(() => {
    if (reduce) return;
    const controls = animate(mv, value, { duration: 0.9, ease: [0.22, 1, 0.36, 1], onUpdate: setDisplay });
    return () => controls.stop();
  }, [value, reduce, mv]);

  return <span className="tabular">{fmt(reduce ? value : display)}</span>;
}
