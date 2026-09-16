import type { ReactNode } from "react";
import { Lock, X } from "lucide-react";
import { CHAPTERS, ENDING_BLURB, ENDING_TITLE, STORY } from "@/lib/vn/story";
import { loadSlots } from "@/lib/vn/save";
import { useVN } from "@/lib/vn/store";
import { audio } from "@/lib/vn/audio";

export function Overlays() {
  const overlay = useVN((s) => s.overlay);
  const setOverlay = useVN((s) => s.setOverlay);
  if (overlay === "none") return null;
  return (
    <div
      className="overlay-root"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) setOverlay("none");
      }}
    >
      {overlay === "menu" ? <MenuPanel /> : null}
      {overlay === "settings" ? <SettingsPanel /> : null}
      {overlay === "saves" ? <SavesPanel /> : null}
      {overlay === "history" ? <HistoryPanel /> : null}
      {overlay === "help" ? <HelpPanel /> : null}
      {overlay === "chapters" ? <ChaptersPanel /> : null}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  const setOverlay = useVN((s) => s.setOverlay);
  return (
    <div className="panel overlay-panel" data-ui>
      <div className="mb-4 flex items-start justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold text-fg">{title}</h2>
        <button type="button" className="icon-btn" onClick={() => setOverlay("none")} aria-label="Закрыть">
          <X className="size-4" />
        </button>
      </div>
      {children}
    </div>
  );
}

function MenuPanel() {
  const setOverlay = useVN((s) => s.setOverlay);
  const toTitle = useVN((s) => s.toTitle);
  const screen = useVN((s) => s.screen);
  return (
    <Panel title="Меню">
      <div className="flex flex-col gap-2">
        {screen === "game" ? (
          <button type="button" className="btn-ghost justify-start" onClick={() => setOverlay("none")}>
            Продолжить
          </button>
        ) : null}
        <button type="button" className="btn-ghost justify-start" onClick={() => setOverlay("saves")}>
          Сохранить / Загрузить
        </button>
        <button type="button" className="btn-ghost justify-start" onClick={() => setOverlay("chapters")}>
          Главы
        </button>
        <button type="button" className="btn-ghost justify-start" onClick={() => setOverlay("settings")}>
          Настройки
        </button>
        <button type="button" className="btn-ghost justify-start" onClick={() => setOverlay("help")}>
          Управление
        </button>
        {screen === "game" ? (
          <button type="button" className="btn-ghost justify-start" onClick={toTitle}>
            На титульный экран
          </button>
        ) : null}
      </div>
    </Panel>
  );
}

