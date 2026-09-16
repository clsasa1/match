import { useEffect, useRef } from "react";
import { STORY } from "@/lib/vn/story";
import { useVN } from "@/lib/vn/store";

export function SpecialUi() {
  const nodeId = useVN((s) => s.nodeId);
  const node = STORY[nodeId];
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = threadRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [nodeId, node?.chat?.length]);

  if (!node?.ui) return null;

  if (node.ui === "chapter" && node.chapter) {
    return (
      <div className="chapter-card" aria-live="polite">
        <p className="chapter-kicker">Глава {node.chapter.n}</p>
        <h2 className="chapter-title">{node.chapter.title}</h2>
        {node.chapter.hint ? <p className="chapter-hint">{node.chapter.hint}</p> : null}
        <p className="chapter-next">дальше</p>
      </div>
    );
  }

  if (node.ui === "chat") {
    const messages = node.chat ?? [];
    return (
      <div className="phone-wrap" aria-label="Переписка">
        <div className="phone">
          <div className="phone-bar">
            <span className="phone-name">Ира</span>
            <span className="phone-meta">онлайн</span>
          </div>
          <div className="phone-thread" ref={threadRef}>
            {messages.map((m, i) => (
              <p key={`${m.from}-${i}`} className={m.from === "ira" ? "bubble-ira" : "bubble-sasha"}>
                {m.text}
              </p>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (node.ui === "contract") {
    return (
      <div className="paper-wrap" aria-label="Договор">
        <article className={`paper ${node.signed ? "paper-signed" : ""}`}>
          <p className="paper-kicker">на одном листе</p>
          <h3 className="paper-title">Соглашение</h3>
          <p>Мы, нижеподписавшиеся, с сегодняшнего дня будем парень и девушка.</p>
          <p>Будем встречаться.</p>
          <p className="paper-small">Кофе — по желанию. Снег — не отменяется.</p>
          <div className="paper-signs">
            <span className={node.signed ? "sign" : "sign-blank"}>{node.signed ? "Саша" : "________"}</span>
            <span className={node.signed ? "sign" : "sign-blank"}>{node.signed ? "Ира" : "________"}</span>
          </div>
        </article>
      </div>
    );
  }

  return null;
}
