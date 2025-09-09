// Phase 2: HSL to RGB Color Conversion Utility
// Conservative implementation for THREE.js compatibility

export interface RGBColor {
  r: number;
  g: number;
  b: number;
  hex: string;
}

/**
 * Convert HSL color string to RGB values compatible with THREE.js
 * Phase 2: Conservative approach with fallback colors
 */
export function hslToRgb(hslString: string): RGBColor {
  try {
    // Parse HSL string: "hsl(195, 100%, 50%)"
    const match = hslString.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (!match) {
      console.warn(`[Phase 2] Invalid HSL format: ${hslString}, using fallback`);
      return { r: 128, g: 128, b: 128, hex: "#808080" };
    }

    const h = parseInt(match[1]) / 360;
    const s = parseInt(match[2]) / 100;
    const l = parseInt(match[3]) / 100;

    let r: number, g: number, b: number;

    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    const rInt = Math.round(r * 255);
    const gInt = Math.round(g * 255);
    const bInt = Math.round(b * 255);
    const hex = `#${rInt.toString(16).padStart(2, '0')}${gInt.toString(16).padStart(2, '0')}${bInt.toString(16).padStart(2, '0')}`;

    return { r: rInt, g: gInt, b: bInt, hex };
  } catch (error) {
    console.error(`[Phase 2] HSL conversion failed for ${hslString}:`, error);
    // Conservative fallback - return a visible color
    return { r: 100, g: 200, b: 255, hex: "#64c8ff" };
  }
}

/**
 * Test if a color string is HSL format
 */
export function isHslColor(colorString: string): boolean {
  return /^hsl\(\d+,\s*\d+%,\s*\d+%\)$/.test(colorString);
}

/**
 * Get safe color for THREE.js - converts HSL to hex if needed
 * Phase 2: Use this function for all material colors
 */
export function getSafeColor(colorString: string): string {
  if (isHslColor(colorString)) {
    const rgb = hslToRgb(colorString);
    console.log(`[Phase 2] Converted ${colorString} -> ${rgb.hex}`);
    return rgb.hex;
  }
  return colorString;
}