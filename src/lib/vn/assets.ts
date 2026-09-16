import type { BackgroundId, IraExpr, SashaExpr } from "./types";

export const BACKGROUNDS: Record<BackgroundId, string> = {
  title: "/bg/title.jpg",
  street: "/bg/street.jpg",
  cafe: "/bg/cafe.jpg",
  "cafe-brick": "/bg/cafe-brick.jpg",
  park: "/bg/park.jpg",
  castle: "/bg/castle.jpg",
  car: "/bg/car.jpg",
  wheat: "/bg/wheat.jpg",
  palace: "/bg/palace.jpg",
  river: "/bg/river.jpg",
  gate: "/bg/gate.jpg",
  bison: "/bg/bison.jpg",
  red: "/bg/red.jpg",
  sunset: "/bg/sunset.jpg",
  "cg-cafe": "/bg/cg-cafe.jpg",
  "cg-car": "/bg/cg-car.jpg",
  night: "/bg/night.jpg",
  rental: "/bg/rental.jpg",
  home: "/bg/home.jpg",
  kitchen: "/bg/kitchen.jpg",
  relatives: "/bg/relatives.jpg",
  future: "/bg/future.jpg",
  drive: "/bg/drive.jpg",
  tesla: "/bg/tesla.jpg",
  "cg-alf": "/bg/cg-alf.jpg",
};

export const IRA: Record<IraExpr, string> = {
  smile: "/sprites/ira-smile.png",
  laugh: "/sprites/ira-laugh.png",
  thoughtful: "/sprites/ira-thoughtful.png",
  shy: "/sprites/ira-shy.png",
  tender: "/sprites/ira-tender.png",
  surprise: "/sprites/ira-surprise.png",
};

export const SASHA: Record<SashaExpr, string> = {
  smile: "/sprites/sasha-smile.png",
  awkward: "/sprites/sasha-awkward.png",
  laugh: "/sprites/sasha-laugh.png",
  warm: "/sprites/sasha-warm.png",
};

export const SPEAKER_NAME: Record<string, string> = {
  ira: "Ира",
  sasha: "Саша",
  n: "",
};

export function allAssetUrls(): string[] {
  return [
    ...Object.values(BACKGROUNDS),
    ...Object.values(IRA),
    ...Object.values(SASHA),
  ];
}

export function preloadAssets(): Promise<void> {
  const urls = allAssetUrls();
  return Promise.all(
    urls.map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = src;
        }),
    ),
  ).then(() => undefined);
}
