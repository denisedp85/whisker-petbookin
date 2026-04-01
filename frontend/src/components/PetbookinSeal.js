import React from 'react';

export default function PetbookinSeal({ size = 180 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" data-testid="petbookin-seal">
      {/* Outer ring */}
      <circle cx="100" cy="100" r="96" stroke="#FF7A6A" strokeWidth="2.5" fill="none" />
      <circle cx="100" cy="100" r="88" stroke="#F2B824" strokeWidth="1.5" fill="none" />

      {/* Decorative dots around border */}
      {Array.from({ length: 36 }).map((_, i) => {
        const angle = (i * 10) * Math.PI / 180;
        const x = 100 + 92 * Math.cos(angle);
        const y = 100 + 92 * Math.sin(angle);
        return <circle key={i} cx={x} cy={y} r="1.2" fill="#FF7A6A" opacity="0.5" />;
      })}

      {/* Inner circle */}
      <circle cx="100" cy="100" r="60" stroke="#FF7A6A" strokeWidth="1" fill="none" opacity="0.3" />

      {/* Paw print center */}
      {/* Main pad */}
      <ellipse cx="100" cy="108" rx="14" ry="12" fill="#FF7A6A" />
      {/* Toes */}
      <ellipse cx="84" cy="92" rx="7" ry="8" fill="#FF7A6A" />
      <ellipse cx="96" cy="86" rx="6.5" ry="8" fill="#FF7A6A" />
      <ellipse cx="108" cy="86" rx="6.5" ry="8" fill="#FF7A6A" />
      <ellipse cx="118" cy="92" rx="7" ry="8" fill="#FF7A6A" />

      {/* Top text - PETBOOKIN */}
      <path id="topArc" d="M 30,100 A 70,70 0 0,1 170,100" fill="none" />
      <text fontSize="13" fontFamily="Outfit, sans-serif" fontWeight="700" fill="#28211E" letterSpacing="3">
        <textPath href="#topArc" startOffset="50%" textAnchor="middle">
          PETBOOKIN
        </textPath>
      </text>

      {/* Bottom text - OFFICIAL REGISTRY */}
      <path id="bottomArc" d="M 30,100 A 70,70 0 0,0 170,100" fill="none" />
      <text fontSize="9" fontFamily="Outfit, sans-serif" fontWeight="600" fill="#8C7D76" letterSpacing="2.5">
        <textPath href="#bottomArc" startOffset="50%" textAnchor="middle">
          OFFICIAL REGISTRY
        </textPath>
      </text>

      {/* Stars */}
      <text x="38" y="104" fontSize="10" fill="#F2B824">&#9733;</text>
      <text x="154" y="104" fontSize="10" fill="#F2B824">&#9733;</text>

      {/* Est text */}
      <text x="100" y="145" textAnchor="middle" fontSize="8" fontFamily="Outfit, sans-serif" fontWeight="500" fill="#8C7D76" letterSpacing="1.5">
        EST. 2026
      </text>
    </svg>
  );
}
