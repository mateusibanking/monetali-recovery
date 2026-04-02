const MonetaliLogo = ({ className = '' }: { className?: string }) => (
  <div className={`flex flex-col items-center ${className}`}>
    <svg width="48" height="56" viewBox="0 0 48 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Letter "m" in serif style */}
      <text
        x="24"
        y="38"
        textAnchor="middle"
        fontFamily="'Arvo', serif"
        fontSize="42"
        fontWeight="400"
        fill="white"
      >
        m
      </text>
      {/* Gold underline bar */}
      <rect x="6" y="46" width="36" height="3" rx="1.5" fill="#D4A843" />
    </svg>
    <span
      className="mt-1 text-sm tracking-[0.2em] text-sidebar-foreground"
      style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 300 }}
    >
      monetali
    </span>
  </div>
);

export default MonetaliLogo;
