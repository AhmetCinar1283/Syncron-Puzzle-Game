'use client';

export function ConfettiOverlay() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: 50 }).map((_, i) => {
        const left = Math.random() * 100; // horizontal start %
        const delay = Math.random() * 3; // animation delay
        const duration = Math.random() * 2 + 2.5; // animation speed
        const size = Math.random() * 8 + 6;
        const colors = ['#ffd700', '#00ff88', '#00c4ff', '#ff007f', '#ffaa00'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        return (
          <div
            key={i}
            className="confetti"
            style={{
              left: `${left}%`,
              backgroundColor: randomColor,
              width: `${size}px`,
              height: `${size * 1.5}px`,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
            }}
          />
        );
      })}
    </div>
  );
}
