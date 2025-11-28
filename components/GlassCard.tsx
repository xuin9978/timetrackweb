import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  intensity?: 'low' | 'medium' | 'high';
}

const GlassCard: React.FC<GlassCardProps> = React.memo(({ children, className = '', intensity = 'medium' }) => {
  // Ignoring intensity logic for pure light mode, using standard shadows
  const baseStyles = "relative overflow-hidden rounded-3xl bg-[#FAFAFA] shadow-sm border border-gray-100 transition-all duration-300";

  // Can use intensity for shadow depth if needed, but keeping it subtle for Apple style
  const shadowStyles = {
    low: "shadow-sm",
    medium: "shadow-md",
    high: "shadow-lg",
  };

  return (
    <div className={`${baseStyles} ${shadowStyles[intensity]} ${className}`}>
      {children}
    </div>
  );
});

export default GlassCard;