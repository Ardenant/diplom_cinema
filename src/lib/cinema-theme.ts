export type CinemaTheme = "red" | "blue";

export function getCinemaTheme(hallName: string): CinemaTheme {
  return hallName === "Синий зал" ? "blue" : "red";
}

/** Upholstery and architectural lighting share the hall's visual identity. */
export const cinemaPalettes = {
  red: {
    background: "#040303",
    fog: "#060303",
    fabric: "#9b5140",
    shell: "#803e35",
    headrest: "#a25845",
    sheen: "#c52b1b",
    seam: "#4d1519",
    wall: "#0b080b",
    acoustic: "#12090e",
    step: "#553a21",
    stepLight: "#d79a4a",
    fixture: "#a57a4c",
    fixtureLight: "#d9a66c",
    ambient: "#dec1b0",
    backFill: "#ffd3b6",
    ceilingFill: "#f4c4a9",
    key: "#ffceb7",
    rim: "#ffb795",
  },
  blue: {
    background: "#030509",
    fog: "#030609",
    fabric: "#4779b3",
    shell: "#32557e",
    headrest: "#5488c4",
    sheen: "#72a9df",
    seam: "#142d4d",
    wall: "#070b13",
    acoustic: "#0a1424",
    step: "#243d56",
    stepLight: "#82b8e2",
    fixture: "#527b9b",
    fixtureLight: "#9ac9ea",
    ambient: "#c2d4ec",
    backFill: "#c4dcff",
    ceilingFill: "#c6daed",
    key: "#d4e3f8",
    rim: "#a4c9ef",
  },
} satisfies Record<CinemaTheme, Record<string, string>>;
