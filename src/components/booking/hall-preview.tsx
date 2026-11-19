"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Minus, Plus, RotateCcw } from "lucide-react";

import { getSeatPosition, type CinemaSeat } from "@/lib/seat-selection";
import type { CinemaTheme } from "@/lib/cinema-theme";
import type { CinemaRenderer } from "./cinema-renderer";
import styles from "./booking.module.css";

export function HallPreview({
  seat,
  seats,
  seatsPerRow,
  aislesAfter,
  theme,
}: {
  seat: CinemaSeat;
  seats: CinemaSeat[];
  seatsPerRow: number;
  aislesAfter: number[];
  theme: CinemaTheme;
}) {
  const host = useRef<HTMLDivElement>(null);
  const renderer = useRef<CinemaRenderer | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [attempt, setAttempt] = useState(0);
  const [zoom, setZoom] = useState(1);
  const latestView = useRef({ seat, zoom });

  useEffect(() => {
    latestView.current = { seat, zoom };
    renderer.current?.setView({ seat, zoom });
  }, [seat, zoom]);

  useEffect(() => {
    let cancelled = false;
    let instance: CinemaRenderer | null = null;
    import("./cinema-renderer")
      .then(({ createCinemaRenderer }) => {
        if (cancelled || !host.current) return;
        setStatus("loading");
        instance = createCinemaRenderer(
          host.current,
          seats,
          seatsPerRow,
          aislesAfter,
          theme,
          latestView.current,
          () => {
            if (!cancelled) setStatus("error");
          },
        );
        renderer.current = instance;
        return instance.ready.then(() => {
          if (!cancelled) setStatus("ready");
        });
      })
      .catch((error) => {
        if (!cancelled) {
          console.error("Cinema preview could not be loaded:", error);
          setStatus("error");
        }
      });
    return () => {
      cancelled = true;
      if (renderer.current === instance) renderer.current = null;
      instance?.dispose();
    };
  }, [seats, seatsPerRow, aislesAfter, theme, attempt]);

  return (
    <div
      className={styles.realisticPreview}
      data-preview-status={status}
      aria-busy={status === "loading"}
    >
      <div
        ref={host}
        className={styles.sceneCanvas}
        role="img"
        aria-label={`Вид на экран: ряд ${seat.row}, место ${seat.number}`}
        aria-hidden={status !== "ready"}
      />
      {status === "loading" && (
        <div className={styles.sceneState} role="status">
          <Loader2 size={24} className="animate-spin" />
          <span>Загружаем зал…</span>
        </div>
      )}
      {status === "error" && (
        <div className={styles.sceneState} role="alert">
          <strong>Не удалось показать зал</strong>
          <span>Попробуйте открыть просмотр ещё раз.</span>
          <button
            type="button"
            onClick={() => {
              setStatus("loading");
              setAttempt((value) => value + 1);
            }}
          >
            <RotateCcw size={15} />
            Повторить
          </button>
        </div>
      )}
      {status === "ready" && (
        <div
          className={styles.sceneZoom}
          aria-label="Приближение вида из кресла"
        >
          <button
            type="button"
            aria-label="Отдалить вид"
            disabled={zoom <= 0.8}
            onClick={() =>
              setZoom((value) =>
                Math.max(0.8, Number((value - 0.15).toFixed(2))),
              )
            }
          >
            <Minus size={16} />
          </button>
          <button
            type="button"
            className={styles.sceneZoomValue}
            aria-label="Сбросить приближение"
            onClick={() => setZoom(1)}
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            aria-label="Приблизить вид"
            disabled={zoom >= 1.6}
            onClick={() =>
              setZoom((value) =>
                Math.min(1.6, Number((value + 0.15).toFixed(2))),
              )
            }
          >
            <Plus size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
export function HallMiniMap({
  seats,
  rowsCount,
  seatsPerRow,
  aislesAfter,
  activeId,
  selected,
}: {
  seats: CinemaSeat[];
  rowsCount: number;
  seatsPerRow: number;
  aislesAfter: number[];
  activeId?: string;
  selected: ReadonlySet<string>;
}) {
  const extent = Math.max(
    1,
    ...seats.map((s) => Math.abs(getSeatPosition(s.number, seatsPerRow, aislesAfter))),
  );
  const step = Math.min(5, 42 / Math.max(1, rowsCount));
  return (
    <svg viewBox="0 0 100 70" aria-hidden="true">
      <path
        d="M 12 9 Q 50 2 88 9"
        fill="none"
        stroke="#d8b57e"
        strokeWidth="1.3"
        opacity="0.6"
      />
      {seats.map((s) => (
        <rect
          key={s.id}
          x={49 + (getSeatPosition(s.number, seatsPerRow, aislesAfter) / extent) * 38}
          y={17 + (s.row - 1) * step}
          width="3"
          height={Math.min(2.8, step * 0.78)}
          rx="0.8"
          fill={
            s.id === activeId
              ? "#f0c98a"
              : selected.has(s.id)
                ? "#d8b57e"
                : s.occupied
                  ? "#303038"
                  : "var(--hall-seat)"
          }
          stroke={s.id === activeId ? "#fff1d7" : "none"}
          strokeWidth="1.5"
        />
      ))}
    </svg>
  );
}
