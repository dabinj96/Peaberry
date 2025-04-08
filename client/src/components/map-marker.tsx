interface MapMarkerProps {
  filled?: boolean;
}

export default function MapMarker({ filled = false }: MapMarkerProps): string {
  // More detailed SVG for coffee cup marker with better styling
  const primaryColor = "#A0522D"; // Coffee brown color
  const secondaryColor = filled ? "white" : primaryColor;
  const fillColor = filled ? primaryColor : "white";
  
  const svgMarker = `
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Drop shadow filter -->
      <filter id="shadow" x="0" y="0" width="200%" height="200%">
        <feOffset result="offOut" in="SourceAlpha" dx="0" dy="2" />
        <feGaussianBlur result="blurOut" in="offOut" stdDeviation="1.5" />
        <feColorMatrix result="matrixOut" in="blurOut" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
        <feBlend in="SourceGraphic" in2="matrixOut" mode="normal" />
      </filter>
      
      <!-- Background circle -->
      <circle cx="24" cy="24" r="20" fill="${fillColor}" stroke="${primaryColor}" stroke-width="2.5" filter="url(#shadow)" />
      
      <!-- Coffee cup icon -->
      <g transform="translate(8, 8) scale(1.1)">
        <!-- Mug body -->
        <path d="M23 9.5h2a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2M7 19.5h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2H5v10a2 2 0 0 0 2 2Z" 
              stroke="${secondaryColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        
        <!-- Steam and handles -->
        <path d="M9.5 19.5v2M14.5 19.5v2M8 5.5v-2M12 5.5v-2M16 5.5v-2" 
              stroke="${secondaryColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              
        <!-- Coffee inside mug (if favorite) -->
        ${filled ? `<path d="M7 14.5h12v3a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-3z" fill="${secondaryColor}" opacity="0.5" />` : ''}
      </g>
      
      <!-- Favorite star (if favorite) -->
      ${filled ? `
        <circle cx="38" cy="10" r="8" fill="#FFD700" stroke="${primaryColor}" stroke-width="1.5" />
        <path d="M38 5l1.5 3 3.5.5-2.5 2.5.5 3.5-3-1.5-3 1.5.5-3.5-2.5-2.5 3.5-.5z" fill="${primaryColor}" />
      ` : ''}
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svgMarker)}`;
}
