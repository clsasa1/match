import { BACKGROUNDS, IRA, SASHA } from "@/lib/vn/assets";
import { STORY } from "@/lib/vn/story";
import { useVN } from "@/lib/vn/store";

export function Stage() {
  const stage = useVN((s) => s.stage);
  const nodeId = useVN((s) => s.nodeId);
  const node = STORY[nodeId];
  const bg = stage.cg ? BACKGROUNDS[stage.cg] : BACKGROUNDS[stage.bg];
  const showSprites = !stage.cg && !node?.ui;

  return (
    <div className="absolute inset-0 overflow-hidden bg-bg">
      <img
        key={bg}
        src={bg}
        alt=""
        className="absolute inset-0 h-full w-full object-cover ken-burns"
        draggable={false}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-bg/80 via-transparent to-bg/25" />
      {showSprites ? (
        <div
          className={`sprite-row ${
            stage.ira && stage.sasha ? "is-pair" : stage.ira ? "is-ira" : "is-sasha"
          }`}
        >
          {stage.sasha ? (
            <img
              key={`s-${stage.sasha}`}
              src={SASHA[stage.sasha]}
              alt=""
              className="sprite sprite-sasha select-none"
              draggable={false}
            />
          ) : null}
          {stage.ira ? (
            <img
              key={`i-${stage.ira}`}
              src={IRA[stage.ira]}
              alt=""
              className="sprite sprite-ira select-none"
              draggable={false}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
