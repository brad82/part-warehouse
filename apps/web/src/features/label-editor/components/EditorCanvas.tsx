import { useEffect, useMemo, useRef } from "react";
import {
  BlockList,
  BlockSelectionClearer,
  BlockTools,
  ObserveTyping,
  WritingFlow,
} from "@wordpress/block-editor";
import { useDispatch, useSelect } from "@wordpress/data";
import { useLabelEditorData, useSamplePart } from "../LabelEditorDataProvider";
import { CanvasContext, type CanvasEnv } from "../model/CanvasContext";
import { FIELD_NAMES_PART } from "../model/fields";
import { store } from "../store";

/**
 * The label at the current zoom, with each element a block placed at its mm
 * box. Reports its size to the store for zoom-to-fit.
 */
export function EditorCanvas() {
  const area = useRef<HTMLDivElement>(null);
  const { setViewport } = useDispatch(store);
  const { scale, meta, sample } = useSelect(
    (select) => ({
      scale: select(store).getScale(),
      meta: select(store).getMeta(),
      sample: select(store).getSample(),
    }),
    [],
  );
  const { fields } = useLabelEditorData();
  const part = useSamplePart();

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    // Reported a frame later: the zoom it feeds re-lays out the canvas,
    // which inside the observer callback is a ResizeObserver loop (Safari).
    let frame = 0;
    const observer = new ResizeObserver(([entry]) => {
      cancelAnimationFrame(frame);
      const { width, height } = entry.contentRect;
      frame = requestAnimationFrame(() => setViewport(width, height));
    });
    observer.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [setViewport]);

  const env: CanvasEnv = useMemo(
    () => ({
      scale,
      part: sample.showFields || !part ? FIELD_NAMES_PART : part,
      assets: { render: sample.render },
      fields,
    }),
    [scale, sample.showFields, sample.render, part, fields],
  );

  return (
    <div ref={area} className="label-editor__canvas-area">
      <BlockSelectionClearer className="label-editor__canvas-scroll">
        <BlockTools>
          <WritingFlow>
            <ObserveTyping>
              <div
                className="label-editor__canvas"
                style={{
                  width: meta.widthMm * scale,
                  height: meta.heightMm * scale,
                }}
              >
                <CanvasContext.Provider value={env}>
                  <BlockList renderAppender={false} />
                </CanvasContext.Provider>
              </div>
            </ObserveTyping>
          </WritingFlow>
        </BlockTools>
      </BlockSelectionClearer>
    </div>
  );
}
