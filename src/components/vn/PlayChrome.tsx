import {
  FastForward,
  History,
  Menu,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";
import { SPEAKER_NAME } from "@/lib/vn/assets";
import { STORY } from "@/lib/vn/story";
import { useVN } from "@/lib/vn/store";
import { audio } from "@/lib/vn/audio";

export function PlayChrome() {
  const node = useVN((s) => STORY[s.nodeId]);
  const typed = useVN((s) => s.typed);
  const auto = useVN((s) => s.auto);
  const skipHeld = useVN((s) => s.skipHeld);
  const mute = useVN((s) => s.settings.mute);
  const setOverlay = useVN((s) => s.setOverlay);
  const setAuto = useVN((s) => s.setAuto);
  const setSkipHeld = useVN((s) => s.setSkipHeld);
  const patchSettings = useVN((s) => s.patchSettings);
  const choose = useVN((s) => s.choose);
  const saveNotice = useVN((s) => s.saveNotice);

  if (!node) return null;
  const shown = node.text.slice(0, typed);
  const done = typed >= node.text.length;
  const choices = done ? node.choices : undefined;
  const speaker = node.speaker && node.speaker !== "n" ? SPEAKER_NAME[node.speaker] : "";
  const compact = node.ui === "chat" || node.ui === "contract";

  return (
    <>
      <div className="chrome-top">
        <button type="button" className="icon-btn" onClick={() => setOverlay("menu")} aria-label="Меню">
          <Menu className="size-5" />
        </button>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className={`icon-btn ${auto ? "text-accent" : ""}`}
            onClick={() => setAuto(!auto)}
            aria-label="Авто"
          >
            {auto ? <Pause className="size-5" /> : <Play className="size-5" />}
          </button>
          <button type="button" className="icon-btn" onClick={() => setOverlay("history")} aria-label="История">
            <History className="size-5" />
          </button>
          <button
            type="button"
            className={`icon-btn skip-btn ${skipHeld ? "text-accent" : ""}`}
            aria-label="Пропуск"
            title="Удерживайте, чтобы листать"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.currentTarget.setPointerCapture(e.pointerId);
              setSkipHeld(true);
            }}
            onPointerUp={() => setSkipHeld(false)}
            onPointerCancel={() => setSkipHeld(false)}
            onLostPointerCapture={() => setSkipHeld(false)}
          >
            <FastForward className="size-5" />
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => {
              audio.unlock();
              patchSettings({ mute: !mute });
            }}
            aria-label={mute ? "Включить звук" : "Выключить звук"}
          >
            {mute ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </button>
        </div>
      </div>

      <div className="chrome-bottom">
        {choices?.length ? (
          <div className="mx-auto mb-3 flex w-full max-w-2xl flex-col gap-2">
            {choices.map((c, i) => (
              <button
                key={c.text}
                type="button"
                className="choice"
                onMouseEnter={() => audio.choiceHover()}
                onClick={() => choose(i)}
              >
                <span className="font-display text-accent">{i + 1}</span>
                <span>{c.text}</span>
              </button>
            ))}
          </div>
        ) : null}

        {node.text ? (
          <div className={`dialogue mx-auto w-full max-w-3xl ${compact ? "dialogue-compact" : ""}`}>
            {speaker ? (
              <div
                className={`nameplate ${node.speaker === "ira" ? "text-ira" : "text-sasha"}`}
              >
                {speaker}
              </div>
            ) : null}
            <p className="dialogue-text">
              {shown}
              {!done ? <span className="caret" /> : null}
            </p>
            {done && !choices?.length ? (
              <span className="continue" aria-hidden>
                дальше
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {saveNotice ? (
        <div className="absolute top-16 left-1/2 z-30 -translate-x-1/2 rounded-md bg-elevated px-3 py-1.5 text-sm text-fg shadow-lg">
          {saveNotice}
        </div>
      ) : null}
    </>
  );
}
