/** Marketing / homepage visual tokens — separate from product appTheme. */
export const landing = {
  navy: "#071A2F",
  navyMid: "#0C2744",
  navySoft: "#132F4C",
  blue: "#1B6EF5",
  blueBright: "#3B82F6",
  blueSoft: "#E8F1FE",
  green: "#0E9F6E",
  greenSoft: "#E6F7F0",
  ink: "#0B1220",
  muted: "#5B6B7C",
  line: "#E4EAF2",
  paper: "#FFFFFF",
  wash: "#F5F8FC",
  washDeep: "#EAF0F8",
  fontDisplay: '"Outfit", "Plus Jakarta Sans", system-ui, sans-serif',
  fontBody: '"Plus Jakarta Sans", system-ui, sans-serif',
  shadow: "0 18px 50px rgba(7, 26, 47, 0.10)",
  shadowSoft: "0 8px 28px rgba(7, 26, 47, 0.06)",
  radius: 16,
  radiusLg: 24,
} as const;

export const focusRing = {
  outline: "2px solid",
  outlineColor: landing.blue,
  outlineOffset: "2px",
} as const;
