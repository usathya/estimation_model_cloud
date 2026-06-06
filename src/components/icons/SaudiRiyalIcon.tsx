import React from 'react';

export const SaudiRiyalIcon = ({ className = "w-5 h-5" }: { className?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Left stem with elegant sweep at the bottom */}
      <path d="M 40 10 L 40 54 C 40 68, 30 74, 15 74" />
      
      {/* Left crossing slash */}
      <path d="M 18 55 L 45 45" />
      
      {/* Right vertical stem */}
      <path d="M 58 14 L 58 62" />
      
      {/* Top parallel sheared bar crossing right stem */}
      <path d="M 47 43 L 81 35" />
      
      {/* Middle parallel sheared bar crossing right stem */}
      <path d="M 47 51 L 81 43" />
      
      {/* Bottom parallel sheared bar on the right */}
      <path d="M 54 80 L 81 71" />
    </svg>
  );
};