function ChaptersPanel() {
  const endings = useVN((s) => s.endings);
  const startGame = useVN((s) => s.startGame);
  const unlocked = endings.includes("together");
  return (
    <Panel title="Главы">
      <p className="mb-3 text-sm leading-relaxed text-muted">
        Первые две главы открыты сразу. Остальные — когда пройдёте всю историю.
      </p>
      <div className="flex flex-col gap-2">
        {CHAPTERS.map((ch) => {
          const locked = Boolean(ch.need) && !unlocked;
          return (
            <button
              key={ch.id}
              type="button"
              className="btn-ghost justify-start"
              disabled={locked}
              onClick={() => !locked && startGame(ch.id)}
            >
              {locked ? <Lock className="size-4" aria-hidden /> : <span className="font-display text-accent">{ch.n}</span>}
              <span className="flex min-w-0 flex-col items-start">
                <span>{ch.title}</span>
                <span className="text-xs font-normal text-subtle">{locked ? "откроется позже" : ch.hint}</span>
              </span>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

function SettingsPanel() {
  const settings = useVN((s) => s.settings);
  const patch = useVN((s) => s.patchSettings);
  return (
    <Panel title="Настройки">
      <label className="slider">
        <span>Скорость текста</span>
        <input
          type="range"
          min={0.15}
          max={1}
          step={0.05}
          value={settings.textSpeed}
          onChange={(e) => patch({ textSpeed: Number(e.target.value) })}
        />
      </label>
      <label className="slider">
        <span>Пауза авточтения</span>
        <input
          type="range"
          min={0.2}
          max={1}
          step={0.05}
          value={settings.autoDelay}
          onChange={(e) => patch({ autoDelay: Number(e.target.value) })}
        />
      </label>
      <label className="slider">
        <span>Музыка</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={settings.music}
          onChange={(e) => {
            audio.unlock();
            patch({ music: Number(e.target.value), mute: false });
          }}
        />
      </label>
      <label className="slider">
        <span>Звуки</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={settings.sfx}
          onChange={(e) => {
            audio.unlock();
            patch({ sfx: Number(e.target.value), mute: false });
          }}
        />
      </label>
      <button
        type="button"
        className="btn-ghost mt-2 w-full"
        onClick={() => {
          audio.unlock();
          patch({ mute: !settings.mute });
        }}
      >
        {settings.mute ? "Звук выключен" : "Звук включён"}
      </button>
    </Panel>
  );
}

function SavesPanel() {
  const saveTo = useVN((s) => s.saveTo);
  const loadFrom = useVN((s) => s.loadFrom);
  const screen = useVN((s) => s.screen);
  const slots = loadSlots();
  return (
    <Panel title="Сохранения">
      <div className="flex flex-col gap-2">
        {slots.map((slot, i) => {
          const node = slot ? STORY[slot.nodeId] : null;
          const label = slot
            ? `${new Date(slot.savedAt).toLocaleString("ru")} · ${node?.text.slice(0, 42) || node?.chapter?.title || "…"}`
            : "Пусто";
          return (
            <div key={i} className="rounded-md border border-border bg-elevated p-3">
              <p className="mb-2 text-xs tracking-wide text-subtle uppercase">Слот {i + 1}</p>
              <p className="mb-3 line-clamp-2 text-sm text-muted">{label}</p>
              <div className="flex gap-2">
                {screen === "game" ? (
                  <button type="button" className="btn-ghost flex-1" onClick={() => saveTo(i)}>
                    Сохранить
                  </button>
                ) : null}
                <button
                  type="button"
                  className="btn-ghost flex-1"
                  disabled={!slot}
                  onClick={() => slot && loadFrom(i)}
                >
                  Загрузить
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function HistoryPanel() {
  const history = useVN((s) => s.history);
  return (
    <Panel title="История">
      <div className="flex flex-col gap-3 pr-1">
        {history.length === 0 ? (
          <p className="text-sm text-muted">Пока пусто.</p>
        ) : (
          history.map((line, i) => (
            <p key={i} className="text-sm leading-relaxed text-pretty">
              {line.speaker && line.speaker !== "n" ? (
                <span className={line.speaker === "ira" ? "text-ira" : "text-sasha"}>
                  {line.speaker === "ira" ? "Ира" : "Саша"}
                  {". "}
                </span>
              ) : null}
              <span className="text-fg">{line.text}</span>
            </p>
          ))
        )}
      </div>
    </Panel>
  );
}

function HelpPanel() {
  return (
    <Panel title="Управление">
      <ul className="flex flex-col gap-2.5 text-base leading-relaxed text-muted">
        <li>На телефоне: нажмите на экран — дальше.</li>
        <li>Выбор — широкие кнопки внизу.</li>
        <li>Удерживайте кнопку перемотки, чтобы промотать до выбора.</li>
        <li>Авто — читать самой. Меню — сохранения и главы.</li>
        <li className="text-subtle">
          На компьютере: <kbd>Пробел</kbd> дальше, <kbd>1</kbd>–<kbd>3</kbd> выбор, <kbd>Esc</kbd> меню.
        </li>
      </ul>
    </Panel>
  );
}

export function Credits() {
  const endings = useVN((s) => s.endings);
  const node = useVN((s) => STORY[s.nodeId]);
  const startGame = useVN((s) => s.startGame);
  const toTitle = useVN((s) => s.toTitle);
  const ending = node?.ending ?? "together";
  return (
    <div className="credits-root">
      <div className="panel overlay-panel w-full max-w-lg text-center" data-ui>
        <p className="text-xs tracking-[0.2em] text-subtle uppercase">концовка</p>
        <h2 className="font-display mt-2 text-3xl font-semibold text-fg">{ENDING_TITLE[ending]}</h2>
        <p className="mt-3 text-base leading-relaxed text-pretty text-muted">{ENDING_BLURB[ending]}</p>
        <p className="mt-5 text-sm text-subtle">Открыто: {endings.map((e) => ENDING_TITLE[e]).join(" · ") || "—"}</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button type="button" className="btn-primary flex-1" onClick={() => startGame()}>
            Начать заново
          </button>
          <button type="button" className="btn-ghost flex-1" onClick={toTitle}>
            На титул
          </button>
        </div>
      </div>
    </div>
  );
}
