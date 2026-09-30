const COLOR_SWATCHES: Record<string, string> = {
  beige: "#D8C3A5",
  black: "#171717",
  blue: "#2563EB",
  brown: "#795548",
  charcoal: "#4B5563",
  cream: "#FFF1D6",
  gold: "#D4A72C",
  gray: "#9CA3AF",
  green: "#16803C",
  grey: "#9CA3AF",
  ivory: "#FFF8E7",
  navy: "#1E3A5F",
  olive: "#6B713B",
  orange: "#EA580C",
  pink: "#EC8FB3",
  purple: "#7E57C2",
  red: "#DC2626",
  sand: "#D9C2A0",
  silver: "#C0C5CC",
  white: "#FFFFFF",
  yellow: "#FACC15",
};

export function productColor(label: string) {
  return COLOR_SWATCHES[label.trim().toLowerCase()];
}
