// Puedes reemplazar fácilmente cada SVG con tus propias imágenes

export const toothSVGs = {
  // MOLARES (dientes 18, 17, 28, 27, 38, 37, 48, 47)
  molar: {
    frontal: `
      <svg viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg">
         Corona con dos cúspides visibles 
        <defs>
          <linearGradient id="enamelGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#FFFFFF;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#F5F5F5;stop-opacity:1" />
          </linearGradient>
          <linearGradient id="rootGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#E8DCC8;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#D4C5A9;stop-opacity:1" />
          </linearGradient>
        </defs>
        
         Raíces 
        <path d="M 35 85 L 30 130 Q 30 135 35 135 L 40 135 Q 42 135 42 130 L 42 85 Z" 
              fill="url(#rootGrad)" stroke="#B8A88A" strokeWidth="1.5"/>
        <path d="M 58 85 L 58 130 Q 58 135 63 135 L 68 135 Q 70 135 70 130 L 65 85 Z" 
              fill="url(#rootGrad)" stroke="#B8A88A" strokeWidth="1.5"/>
        
         Corona 
        <ellipse cx="50" cy="50" rx="35" ry="40" fill="url(#enamelGrad)" stroke="#AAA" strokeWidth="2"/>
        
         Cúspides 
        <path d="M 30 45 Q 35 25 40 45" fill="none" stroke="#CCC" strokeWidth="1.5"/>
        <path d="M 60 45 Q 65 25 70 45" fill="none" stroke="#CCC" strokeWidth="1.5"/>
        
         Línea de unión corona-raíz 
        <line x1="15" y1="85" x2="85" y2="85" stroke="#B8A88A" strokeWidth="2"/>
      </svg>
    `,
    occlusal: `
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="occlusalGrad">
            <stop offset="0%" style="stop-color:#FFFFFF;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#F0F0F0;stop-opacity:1" />
          </radialGradient>
        </defs>
        
         Contorno oclusal del molar 
        <path d="M 20 30 Q 15 50 20 70 Q 30 85 50 85 Q 70 85 80 70 Q 85 50 80 30 Q 70 15 50 15 Q 30 15 20 30 Z" 
              fill="url(#occlusalGrad)" stroke="#999" strokeWidth="2"/>
        
         Fosas y fisuras 
        <path d="M 35 35 Q 50 45 65 35" fill="none" stroke="#BBB" strokeWidth="2"/>
        <path d="M 35 65 Q 50 55 65 65" fill="none" stroke="#BBB" strokeWidth="2"/>
        <line x1="50" y1="25" x2="50" y2="75" stroke="#BBB" strokeWidth="1.5"/>
        
         Cúspides (4 para molar) 
        <circle cx="35" cy="35" r="3" fill="#DDD"/>
        <circle cx="65" cy="35" r="3" fill="#DDD"/>
        <circle cx="35" cy="65" r="3" fill="#DDD"/>
        <circle cx="65" cy="65" r="3" fill="#DDD"/>
      </svg>
    `,
    lateral: `
      <svg viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="lateralEnamel" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#F5F5F5;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#FFFFFF;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#F5F5F5;stop-opacity:1" />
          </linearGradient>
        </defs>
        
         Raíz 
        <path d="M 40 85 L 38 130 Q 38 135 43 135 L 57 135 Q 62 135 62 130 L 60 85 Z" 
              fill="url(#rootGrad)" stroke="#B8A88A" strokeWidth="1.5"/>
        
         Corona vista lateral 
        <path d="M 25 50 Q 25 25 50 20 Q 75 25 75 50 L 75 80 Q 70 85 50 85 Q 30 85 25 80 Z" 
              fill="url(#lateralEnamel)" stroke="#AAA" strokeWidth="2"/>
        
         Contorno oclusal 
        <path d="M 30 50 Q 35 35 50 30 Q 65 35 70 50" fill="none" stroke="#CCC" strokeWidth="1.5"/>
        
         Línea cervical 
        <line x1="25" y1="85" x2="75" y2="85" stroke="#B8A88A" strokeWidth="2"/>
      </svg>
    `,
  },

  // PREMOLARES (dientes 15, 14, 25, 24, 35, 34, 45, 44)
  premolar: {
    frontal: `
      <svg viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg">
         Raíz única 
        <path d="M 42 85 L 40 130 Q 40 135 45 135 L 55 135 Q 60 135 60 130 L 58 85 Z" 
              fill="url(#rootGrad)" stroke="#B8A88A" strokeWidth="1.5"/>
        
         Corona más pequeña que molar 
        <ellipse cx="50" cy="50" rx="28" ry="35" fill="url(#enamelGrad)" stroke="#AAA" strokeWidth="2"/>
        
         Cúspides (2 para premolar) 
        <path d="M 35 45 Q 40 30 45 45" fill="none" stroke="#CCC" strokeWidth="1.5"/>
        <path d="M 55 45 Q 60 30 65 45" fill="none" stroke="#CCC" strokeWidth="1.5"/>
        
         Línea cervical 
        <line x1="22" y1="85" x2="78" y2="85" stroke="#B8A88A" strokeWidth="2"/>
      </svg>
    `,
    occlusal: `
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
         Forma ovalada característica del premolar 
        <ellipse cx="50" cy="50" rx="25" ry="32" fill="url(#occlusalGrad)" stroke="#999" strokeWidth="2"/>
        
         Surco central 
        <line x1="50" y1="25" x2="50" y2="75" stroke="#BBB" strokeWidth="2"/>
        
         Cúspides vestibular y lingual 
        <circle cx="50" cy="35" r="3" fill="#DDD"/>
        <circle cx="50" cy="65" r="3" fill="#DDD"/>
      </svg>
    `,
    lateral: `
      <svg viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg">
         Raíz 
        <path d="M 43 85 L 42 130 Q 42 135 47 135 L 53 135 Q 58 135 58 130 L 57 85 Z" 
              fill="url(#rootGrad)" stroke="#B8A88A" strokeWidth="1.5"/>
        
         Corona 
        <path d="M 30 50 Q 30 30 50 25 Q 70 30 70 50 L 70 80 Q 65 85 50 85 Q 35 85 30 80 Z" 
              fill="url(#lateralEnamel)" stroke="#AAA" strokeWidth="2"/>
        
         Cúspide prominente 
        <path d="M 35 50 Q 40 35 50 30 Q 60 35 65 50" fill="none" stroke="#CCC" strokeWidth="1.5"/>
        
        <line x1="30" y1="85" x2="70" y2="85" stroke="#B8A88A" strokeWidth="2"/>
      </svg>
    `,
  },

  // CANINOS (dientes 13, 23, 33, 43)
  canino: {
    frontal: `
      <svg viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg">
         Raíz larga y única 
        <path d="M 45 85 L 44 130 Q 44 135 48 135 L 52 135 Q 56 135 56 130 L 55 85 Z" 
              fill="url(#rootGrad)" stroke="#B8A88A" strokeWidth="1.5"/>
        
         Corona triangular característica 
        <path d="M 30 70 L 50 20 L 70 70 Q 70 85 50 85 Q 30 85 30 70 Z" 
              fill="url(#enamelGrad)" stroke="#AAA" strokeWidth="2"/>
        
         Cúspide puntiaguda 
        <path d="M 45 40 L 50 20 L 55 40" fill="none" stroke="#CCC" strokeWidth="1.5"/>
        
        <line x1="30" y1="85" x2="70" y2="85" stroke="#B8A88A" strokeWidth="2"/>
      </svg>
    `,
    occlusal: `
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
         Forma triangular/romboidal 
        <path d="M 50 25 L 65 50 L 50 75 L 35 50 Z" 
              fill="url(#occlusalGrad)" stroke="#999" strokeWidth="2"/>
        
         Cúspide central 
        <circle cx="50" cy="50" r="4" fill="#DDD"/>
      </svg>
    `,
    lateral: `
      <svg viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg">
         Raíz 
        <path d="M 45 85 L 44 130 Q 44 135 48 135 L 52 135 Q 56 135 56 130 L 55 85 Z" 
              fill="url(#rootGrad)" stroke="#B8A88A" strokeWidth="1.5"/>
        
         Corona puntiaguda 
        <path d="M 35 70 Q 35 50 50 25 Q 65 50 65 70 L 65 80 Q 60 85 50 85 Q 40 85 35 80 Z" 
              fill="url(#lateralEnamel)" stroke="#AAA" strokeWidth="2"/>
        
         Cúspide 
        <path d="M 40 60 Q 45 35 50 25 Q 55 35 60 60" fill="none" stroke="#CCC" strokeWidth="1.5"/>
        
        <line x1="35" y1="85" x2="65" y2="85" stroke="#B8A88A" strokeWidth="2"/>
      </svg>
    `,
  },

  // INCISIVOS (dientes 12, 11, 21, 22, 32, 31, 41, 42)
  incisivo: {
    frontal: `
      <svg viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg">
         Raíz cónica 
        <path d="M 46 85 L 45 130 Q 45 135 49 135 L 51 135 Q 55 135 55 130 L 54 85 Z" 
              fill="url(#rootGrad)" stroke="#B8A88A" strokeWidth="1.5"/>
        
         Corona rectangular con borde incisal 
        <rect x="32" y="30" width="36" height="55" rx="3" 
              fill="url(#enamelGrad)" stroke="#AAA" strokeWidth="2"/>
        
         Borde incisal 
        <line x1="32" y1="30" x2="68" y2="30" stroke="#BBB" strokeWidth="2"/>
        
         Línea cervical 
        <line x1="32" y1="85" x2="68" y2="85" stroke="#B8A88A" strokeWidth="2"/>
      </svg>
    `,
    occlusal: `
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
         Vista estrecha y alargada 
        <rect x="35" y="20" width="30" height="60" rx="4" 
              fill="url(#occlusalGrad)" stroke="#999" strokeWidth="2"/>
        
         Línea central 
        <line x1="50" y1="20" x2="50" y2="80" stroke="#CCC" strokeWidth="1"/>
      </svg>
    `,
    lateral: `
      <svg viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg">
         Raíz 
        <path d="M 46 85 L 45 130 Q 45 135 49 135 L 51 135 Q 55 135 55 130 L 54 85 Z" 
              fill="url(#rootGrad)" stroke="#B8A88A" strokeWidth="1.5"/>
        
         Corona delgada 
        <path d="M 38 70 Q 38 40 50 25 Q 62 40 62 70 L 62 80 Q 58 85 50 85 Q 42 85 38 80 Z" 
              fill="url(#lateralEnamel)" stroke="#AAA" strokeWidth="2"/>
        
         Borde incisal 
        <line x1="45" y1="25" x2="55" y2="25" stroke="#BBB" strokeWidth="2"/>
        
        <line x1="38" y1="85" x2="62" y2="85" stroke="#B8A88A" strokeWidth="2"/>
      </svg>
    `,
  },
}

// Función helper para obtener el tipo de diente según su número
export function getToothType(toothNumber: number): keyof typeof toothSVGs {
  const lastDigit = toothNumber % 10

  if (lastDigit === 8 || lastDigit === 7) return "molar"
  if (lastDigit === 6 || lastDigit === 5 || lastDigit === 4) return "premolar"
  if (lastDigit === 3) return "canino"
  return "incisivo" // 1, 2
}
