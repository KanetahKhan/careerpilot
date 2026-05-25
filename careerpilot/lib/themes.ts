export interface ThemePreset {
  name: string;
  label: string;
  hue: number;
  saturation: number;
  lightness: number;
}

export const themePresets: ThemePreset[] = [
  { name: "coral", label: "Coral", hue: 10, saturation: 55, lightness: 74 },
  { name: "peach", label: "Peach", hue: 25, saturation: 55, lightness: 76 },
  { name: "lemon", label: "Lemon", hue: 50, saturation: 60, lightness: 78 },
  { name: "forest", label: "Forest", hue: 140, saturation: 40, lightness: 70 },
  { name: "mint", label: "Mint", hue: 170, saturation: 45, lightness: 74 },
  { name: "sky", label: "Sky", hue: 210, saturation: 45, lightness: 73 },
  { name: "denim", label: "Denim", hue: 225, saturation: 35, lightness: 68 },
  { name: "lavender", label: "Lavender", hue: 240, saturation: 28, lightness: 78 },
  { name: "violet", label: "Violet", hue: 270, saturation: 40, lightness: 73 },
  { name: "lilac", label: "Lilac", hue: 285, saturation: 35, lightness: 76 },
  { name: "rose", label: "Rose", hue: 335, saturation: 45, lightness: 73 },
];

export function getPresetCSS(preset: ThemePreset): Record<string, string> {
  const { hue, saturation, lightness } = preset;
  const fgLightness = lightness > 60 ? "15%" : "100%";
  const fgSaturation = lightness > 60 ? "20%" : "0%";
  const accentHue = (hue + 30) % 360;
  return {
    "--primary": `${hue} ${saturation}% ${lightness}%`,
    "--primary-foreground": `${hue} ${fgSaturation} ${fgLightness}`,
    "--accent": `${accentHue} ${saturation}% ${lightness}%`,
    "--accent-foreground": `${accentHue} ${fgSaturation} ${fgLightness}`,
    "--ring": `${hue} ${saturation}% ${lightness}%`,
    "--primary-h": `${hue}`,
    "--primary-s": `${saturation}%`,
    "--primary-l": `${lightness}%`,
  };
}
