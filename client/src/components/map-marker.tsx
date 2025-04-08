interface MapMarkerProps {
  filled?: boolean;
}

export default function MapMarker({ filled = false }: MapMarkerProps): string {
  // SVG string for coffee cup marker
  const svgMarker = `
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <filter id="shadow" x="0" y="0" width="200%" height="200%">
        <feOffset result="offOut" in="SourceAlpha" dx="0" dy="1" />
        <feGaussianBlur result="blurOut" in="offOut" stdDeviation="1" />
        <feBlend in="SourceGraphic" in2="blurOut" mode="normal" />
      </filter>
      <circle cx="20" cy="20" r="16" fill="${filled ? '#A0522D' : 'white'}" stroke="#A0522D" stroke-width="2.5" filter="url(#shadow)" />
      <path d="M27 17h1a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-1M13 25h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2H11v10a2 2 0 0 0 2 2Z" stroke="${filled ? 'white' : '#A0522D'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M16 25v2M20 25v2M14 13v-2M18 13v-2M22 13v-2" stroke="${filled ? 'white' : '#A0522D'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svgMarker)}`;
}
