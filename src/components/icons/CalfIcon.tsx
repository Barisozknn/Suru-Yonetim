import React from 'react';

export const CalfIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    {/* Sol kulak */}
    <path d="M7 6C4.5 5 2 7 2 9c0 1.5 2 2.5 4 3" />
    
    {/* Sağ kulak */}
    <path d="M17 6c2.5-1 5 1 5 3 0 1.5-2 2.5-4 3" />
    
    {/* Kafa silüeti */}
    <path d="M7 6v1c0 3-1.5 5.5-2 7.5a1.5 1.5 0 0 0 1.5 2h11a1.5 1.5 0 0 0 1.5-2c-.5-2-2-4.5-2-7.5V6" />
    
    {/* Üst kafa (boynuzsuz buzağı kafası) */}
    <path d="M7 6c0-2.5 2-4 5-4s5 1.5 5 4" />
    
    {/* Burun kısmı */}
    <path d="M6 16.5v1.5a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3v-1.5" />
    
    {/* Burun delikleri */}
    <path d="M10 18.5h.01" />
    <path d="M14 18.5h.01" />
    
    {/* Gözler */}
    <path d="M9 11h.01" />
    <path d="M15 11h.01" />
  </svg>
);
