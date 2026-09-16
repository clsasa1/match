import { useEffect, useState } from "react";
import { BookOpen, HelpCircle, List, Play, Settings } from "lucide-react";
import { BACKGROUNDS } from "@/lib/vn/assets";
import { loadSlots } from "@/lib/vn/save";
import { useVN } from "@/lib/vn/store";

export function TitleScreen() {
  const startGame = useVN((s) => s.startGame);
  const loadFrom = useVN((s) => s.loadFrom);
  const setOverlay = useVN((s) => s.setOverlay);
  const endings = useVN((s) => s.endings);
  const [hasSave, setHasSave] = useState(false);

  useEffect(() => {
    setHasSave(loadSlots().some(Boolean));
  }, []);

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-end overflow-hidden">
      <img
        src={BACKGROUNDS.title}
        alt=""
        className="absolute inset-0 h-full w-full object-cover ken-burns"
        draggable={false}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/55 to-bg/20" />
      <Snow />
      <div className="title-panel">
        <p className="mb-3 text-sm font-medium tracking-[0.22em] text-snow/80 uppercase">
          визуальная новелла
        </p>
        <h1 className="title-name">
          Абсолютный МЭТЧ
        </h1>
        <p className="title-lead">
          Нижний, Минск, Барановичи. Tesla стала Тепслой.
        </p>
        <div className="title-actions">
          <button type="button" className="btn-primary" onClick={() => startGame()}>
            <Play className="size-4" aria-hidden />
            Начать
          </button>
          {hasSave ? (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                const slots = loadSlots();
                const i = slots.findIndex(Boolean);
                if (i >= 0) loadFrom(i);
              }}
            >
              <BookOpen className="size-4" aria-hidden />
              Продолжить
            </button>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <button type="button" className="btn-ghost" onClick={() => setOverlay("chapters")}>
              <List className="size-4" aria-hidden />
              Главы
            </button>
            <button type="button" className="btn-ghost" onClick={() => setOverlay("help")}>
              <HelpCircle className="size-4" aria-hidden />
              Управление
            </button>
          </div>
          <button type="button" className="btn-ghost" onClick={() => setOverlay("settings")}>
            <Settings className="size-4" aria-hidden />
            Звук
          </button>
        </div>
        {endings.length > 0 ? (
          <p className="mt-5 text-xs tracking-wide text-subtle">
            Открыто концовок: {endings.length} из 4
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Snow() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: 28 }, (_, i) => (
        <span
          key={i}
          className="snowflake"
          style={{
            left: `${(i * 37) % 100}%`,
            animationDelay: `${(i * 0.37) % 6}s`,
            animationDuration: `${7 + (i % 5)}s`,
            opacity: 0.25 + (i % 4) * 0.12,
            width: `${2 + (i % 3)}px`,
            height: `${2 + (i % 3)}px`,
          }}
        />
      ))}
    </div>
  );
}
