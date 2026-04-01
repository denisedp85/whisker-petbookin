import React from 'react';

export default function PetbookinSeal({ size = 180, variant = 'full' }) {
  if (variant === 'stamp') {
    return (
      <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" data-testid="petbookin-stamp">
        {/* Gold outer ring with notches */}
        <circle cx="100" cy="100" r="97" stroke="#C6993A" strokeWidth="3" fill="none" />
        {Array.from({ length: 48 }).map((_, i) => {
          const angle = (i * 7.5) * Math.PI / 180;
          const x1 = 100 + 94 * Math.cos(angle);
          const y1 = 100 + 94 * Math.sin(angle);
          const x2 = 100 + 88 * Math.cos(angle);
          const y2 = 100 + 88 * Math.sin(angle);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#C6993A" strokeWidth="1.5" />;
        })}
        <circle cx="100" cy="100" r="86" stroke="#C6993A" strokeWidth="2" fill="none" />
        <circle cx="100" cy="100" r="82" stroke="#C6993A" strokeWidth="0.5" fill="none" />

        {/* Inner filled circle for stamp effect */}
        <circle cx="100" cy="100" r="78" fill="#C6993A" opacity="0.08" />

        {/* Paw print center - larger, bolder */}
        <ellipse cx="100" cy="112" rx="16" ry="13" fill="#C6993A" />
        <ellipse cx="82" cy="94" rx="8" ry="9.5" fill="#C6993A" />
        <ellipse cx="95" cy="87" rx="7.5" ry="9.5" fill="#C6993A" />
        <ellipse cx="109" cy="87" rx="7.5" ry="9.5" fill="#C6993A" />
        <ellipse cx="120" cy="94" rx="8" ry="9.5" fill="#C6993A" />

        {/* Top text - PETBOOKIN */}
        <path id="stampTopArc" d="M 25,100 A 75,75 0 0,1 175,100" fill="none" />
        <text fontSize="14" fontFamily="'Times New Roman', Georgia, serif" fontWeight="700" fill="#C6993A" letterSpacing="4">
          <textPath href="#stampTopArc" startOffset="50%" textAnchor="middle">
            PETBOOKIN
          </textPath>
        </text>

        {/* Bottom text */}
        <path id="stampBotArc" d="M 25,100 A 75,75 0 0,0 175,100" fill="none" />
        <text fontSize="10" fontFamily="'Times New Roman', Georgia, serif" fontWeight="600" fill="#C6993A" letterSpacing="3">
          <textPath href="#stampBotArc" startOffset="50%" textAnchor="middle">
            OFFICIAL REGISTRY
          </textPath>
        </text>

        {/* Decorative stars */}
        <text x="34" y="104" fontSize="12" fill="#C6993A">&#9733;</text>
        <text x="158" y="104" fontSize="12" fill="#C6993A">&#9733;</text>

        {/* Est */}
        <text x="100" y="148" textAnchor="middle" fontSize="9" fontFamily="'Times New Roman', Georgia, serif" fontWeight="600" fill="#C6993A" letterSpacing="2">
          EST. 2026
        </text>
      </svg>
    );
  }

  // Full color version
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" data-testid="petbookin-seal">
      <circle cx="100" cy="100" r="96" stroke="#FF7A6A" strokeWidth="2.5" fill="none" />
      <circle cx="100" cy="100" r="88" stroke="#F2B824" strokeWidth="1.5" fill="none" />
      {Array.from({ length: 36 }).map((_, i) => {
        const angle = (i * 10) * Math.PI / 180;
        const x = 100 + 92 * Math.cos(angle);
        const y = 100 + 92 * Math.sin(angle);
        return <circle key={i} cx={x} cy={y} r="1.2" fill="#FF7A6A" opacity="0.5" />;
      })}
      <circle cx="100" cy="100" r="60" stroke="#FF7A6A" strokeWidth="1" fill="none" opacity="0.3" />
      <ellipse cx="100" cy="108" rx="14" ry="12" fill="#FF7A6A" />
      <ellipse cx="84" cy="92" rx="7" ry="8" fill="#FF7A6A" />
      <ellipse cx="96" cy="86" rx="6.5" ry="8" fill="#FF7A6A" />
      <ellipse cx="108" cy="86" rx="6.5" ry="8" fill="#FF7A6A" />
      <ellipse cx="118" cy="92" rx="7" ry="8" fill="#FF7A6A" />
      <path id="topArc" d="M 30,100 A 70,70 0 0,1 170,100" fill="none" />
      <text fontSize="13" fontFamily="Outfit, sans-serif" fontWeight="700" fill="#28211E" letterSpacing="3">
        <textPath href="#topArc" startOffset="50%" textAnchor="middle">PETBOOKIN</textPath>
      </text>
      <path id="bottomArc" d="M 30,100 A 70,70 0 0,0 170,100" fill="none" />
      <text fontSize="9" fontFamily="Outfit, sans-serif" fontWeight="600" fill="#8C7D76" letterSpacing="2.5">
        <textPath href="#bottomArc" startOffset="50%" textAnchor="middle">OFFICIAL REGISTRY</textPath>
      </text>
      <text x="38" y="104" fontSize="10" fill="#F2B824">&#9733;</text>
      <text x="154" y="104" fontSize="10" fill="#F2B824">&#9733;</text>
      <text x="100" y="145" textAnchor="middle" fontSize="8" fontFamily="Outfit, sans-serif" fontWeight="500" fill="#8C7D76" letterSpacing="1.5">EST. 2026</text>
    </svg>
  );
}
