"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Ripple {
  id: number;
  x: number;
  y: number;
}

export function useRipple() {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const trigger = useCallback((x: number, y: number) => {
    const id = Date.now() + Math.random();
    setRipples((prev) => [...prev, { id, x, y }]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 800);
  }, []);

  const rippleElement = (
    <AnimatePresence>
      {ripples.map((r) => (
        <motion.div
          key={r.id}
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: 3, opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="absolute w-8 h-8 rounded-full pointer-events-none"
          style={{
            left: r.x - 16,
            top: r.y - 16,
            background: "radial-gradient(circle, rgba(255,215,0,0.6) 0%, rgba(255,215,0,0) 70%)",
            boxShadow: "0 0 20px rgba(255,215,0,0.4), 0 0 40px rgba(255,180,0,0.2)",
          }}
        />
      ))}
    </AnimatePresence>
  );

  return { trigger, rippleElement };
}

interface RippleCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export function RippleCard({ children, className = "", onClick }: RippleCardProps) {
  const [clicked, setClicked] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    setClicked(true);
    setTimeout(() => setClicked(false), 300);
    onClick?.(e);
  };

  return (
    <motion.div
      onClick={handleClick}
      className={`cursor-pointer ${className}`}
      animate={{ scale: clicked ? 0.95 : 1 }}
      transition={{ duration: 0.15 }}
    >
      {children}
    </motion.div>
  );
}
