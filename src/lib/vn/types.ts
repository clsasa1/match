export type Speaker = "ira" | "sasha" | "n";

export type IraExpr =
  | "smile"
  | "laugh"
  | "thoughtful"
  | "shy"
  | "tender"
  | "surprise";

export type SashaExpr = "smile" | "awkward" | "laugh" | "warm";

export type MusicTheme = "title" | "cafe" | "snow" | "warm" | "quiet" | "home";
export type Ambience = "snow" | "cafe" | "car" | "home" | "none";

export type BackgroundId =
  | "title"
  | "street"
  | "cafe"
  | "cafe-brick"
  | "park"
  | "castle"
  | "car"
  | "wheat"
  | "palace"
  | "river"
  | "gate"
  | "bison"
  | "red"
  | "sunset"
  | "cg-cafe"
  | "cg-car"
  | "night"
  | "rental"
  | "home"
  | "kitchen"
  | "relatives"
  | "future"
  | "drive"
  | "tesla"
  | "cg-alf";

export type NodeUi = "chat" | "contract" | "chapter";

export interface Choice {
  text: string;
  next: string;
  warmth?: number;
}

export interface ChatLine {
  from: "ira" | "sasha";
  text: string;
}

export interface ChapterCard {
  n: string;
  title: string;
  hint?: string;
}

export interface StoryNode {
  id: string;
  speaker?: Speaker;
  text: string;
  bg?: BackgroundId;
  ira?: IraExpr | null;
  sasha?: SashaExpr | null;
  cg?: BackgroundId | null;
  music?: MusicTheme;
  ambience?: Ambience;
  next?: string;
  choices?: Choice[];
  ending?: "together" | "numbers" | "almost" | "missed";
  ui?: NodeUi;
  chat?: ChatLine[];
  signed?: boolean;
  chapter?: ChapterCard;
}

export interface HistoryLine {
  speaker?: Speaker;
  text: string;
}

export interface SaveSlot {
  version: number;
  nodeId: string;
  warmth: number;
  flags: Record<string, boolean>;
  history: HistoryLine[];
  bg: BackgroundId;
  ira: IraExpr | null;
  sasha: SashaExpr | null;
  cg: BackgroundId | null;
  music: MusicTheme;
  ambience: Ambience;
  savedAt: number;
}

export interface Settings {
  textSpeed: number;
  autoDelay: number;
  music: number;
  sfx: number;
  mute: boolean;
}
