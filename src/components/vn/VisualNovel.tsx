import { useEffect, useRef } from "react";
import { audio } from "@/lib/vn/audio";
import { preloadAssets } from "@/lib/vn/assets";
import { loadEndings, loadSettings } from "@/lib/vn/save";
import { STORY } from "@/lib/vn/story";
import { useVN } from "@/lib/vn/store";
import { bindVisualViewport } from "@/lib/vn/viewport";
import { Credits, Overlays } from "./Overlays";
import { PlayChrome } from "./PlayChrome";
import { SpecialUi } from "./SpecialUi";
import { Stage } from "./Stage";
import { TitleScreen } from "./TitleScreen";

export function VisualNovel() {
  const screen = useVN((s) => s.screen);
  const overlay = useVN((s) => s.overlay);
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    void preloadAssets();
  }, []);

  useEffect(() => {
    const settings = loadSettings();
    useVN.setState({ settings, endings: loadEndings() });
    audio.setVolumes(settings.music, settings.sfx, settings.mute);
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    return bindVisualViewport(el);
  }, []);

  useEffect(() => {
    const kick = () => audio.unlock();
    window.addEventListener("pointerdown", kick, { capture: true });
    window.addEventListener("touchstart", kick, { capture: true, passive: true });
    return () => {
      window.removeEventListener("pointerdown", kick, { capture: true });
      window.removeEventListener("touchstart", kick, { capture: true });
    };
  }, []);

  useInput();

  return (
    <main ref={rootRef} className="vn-shell bg-bg text-fg">
      {screen === "title" ? <TitleScreen /> : null}
      {screen === "game" || screen === "credits" ? (
        <>
          <Stage />
          {screen === "game" ? <SpecialUi /> : null}
          {screen === "game" ? <PlayChrome /> : null}
          {screen === "credits" ? <Credits /> : null}
        </>
      ) : null}
      {screen === "game" ? <GameLoop /> : null}
      {overlay !== "none" ? <Overlays /> : null}
    </main>
  );
}

function GameLoop() {
  const nodeId = useVN((s) => s.nodeId);
  const auto = useVN((s) => s.auto);
  const skipHeld = useVN((s) => s.skipHeld);
  const overlay = useVN((s) => s.overlay);
  const screen = useVN((s) => s.screen);
  const textSpeed = useVN((s) => s.settings.textSpeed);
  const autoDelay = useVN((s) => s.settings.autoDelay);
  const setTyped = useVN((s) => s.setTyped);
  const advance = useVN((s) => s.advance);
  const last = useRef(0);
  const autoAt = useRef(0);
  const skipAcc = useRef(0);

  useEffect(() => {
    autoAt.current = 0;
    last.current = performance.now();
    skipAcc.current = 0;
  }, [nodeId]);

  useEffect(() => {
    if (screen !== "game" || overlay !== "none") return;
    let raf = 0;
    const step = (now: number) => {
      const state = useVN.getState();
      const node = STORY[state.nodeId];
      if (!node) {
        raf = requestAnimationFrame(step);
        return;
      }
      const dt = Math.min(0.1, (now - last.current) / 1000);
      last.current = now;
      const cps = 18 + state.settings.textSpeed * 42;
      if (state.skipHeld && !node.choices?.length) {
        if (state.typed < node.text.length) {
          setTyped(node.text.length);
        } else if (node.next || node.ending) {
          skipAcc.current += dt;
          if (skipAcc.current > 0.09) {
            skipAcc.current = 0;
            advance();
          }
        }
      } else if (state.typed < node.text.length) {
        const add = Math.max(1, Math.floor(cps * dt + 0.4));
        setTyped(Math.min(node.text.length, state.typed + add));
      } else if (state.auto && !node.choices?.length) {
        if (!autoAt.current) autoAt.current = now;
        const wait =
          node.ui === "chapter"
            ? 2400
            : 700 + state.settings.autoDelay * 1600 + node.text.length * 8;
        if (now - autoAt.current > wait) {
          autoAt.current = 0;
          advance();
        }
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [advance, auto, autoDelay, nodeId, overlay, screen, setTyped, skipHeld, textSpeed]);

  return null;
}

function useInput() {
  const advance = useVN((s) => s.advance);
  const choose = useVN((s) => s.choose);
  const setOverlay = useVN((s) => s.setOverlay);
  const setSkipHeld = useVN((s) => s.setSkipHeld);
  const setAuto = useVN((s) => s.setAuto);
  const patchSettings = useVN((s) => s.patchSettings);

  useEffect(() => {
    const isTypingTarget = (el: EventTarget | null) =>
      el instanceof HTMLElement && (el.tagName === "INPUT" || el.tagName === "TEXTAREA");

    const onKey = (e: KeyboardEvent) => {
      const state = useVN.getState();
      if (e.code === "ControlLeft" || e.code === "ControlRight") {
        setSkipHeld(e.type === "keydown");
        return;
      }
      if (e.type !== "keydown") return;
      if (isTypingTarget(e.target)) return;

      if (e.code === "Escape") {
        e.preventDefault();
        setOverlay(state.overlay === "none" ? "menu" : "none");
        return;
      }
      if (state.overlay !== "none") return;
      if (state.screen !== "game") return;

      if (e.code === "Space" || e.code === "Enter" || e.code === "ArrowRight") {
        e.preventDefault();
        advance();
        return;
      }
      if (e.code === "KeyA") {
        setAuto(!state.auto);
        return;
      }
      if (e.code === "KeyH") {
        setOverlay("history");
        return;
      }
      if (e.code === "KeyM") {
        patchSettings({ mute: !state.settings.mute });
        return;
      }
      const num = { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2 }[e.code];
      if (num !== undefined) {
        const node = STORY[state.nodeId];
        if (node?.choices && state.typed >= node.text.length) choose(num);
      }
    };

    const lastAdvance = { t: 0 };
    const tryAdvance = () => {
      const now = performance.now();
      if (now - lastAdvance.t < 240) return;
      lastAdvance.t = now;
      audio.unlock();
      advance();
    };

    const onPointer = (e: PointerEvent) => {
      const state = useVN.getState();
      if (state.screen !== "game" || state.overlay !== "none") return;
      const t = e.target;
      if (t instanceof HTMLElement && t.closest("button, a, input, [data-ui]")) return;
      tryAdvance();
    };

    const onContext = (e: Event) => {
      const state = useVN.getState();
      if (state.screen === "game") e.preventDefault();
    };

    const clear = () => setSkipHeld(false);

    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("contextmenu", onContext);
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible") clear();
      else if (audio.unlocked) audio.unlock();
    });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("contextmenu", onContext);
      window.removeEventListener("blur", clear);
    };
  }, [advance, choose, patchSettings, setAuto, setOverlay, setSkipHeld]);
}
