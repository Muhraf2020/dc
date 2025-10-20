// lib/customBannerGenerator.ts

interface BannerTheme {
  gradient: [string, string];
  pattern: 'medical' | 'modern' | 'professional' | 'minimal';
}

const THEMES: BannerTheme[] = [
  { gradient: ['#0ea5e9', '#0369a1'], pattern: 'medical' },      // Sky blue
  { gradient: ['#8b5cf6', '#6d28d9'], pattern: 'professional' }, // Purple
  { gradient: ['#06b6d4', '#0891b2'], pattern: 'modern' },       // Cyan
  { gradient: ['#10b981', '#059669'], pattern: 'medical' },      // Green
  { gradient: ['#f59e0b', '#d97706'], pattern: 'professional' }, // Amber
  { gradient: ['#ec4899', '#be185d'], pattern: 'modern' },       // Pink
  { gradient: ['#6366f1', '#4f46e5'], pattern: 'minimal' },      // Indigo
];

/**
 * Generate a custom banner with clinic name, rating, and optional favicon
 */
export function generateCustomBanner(
  clinicName: string,
  rating?: number,
  faviconUrl?: string,
  placeId?: string
): string {
  // Select theme based on clinic name (deterministic)
  const themeIndex = placeId 
    ? placeId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % THEMES.length
    : Math.floor(Math.random() * THEMES.length);
  
  const theme = THEMES[themeIndex];
  const [color1, color2] = theme.gradient;

  // Get pattern based on theme
  const pattern = getPattern(theme.pattern, color1);

  const svg = `
    <svg width="1600" height="400" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${color1};stop-opacity:0.95" />
          <stop offset="100%" style="stop-color:${color2};stop-opacity:0.95" />
        </linearGradient>
        ${pattern}
      </defs>
      
      <!-- Background gradient -->
      <rect width="1600" height="400" fill="url(#grad)" />
      
      <!-- Pattern overlay -->
      <rect width="1600" height="400" fill="url(#pattern)" opacity="0.1" />
      
      <!-- Content container -->
      <g transform="translate(80, 200)">
        ${faviconUrl ? `
          <!-- Favicon circle background -->
          <circle cx="40" cy="0" r="48" fill="white" opacity="0.2" />
          <circle cx="40" cy="0" r="42" fill="white" />
          
          <!-- Favicon placeholder (if loading fails) -->
          <text x="40" y="10" text-anchor="middle" 
                font-family="Arial, sans-serif" font-size="36" fill="${color1}">
            🏥
          </text>
        ` : `
          <!-- Default medical icon -->
          <circle cx="40" cy="0" r="48" fill="white" opacity="0.2" />
          <circle cx="40" cy="0" r="42" fill="white" />
          <text x="40" y="10" text-anchor="middle" 
                font-family="Arial, sans-serif" font-size="36">
            🏥
          </text>
        `}
        
        <!-- Clinic name -->
        <text x="120" y="10" 
              font-family="Arial, Helvetica, sans-serif" 
              font-size="56" 
              font-weight="bold" 
              fill="white"
              text-anchor="start">
          ${escapeXml(truncateText(clinicName, 35))}
        </text>
        
        ${rating ? `
          <!-- Rating badge -->
          <g transform="translate(120, 50)">
            <rect x="0" y="0" width="120" height="36" rx="18" fill="white" opacity="0.95" />
            <text x="18" y="24" font-family="Arial, sans-serif" font-size="20" fill="#fbbf24">★</text>
            <text x="45" y="24" font-family="Arial, sans-serif" font-size="20" font-weight="600" fill="${color1}">
              ${rating.toFixed(1)}
            </text>
          </g>
        ` : ''}
      </g>
      
      <!-- Bottom accent line -->
      <rect x="0" y="390" width="1600" height="10" fill="white" opacity="0.2" />
    </svg>
  `;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

/**
 * Generate pattern based on theme type
 */
function getPattern(patternType: string, color: string): string {
  switch (patternType) {
    case 'medical':
      // Plus signs pattern
      return `
        <pattern id="pattern" x="0" y="0" width="50" height="50" patternUnits="userSpaceOnUse">
          <path d="M 25 10 L 25 40 M 10 25 L 40 25" stroke="white" stroke-width="2" />
        </pattern>
      `;
    
    case 'modern':
      // Diagonal lines
      return `
        <pattern id="pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 0 40 L 40 0" stroke="white" stroke-width="1" />
        </pattern>
      `;
    
    case 'professional':
      // Dots pattern
      return `
        <pattern id="pattern" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
          <circle cx="15" cy="15" r="2" fill="white" />
        </pattern>
      `;
    
    case 'minimal':
    default:
      // No pattern
      return `<pattern id="pattern" x="0" y="0" width="1" height="1" patternUnits="userSpaceOnUse"></pattern>`;
  }
}

/**
 * Truncate text to max length
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Get favicon URL from clinic website
 * Returns Google's favicon service as fallback
 */
export function getFaviconUrl(websiteUrl?: string): string | undefined {
  if (!websiteUrl) return undefined;

  try {
    const domain = new URL(websiteUrl).hostname;
    // Use Google's favicon service (free and reliable)
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  } catch (error) {
    return undefined;
  }
}

/**
 * Generate banner with async favicon loading
 * This version can be used in React components
 */
export async function generateBannerWithFavicon(
  clinicName: string,
  rating?: number,
  websiteUrl?: string,
  placeId?: string
): Promise<string> {
  const faviconUrl = getFaviconUrl(websiteUrl);
  
  // For now, just use the medical emoji
  // In a real implementation, you'd load the favicon and embed it
  return generateCustomBanner(clinicName, rating, faviconUrl, placeId);
}