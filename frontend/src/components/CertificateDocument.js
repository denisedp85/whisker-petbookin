import React from 'react';
import PetbookinSeal from './PetbookinSeal';

export default function CertificateDocument({ cert }) {
  if (!cert) return null;

  const hasPedigree = cert.pedigree?.sire?.name || cert.pedigree?.dam?.name;

  return (
    <div className="relative bg-[#FFFEF8] rounded-lg overflow-hidden" style={{ fontFamily: "'Times New Roman', Georgia, 'Palatino Linotype', serif" }} data-testid="certificate-document">
      {/* Outer gold border */}
      <div className="absolute inset-0 border-[4px] border-[#C6993A] rounded-lg pointer-events-none" />
      <div className="absolute inset-[6px] border-[2px] border-[#C6993A]/60 rounded-md pointer-events-none" />
      <div className="absolute inset-[10px] border-[1px] border-[#C6993A]/30 rounded pointer-events-none" />

      {/* Ornate corner decorations */}
      {['top-4 left-4', 'top-4 right-4 scale-x-[-1]', 'bottom-4 left-4 scale-y-[-1]', 'bottom-4 right-4 scale-[-1]'].map((pos, i) => (
        <div key={i} className={`absolute ${pos} w-16 h-16 pointer-events-none`}>
          <svg viewBox="0 0 60 60" fill="none" className="w-full h-full">
            <path d="M5 5 Q5 30 30 30 Q5 30 5 55" stroke="#C6993A" strokeWidth="1.5" fill="none" />
            <path d="M8 5 Q8 25 25 25" stroke="#C6993A" strokeWidth="0.8" fill="none" opacity="0.5" />
            <circle cx="5" cy="5" r="3" fill="#C6993A" opacity="0.3" />
            <path d="M5 5 L20 5" stroke="#C6993A" strokeWidth="0.8" opacity="0.4" />
            <path d="M5 5 L5 20" stroke="#C6993A" strokeWidth="0.8" opacity="0.4" />
          </svg>
        </div>
      ))}

      {/* Background watermark */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
        <PetbookinSeal size={500} variant="stamp" />
      </div>

      {/* Decorative top border pattern */}
      <div className="relative mx-14 mt-14">
        <div className="h-px bg-gradient-to-r from-transparent via-[#C6993A] to-transparent" />
        <div className="flex justify-center -mt-1.5">
          <div className="w-3 h-3 rotate-45 border border-[#C6993A] bg-[#FFFEF8]" />
        </div>
      </div>

      <div className="relative px-10 sm:px-14 pb-12 pt-6">
        {/* Header with seal */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <PetbookinSeal size={90} variant="stamp" />
              <div className="absolute inset-0 rounded-full" style={{ boxShadow: 'inset 0 2px 8px rgba(198,153,58,0.15)' }} />
            </div>
          </div>
          <h1 className="text-[22px] sm:text-[26px] font-bold tracking-[0.12em] uppercase text-[#2A2016] leading-tight">
            Official Certificate of Registration
          </h1>
          <div className="flex items-center justify-center gap-3 mt-2">
            <div className="w-12 h-px bg-[#C6993A]" />
            <span className="text-[10px] tracking-[0.25em] uppercase text-[#C6993A] font-semibold">
              Petbookin Official Registry
            </span>
            <div className="w-12 h-px bg-[#C6993A]" />
          </div>
          <p className="text-[10px] tracking-[0.15em] text-[#8C7D68] mt-1 italic">
            This document certifies the registration of the animal described herein
          </p>
        </div>

        {/* Certificate number */}
        <div className="text-center mb-8">
          <div className="inline-block px-6 py-2 border-2 border-[#C6993A]/40 rounded bg-[#C6993A]/[0.04]">
            <span className="text-[10px] tracking-[0.2em] uppercase text-[#8C7D68] block">Registration Number</span>
            <span className="text-lg font-bold tracking-[0.15em] text-[#C6993A]" style={{ fontFamily: "'Courier New', monospace" }}>
              {cert.certificate_id}
            </span>
          </div>
        </div>

        {/* Main info grid */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-[#C6993A]/20" />
            <span className="text-[9px] tracking-[0.25em] uppercase text-[#C6993A] font-bold">Registered Animal</span>
            <div className="flex-1 h-px bg-[#C6993A]/20" />
          </div>

          <div className="grid grid-cols-2 gap-x-10 gap-y-0">
            {[
              ['Registered Name', cert.pet_info?.name],
              ['Breed', cert.pet_info?.breed],
              ['Species', cert.pet_info?.species?.charAt(0).toUpperCase() + cert.pet_info?.species?.slice(1)],
              ['Date of Birth', cert.pet_info?.dob || '---'],
              ['Sex', cert.pet_info?.gender ? cert.pet_info.gender.charAt(0).toUpperCase() + cert.pet_info.gender.slice(1) : '---'],
              ['Color & Markings', cert.pet_info?.color_markings || '---'],
              ['Microchip No.', cert.pet_info?.microchip_id || '---'],
              ['Kennel', cert.kennel_name || '---'],
            ].map(([label, value]) => (
              <div key={label} className="py-2.5 border-b border-[#C6993A]/10 flex justify-between items-baseline">
                <span className="text-[11px] text-[#8C7D68] tracking-wide">{label}</span>
                <span className="text-[13px] font-semibold text-[#2A2016] text-right ml-2">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pedigree section */}
        {hasPedigree && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-[#C6993A]/20" />
              <span className="text-[9px] tracking-[0.25em] uppercase text-[#C6993A] font-bold">Pedigree</span>
              <div className="flex-1 h-px bg-[#C6993A]/20" />
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Sire */}
              <div className="border border-[#C6993A]/20 rounded-lg p-4 bg-[#C6993A]/[0.02] relative">
                <div className="absolute -top-2.5 left-4 px-2 bg-[#FFFEF8]">
                  <span className="text-[9px] tracking-[0.2em] uppercase text-[#C6993A] font-bold">Sire (Father)</span>
                </div>
                <div className="mt-1 space-y-1.5">
                  <p className="text-[14px] font-semibold text-[#2A2016]">{cert.pedigree.sire?.name || 'Unknown'}</p>
                  {cert.pedigree.sire?.breed && (
                    <p className="text-[11px] text-[#8C7D68]">{cert.pedigree.sire.breed}</p>
                  )}
                  {cert.pedigree.sire?.certificate_id && (
                    <p className="text-[10px] text-[#C6993A] tracking-wide" style={{ fontFamily: "'Courier New', monospace" }}>
                      Reg: {cert.pedigree.sire.certificate_id}
                    </p>
                  )}
                </div>
              </div>
              {/* Dam */}
              <div className="border border-[#C6993A]/20 rounded-lg p-4 bg-[#C6993A]/[0.02] relative">
                <div className="absolute -top-2.5 left-4 px-2 bg-[#FFFEF8]">
                  <span className="text-[9px] tracking-[0.2em] uppercase text-[#C6993A] font-bold">Dam (Mother)</span>
                </div>
                <div className="mt-1 space-y-1.5">
                  <p className="text-[14px] font-semibold text-[#2A2016]">{cert.pedigree.dam?.name || 'Unknown'}</p>
                  {cert.pedigree.dam?.breed && (
                    <p className="text-[11px] text-[#8C7D68]">{cert.pedigree.dam.breed}</p>
                  )}
                  {cert.pedigree.dam?.certificate_id && (
                    <p className="text-[10px] text-[#C6993A] tracking-wide" style={{ fontFamily: "'Courier New', monospace" }}>
                      Reg: {cert.pedigree.dam.certificate_id}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Breeder info */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-[#C6993A]/20" />
            <span className="text-[9px] tracking-[0.25em] uppercase text-[#C6993A] font-bold">Breeder Information</span>
            <div className="flex-1 h-px bg-[#C6993A]/20" />
          </div>
          <div className="grid grid-cols-2 gap-x-10">
            <div className="py-2 border-b border-[#C6993A]/10 flex justify-between items-baseline">
              <span className="text-[11px] text-[#8C7D68]">Breeder ID</span>
              <span className="text-[12px] font-semibold text-[#2A2016]" style={{ fontFamily: "'Courier New', monospace" }}>{cert.breeder_pbk_id}</span>
            </div>
            <div className="py-2 border-b border-[#C6993A]/10 flex justify-between items-baseline">
              <span className="text-[11px] text-[#8C7D68]">Kennel</span>
              <span className="text-[12px] font-semibold text-[#2A2016]">{cert.kennel_name || '---'}</span>
            </div>
          </div>
        </div>

        {/* Transfer history */}
        {cert.transfer_history?.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px bg-[#C6993A]/20" />
              <span className="text-[9px] tracking-[0.25em] uppercase text-[#C6993A] font-bold">Ownership Transfer Record</span>
              <div className="flex-1 h-px bg-[#C6993A]/20" />
            </div>
            {cert.transfer_history.map((t, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5 text-[11px] text-[#8C7D68]">
                <span className="font-semibold text-[#2A2016]">{t.from_name}</span>
                <span>&rarr;</span>
                <span className="font-semibold text-[#2A2016]">{t.to_name}</span>
                <span className="ml-auto">{new Date(t.transferred_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
            ))}
          </div>
        )}

        {/* Stamp and signature area */}
        <div className="flex items-end justify-between mt-8 pt-6">
          <div className="text-center">
            <div className="w-40 h-px bg-[#2A2016]/30 mb-1" />
            <span className="text-[9px] tracking-[0.15em] text-[#8C7D68]">Authorized Registrar</span>
          </div>

          {/* Official stamp - rotated slightly for authenticity */}
          <div className="relative -rotate-6 opacity-80">
            <PetbookinSeal size={100} variant="stamp" />
            <div className="absolute inset-0 rounded-full mix-blend-multiply" />
          </div>

          <div className="text-center">
            <div className="w-40 h-px bg-[#2A2016]/30 mb-1" />
            <span className="text-[9px] tracking-[0.15em] text-[#8C7D68]">Date of Issue</span>
            <p className="text-[11px] text-[#2A2016] mt-0.5">
              {new Date(cert.issued_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Bottom decorative border */}
        <div className="mt-8">
          <div className="flex justify-center mb-1.5">
            <div className="w-3 h-3 rotate-45 border border-[#C6993A] bg-[#FFFEF8]" />
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-[#C6993A] to-transparent" />
        </div>

        {/* Fine print */}
        <p className="text-center text-[8px] text-[#8C7D68]/60 mt-4 tracking-wide">
          This certificate is issued by Petbookin Official Registry and is valid for the lifetime of the registered animal.
          Verification: petbookin.com/verify/{cert.certificate_id}
        </p>
      </div>
    </div>
  );
}
