"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Mail,
  Minus,
  Plus,
  Sparkles,
  Ticket,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { plural, formatPrice } from "@/lib/format";
import { createBookingAction } from "@/lib/actions/booking";
import type { CinemaTheme } from "@/lib/cinema-theme";
import {
  findAdjacentSeats,
  getAislesAfter,
  type CinemaSeat,
} from "@/lib/seat-selection";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { HallMiniMap, HallPreview } from "./hall-preview";
import styles from "./booking.module.css";

const checkoutSchema = z.object({
  email: z.string().trim().email("Введите корректный email"),
});
type CheckoutInput = z.infer<typeof checkoutSchema>;

export function SeatPicker({
  showtimeId,
  price,
  rowsCount,
  seatsPerRow,
  aislesAfter,
  seats,
  userEmail,
  movieTitle,
  hallName,
  hallTheme,
  sessionLabel,
}: {
  showtimeId: string;
  price: number;
  rowsCount: number;
  seatsPerRow: number;
  aislesAfter: number[];
  seats: CinemaSeat[];
  userEmail: string | null;
  movieTitle: string;
  hallName: string;
  hallTheme: CinemaTheme;
  sessionLabel: string;
}) {
  const router = useRouter();
  const helpId = useId();
  const emailId = useId();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectionSeats, setSelectionSeats] = useState(seats);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [groupSize, setGroupSize] = useState(2);
  const [zoom, setZoom] = useState(1);
  const [message, setMessage] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const seatButtons = useRef(new Map<string, HTMLButtonElement>());
  const checkoutRef = useRef<HTMLElement>(null);
  const checkoutFormRef = useRef<HTMLFormElement>(null);
  const mapViewport = useRef<HTMLDivElement>(null);
  const zoomAnchor = useRef<number | null>(null);
  const previewOpener = useRef<HTMLButtonElement | null>(null);
  const headerPreviewButton = useRef<HTMLButtonElement | null>(null);

  // Discard newly occupied seats before rendering a refreshed server snapshot.
  if (selectionSeats !== seats) {
    setSelectionSeats(seats);
    const freeIds = new Set(seats.filter((seat) => !seat.occupied).map((seat) => seat.id));
    setSelected((previous) => new Set([...previous].filter((id) => freeIds.has(id))));
  }

  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors },
  } = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { email: userEmail ?? "" },
  });
  const byCoord = useMemo(
    () => new Map(seats.map((s) => [`${s.row}-${s.number}`, s])),
    [seats],
  );
  const freeSeats = useMemo(
    () =>
      seats
        .filter((s) => !s.occupied)
        .sort((a, b) => a.row - b.row || a.number - b.number),
    [seats],
  );
  const selectedSeats = useMemo(
    () => freeSeats.filter((s) => selected.has(s.id)),
    [freeSeats, selected],
  );
  const selectedIds = useMemo(
    () => new Set(selectedSeats.map((s) => s.id)),
    [selectedSeats],
  );
  const suggestedSeat = useMemo(
    () => findAdjacentSeats(seats, 1, rowsCount, seatsPerRow, aislesAfter)[0] ?? seats[0],
    [seats, rowsCount, seatsPerRow, aislesAfter],
  );
  const previewSeat =
    freeSeats.find((s) => s.id === previewId) ?? selectedSeats[0] ?? suggestedSeat;
  const tabStop =
    freeSeats.find((s) => s.id === focusedId)?.id ?? suggestedSeat?.id;
  const aisles = getAislesAfter(seatsPerRow, aislesAfter);
  const rowLengths = useMemo(() => {
    const lengths = new Map<number, number>();
    for (const seat of seats) lengths.set(seat.row, Math.max(lengths.get(seat.row) ?? 0, seat.number));
    return lengths;
  }, [seats]);
  const totalPrice = selectedSeats.length * price;
  const previewIndex = freeSeats.findIndex((s) => s.id === previewSeat?.id);

  useEffect(() => {
    const viewport = mapViewport.current;
    if (!viewport) return;
    let previousWidth = -1;
    const observer = new ResizeObserver(() => {
      // Recenter when the viewport changes, preserving manual pan and map zoom.
      if (viewport.clientWidth === previousWidth) return;
      previousWidth = viewport.clientWidth;
      viewport.scrollLeft = (viewport.scrollWidth - viewport.clientWidth) / 2;
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const viewport = mapViewport.current;
    if (viewport && zoomAnchor.current !== null) {
      viewport.scrollLeft = zoomAnchor.current * viewport.scrollWidth - viewport.clientWidth / 2;
      zoomAnchor.current = null;
    }
  }, [zoom]);

  useEffect(() => {
    const form = checkoutFormRef.current;
    if (!form) return;
    const observer = new IntersectionObserver(
      ([entry]) => setCheckoutVisible(entry.isIntersecting),
      { rootMargin: "-80px 0px 0px" },
    );
    observer.observe(form);
    return () => observer.disconnect();
  }, []);

  function zoomMap(nextZoom: number) {
    const viewport = mapViewport.current;
    if (nextZoom === zoom) return;
    if (viewport) {
      zoomAnchor.current = (viewport.scrollLeft + viewport.clientWidth / 2) / viewport.scrollWidth;
    }
    setZoom(nextZoom);
  }

  function toggleSeat(seat: CinemaSeat) {
    if (seat.occupied || isPending) return;
    setServerError(null);
    setMessage("");
    const next = new Set(selectedIds);
    const removing = next.delete(seat.id);
    if (!removing) next.add(seat.id);
    setSelected(next);
    setPreviewId((current) =>
      !removing
        ? seat.id
        : current && next.has(current)
          ? current
          : [...next].at(-1) ?? null,
    );
  }

  function prepareSelectedPreview(button: HTMLButtonElement) {
    previewOpener.current = button;
    if (selectedSeats.length) {
      setPreviewId((current) =>
        current && selectedIds.has(current)
          ? current
          : selectedSeats.at(-1)!.id,
      );
    }
  }

  function pickAdjacentSeats() {
    if (isPending) return;
    const group = findAdjacentSeats(seats, groupSize, rowsCount, seatsPerRow, aislesAfter);
    if (!group.length) {
      setMessage(
        `Не удалось найти ${plural(groupSize, ["свободное место", "свободных места", "свободных мест"])} рядом. Уменьшите число билетов или выберите места на схеме.`,
      );
      return;
    }
    setSelected(new Set(group.map((s) => s.id)));
    setPreviewId(group[Math.floor((group.length - 1) / 2)].id);
    setServerError(null);
    setMessage(
      `${group.length === 1 ? "Подобран" : "Подобраны"} ${plural(group.length, ["билет", "билета", "билетов"])}: ряд ${group[0].row}, ${group.length === 1 ? "место" : "места"} ${group.map((s) => s.number).join(", ")}.`,
    );
  }

  function moveFocus(
    event: KeyboardEvent<HTMLButtonElement>,
    seat: CinemaSeat,
  ) {
    const directions: Record<string, [number, number]> = {
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
    };
    const direction = directions[event.key];
    if (!direction) return;
    event.preventDefault();
    let row = seat.row + direction[0];
    let number = seat.number + direction[1];
    while (
      row >= 1 &&
      row <= rowsCount &&
      number >= 1 &&
      number <= seatsPerRow
    ) {
      const next = byCoord.get(`${row}-${number}`);
      if (next && !next.occupied) {
        setFocusedId(next.id);
        seatButtons.current.get(next.id)?.focus();
        return;
      }
      row += direction[0];
      number += direction[1];
    }
  }

  function onSubmit(values: CheckoutInput) {
    if (isPending) return;
    setServerError(null);
    if (!selectedSeats.length) {
      setServerError("Выберите хотя бы одно место на схеме зала.");
      return;
    }
    const seatIds = selectedSeats.map((s) => s.id);
    startTransition(async () => {
      try {
        const result = await createBookingAction({
          showtimeId,
          seatIds,
          contactEmail: values.email,
        });
        if (result.success === false) {
          setServerError(result.error);
          router.refresh();
          return;
        }
        router.push(`/booking/${result.bookingId}`);
      } catch {
        setServerError(
          "Не удалось оформить билеты. Проверьте подключение и попробуйте ещё раз.",
        );
      }
    });
  }

  function goToCheckout() {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    checkoutRef.current?.scrollIntoView({
      behavior: reducedMotion ? "instant" : "smooth",
      block: "start",
    });
    setFocus("email", { shouldSelect: false });
  }

  return (
    <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
      <div className={styles.layout}>
        <div className={styles.hallColumn}>
          <section className={styles.hallPanel} aria-labelledby="hall-title">
            <div className={styles.panelHeading}>
              <div>
                <span className={styles.eyebrow}>СХЕМА ЗАЛА</span>
                <h2 id="hall-title">Выберите места</h2>
                <p>
                  {hallName} <span>·</span>{" "}
                  {plural(freeSeats.length, [
                    "свободное место",
                    "свободных места",
                    "свободных мест",
                  ])}
                </p>
              </div>
              <div className={styles.hallTools}>
                <DialogTrigger asChild>
                  <button
                    ref={headerPreviewButton}
                    className={styles.headerPreview}
                    type="button"
                    disabled={!previewSeat}
                    onClick={(event) => {
                      prepareSelectedPreview(event.currentTarget);
                    }}
                  >
                    <Eye size={14} />
                    <span>Вид с места</span>
                  </button>
                </DialogTrigger>
                <div className={styles.zoomControls} aria-label="Масштаб схемы">
                  <button
                    type="button"
                    aria-label="Уменьшить схему"
                    disabled={zoom <= 0.75}
                    onClick={() => zoomMap(Math.max(0.75, zoom - 0.25))}
                  >
                    <Minus size={15} />
                  </button>
                  <button
                    type="button"
                    className={styles.zoomValue}
                    aria-label="Сбросить масштаб схемы"
                    onClick={() => zoomMap(1)}
                  >
                    {Math.round(zoom * 100)}%
                  </button>
                  <button
                    type="button"
                    aria-label="Увеличить схему"
                    disabled={zoom >= 3}
                    onClick={() => zoomMap(Math.min(3, zoom + 0.25))}
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.screen} aria-hidden="true">
              <svg viewBox="0 0 560 70" preserveAspectRatio="none">
                <path
                  d="M 12 45 Q 280 -16 548 45"
                  className={styles.screenGlow}
                />
                <path
                  d="M 12 45 Q 280 -16 548 45"
                  className={styles.screenEdge}
                />
              </svg>
              <span>ЭКРАН</span>
            </div>

            <p id={helpId} className="sr-only">
              Выбирайте места клавишами со стрелками. Нажмите пробел или Enter,
              чтобы добавить или убрать место.
            </p>
            <div ref={mapViewport} className={styles.mapViewport}>
              <div
                className={styles.seatMap}
                style={
                  {
                    "--seat-zoom": zoom,
                    "--seat-columns": seatsPerRow + aisles.length * 0.85,
                    "--seat-gaps": seatsPerRow + aisles.length + 1,
                  } as CSSProperties
                }
                role="group"
                aria-label="Места в зале"
                aria-describedby={helpId}
                aria-busy={isPending}
              >
                {Array.from({ length: rowsCount }, (_, i) => i + 1).map(
                  (row) => (
                    <div
                      className={styles.seatRow}
                      key={row}
                      role="group"
                      aria-label={`Ряд ${row}`}
                    >
                      <span className={styles.rowNumber} aria-hidden="true">
                        {String(row).padStart(2, "0")}
                      </span>
                      {Array.from({ length: rowLengths.get(row) ?? 0 }, (_, i) => i + 1).map(
                        (number) => {
                          const seat = byCoord.get(`${row}-${number}`);
                          return (
                            <SeatSlot
                              key={number}
                              aisleBefore={aisles.includes(number - 1)}
                              number={number}
                            >
                              {seat ? (
                                <button
                                  type="button"
                                  ref={(node) => {
                                    if (node)
                                      seatButtons.current.set(seat.id, node);
                                    else seatButtons.current.delete(seat.id);
                                  }}
                                  disabled={seat.occupied || isPending}
                                  tabIndex={seat.id === tabStop ? 0 : -1}
                                  onFocus={() => setFocusedId(seat.id)}
                                  onKeyDown={(event) => moveFocus(event, seat)}
                                  onClick={() => toggleSeat(seat)}
                                  aria-label={`Ряд ${row}, место ${number}, ${seat.occupied ? "занято" : selectedIds.has(seat.id) ? "выбрано" : `свободно, ${formatPrice(price)}`}`}
                                  aria-pressed={selectedIds.has(seat.id)}
                                  className={cn(
                                    styles.seat,
                                    seat.occupied && styles.occupied,
                                    selectedIds.has(seat.id) && styles.selected,
                                  )}
                                  data-seat-row={row}
                                  data-seat-number={number}
                                >
                                  <SeatIcon
                                    number={number}
                                    selected={selectedIds.has(seat.id)}
                                    occupied={seat.occupied}
                                  />
                                  {!seat.occupied && (
                                    <span
                                      className={styles.seatTooltip}
                                      aria-hidden="true"
                                    >
                                      Ряд {row} · Место {number}
                                      <small>{formatPrice(price)}</small>
                                    </span>
                                  )}
                                </button>
                              ) : (
                                <span className={styles.missingSeat} />
                              )}
                            </SeatSlot>
                          );
                        },
                      )}
                      {aisles.includes(rowLengths.get(row) ?? 0) && (
                        <span className={styles.aisle} data-aisle-after={rowLengths.get(row)} aria-hidden="true" />
                      )}
                      <span className={styles.rowNumber} aria-hidden="true">
                        {String(row).padStart(2, "0")}
                      </span>
                    </div>
                  ),
                )}
                <div className={styles.rowCaption} aria-hidden="true">
                  НОМЕРА РЯДОВ
                </div>
              </div>
            </div>

            <p className={styles.mapHint}>
              {zoom > 1
                ? "Схему можно прокручивать вбок. Нажмите на масштаб, чтобы увидеть весь зал."
                : "Зал показан целиком. Приближайте схему кнопкой + для точного выбора."}
            </p>
            <div className={styles.legend} aria-label="Обозначения мест">
              <span>
                <SeatIcon />
                Свободно <b>{formatPrice(price)}</b>
              </span>
              <span className={styles.legendSelected}>
                <SeatIcon selected />
                Ваш выбор
              </span>
              <span className={styles.legendOccupied}>
                <SeatIcon occupied />
                Занято
              </span>
            </div>

            <div className={styles.previewTeaser}>
              <div className={styles.previewTeaserIcon}>
                <Eye size={21} />
              </div>
              <div>
                <strong>Как будет видно экран?</strong>
                <p>
                  {previewId && previewSeat
                    ? `Посмотрите из кресла: ряд ${previewSeat.row}, место ${previewSeat.number}`
                    : "Загляните в зал перед выбором билета"}
                </p>
              </div>
              <DialogTrigger asChild>
                <button
                  className={styles.previewButton}
                  type="button"
                  disabled={!previewSeat}
                  onClick={(event) => {
                    prepareSelectedPreview(event.currentTarget);
                  }}
                >
                  <span>Вид с места</span>
                  <ArrowRight size={16} />
                </button>
              </DialogTrigger>
            </div>
          </section>

          <section
            className={styles.smartPicker}
            aria-label="Подбор соседних мест"
          >
            <div className={styles.smartHeading}>
              <Sparkles size={20} />
              <div>
                <h3>В кино вместе</h3>
                <p>Подберём свободные места рядом, ближе к центру.</p>
              </div>
            </div>
            <div className={styles.smartActions}>
              <label className={styles.groupSelect}>
                <span className="sr-only">Количество билетов для подбора</span>
                <select
                  value={groupSize}
                  onChange={(event) => setGroupSize(Number(event.target.value))}
                  disabled={isPending}
                >
                  {Array.from(
                    { length: Math.min(6, seatsPerRow) },
                    (_, i) => i + 1,
                  ).map((n) => (
                    <option key={n} value={n}>
                      {plural(n, ["билет", "билета", "билетов"])}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className={styles.findButton}
                disabled={isPending || !freeSeats.length}
                onClick={pickAdjacentSeats}
              >
                Подобрать
                <ArrowRight size={15} />
              </button>
            </div>
            {selectedSeats.length > 0 && (
              <p className={styles.replaceHint}>
                Подбор заменит текущий выбор.
              </p>
            )}
            <p
              className={styles.selectionMessage}
              role="status"
              aria-live="polite"
            >
              {message}
            </p>
          </section>
        </div>

        <aside
          ref={checkoutRef}
          className={styles.orderPanel}
          aria-labelledby="order-title"
        >
          <div className={styles.orderHeading}>
            <Ticket size={20} />
            <span className={styles.eyebrow}>ДЕТАЛИ ЗАКАЗА</span>
          </div>
          <h2 id="order-title">Ваши билеты</h2>
          <div className={styles.orderMovie}>
            <strong>{movieTitle}</strong>
            <span>{sessionLabel}</span>
            <span>{hallName}</span>
          </div>

          <div className={styles.ticketDivider}>
            <span />
          </div>
          <div className={styles.selectedHeading}>
            <span>
              Выбранные места <b>{selectedSeats.length}</b>
            </span>
            {selectedSeats.length > 0 && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setSelected(new Set());
                  setPreviewId(null);
                  setMessage("");
                  setServerError(null);
                }}
              >
                Очистить
              </button>
            )}
          </div>

          {selectedSeats.length === 0 ? (
            <div className={styles.emptySelection}>
              <Ticket size={29} strokeWidth={1.2} />
              <p>Здесь будут ваши билеты</p>
              <span>
                {freeSeats.length
                  ? "Выберите кресла на схеме зала"
                  : "На этот сеанс свободных мест нет"}
              </span>
            </div>
          ) : (
            <ul className={styles.ticketList}>
              {selectedSeats.map((s) => (
                <li key={s.id}>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className={styles.ticketSeat}
                      onClick={(event) => {
                        previewOpener.current = event.currentTarget;
                        setPreviewId(s.id);
                      }}
                      aria-label={`Посмотреть вид с места: ряд ${s.row}, место ${s.number}`}
                    >
                      <span>
                        Ряд <b>{s.row}</b>
                      </span>
                      <span>
                        Место <b>{s.number}</b>
                      </span>
                      <Eye size={14} />
                    </button>
                  </DialogTrigger>
                  <span className={styles.ticketPrice}>
                    {formatPrice(price)}
                  </span>
                  <button
                    type="button"
                    className={styles.removeSeat}
                    disabled={isPending}
                    onClick={() => toggleSeat(s)}
                    aria-label={`Убрать место ${s.number} из ряда ${s.row}`}
                  >
                    <X size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div
            className={styles.totalRow}
            aria-live="polite"
            aria-atomic="true"
          >
            <div>
              <span>Итого</span>
              <small>
                {selectedSeats.length
                  ? plural(selectedSeats.length, ["билет", "билета", "билетов"])
                  : "Места ещё не выбраны"}
              </small>
            </div>
            <strong>{formatPrice(totalPrice)}</strong>
          </div>

          <form
            ref={checkoutFormRef}
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className={styles.checkoutForm}
          >
            <label htmlFor={emailId}>Контактный email</label>
            <div className={styles.emailField}>
              <Mail size={17} />
              <input
                id={emailId}
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                disabled={isPending}
                aria-invalid={!!errors.email}
                aria-describedby={`${emailId}-hint${errors.email ? ` ${emailId}-error` : ""}`}
                {...register("email")}
              />
            </div>
            {errors.email && (
              <p id={`${emailId}-error`} className={styles.error} role="alert">
                {errors.email.message}
              </p>
            )}
            <p id={`${emailId}-hint`} className={styles.formHint}>
              {userEmail
                ? "Билеты сохранятся в вашем личном кабинете."
                : "Можно оформить без регистрации. Билеты появятся на следующем экране."}
            </p>
            {serverError && (
              <p className={styles.error} role="alert">
                {serverError}
              </p>
            )}
            <button
              type="submit"
              className={styles.checkoutButton}
              disabled={isPending || !selectedSeats.length}
            >
              {isPending ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Оформляем билеты…
                </>
              ) : (
                <>
                  <span>
                    {selectedSeats.length
                      ? "Оформить билеты"
                      : "Выберите места"}
                  </span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
            <p className={styles.demoNote}>
              Учебное оформление без списания средств.
              <br />
              Места закрепятся после оформления.
            </p>
          </form>
        </aside>
      </div>

      {selectedSeats.length > 0 && (
        <div className={styles.mobileCheckout} data-checkout-visible={checkoutVisible}>
          <div>
            <span>
              {plural(selectedSeats.length, ["билет", "билета", "билетов"])}
            </span>
            <strong>{formatPrice(totalPrice)}</strong>
          </div>
          <div className={styles.mobileActions}>
            <DialogTrigger asChild>
              <button
                type="button"
                className={styles.mobilePreview}
                aria-label="Посмотреть вид с выбранного места"
                onClick={(event) => prepareSelectedPreview(event.currentTarget)}
              >
                <Eye size={18} />
                Вид
              </button>
            </DialogTrigger>
            <button
              type="button"
              className={styles.mobileContinue}
              onClick={goToCheckout}
              disabled={isPending}
            >
              К оформлению
              <ArrowDown size={17} />
            </button>
          </div>
        </div>
      )}

      {previewSeat && (
        <DialogContent
          showCloseButton={false}
          className={styles.previewDialog}
          data-hall-theme={hallTheme}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            (previewOpener.current?.isConnected
              ? previewOpener.current
              : headerPreviewButton.current
            )?.focus();
          }}
        >
          <div className={styles.previewDialogHeading}>
            <div>
              <span className={styles.eyebrow}>ПОСМОТРИТЕ ПЕРЕД ВЫБОРОМ</span>
              <DialogTitle className={styles.previewTitle}>
                Ваш взгляд на экран
              </DialogTitle>
            </div>
            <button
              type="button"
              className={styles.closePreview}
              onClick={() => setPreviewOpen(false)}
              aria-label="Закрыть предпросмотр"
            >
              <X size={21} />
            </button>
          </div>
          <div className={styles.perspectiveScene}>
            <HallPreview
              seat={previewSeat}
              seats={seats}
              seatsPerRow={seatsPerRow}
              aislesAfter={aislesAfter}
              theme={hallTheme}
            />
            <div className={styles.sceneBadge}>
              <span />
              {hallName}
            </div>
            <span className={styles.sceneCaption}>Кадр из «Дюны»</span>
          </div>
          <div className={styles.previewDetails}>
            <div className={styles.previewSeatInfo}>
              <span className={styles.eyebrow}>
                {previewSeat.row <= rowsCount * 0.33
                  ? "БЛИЖЕ К ЭКРАНУ"
                  : previewSeat.row >= rowsCount * 0.78
                    ? "ДАЛЬНИЕ РЯДЫ"
                    : "СРЕДНИЕ РЯДЫ"}
              </span>
              <h3>
                Ряд {previewSeat.row}
                <span>·</span>Место {previewSeat.number}
              </h3>
              <p>
                {formatPrice(price)} <span>·</span>{" "}
                {Math.abs(previewSeat.number - (seatsPerRow + 1) / 2) <=
                seatsPerRow * 0.22
                  ? "Ближе к центру"
                  : "Боковой ракурс"}
              </p>
            </div>
            <div className={styles.previewMiniMap}>
              <HallMiniMap
                seats={seats}
                rowsCount={rowsCount}
                seatsPerRow={seatsPerRow}
                aislesAfter={aislesAfter}
                activeId={previewSeat.id}
                selected={selectedIds}
              />
            </div>
            <div className={styles.previewNavigation}>
              <button
                type="button"
                aria-label="Предыдущее свободное место"
                disabled={previewIndex <= 0}
                onClick={() => setPreviewId(freeSeats[previewIndex - 1].id)}
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                aria-label="Следующее свободное место"
                disabled={
                  previewIndex < 0 || previewIndex >= freeSeats.length - 1
                }
                onClick={() => setPreviewId(freeSeats[previewIndex + 1].id)}
              >
                <ChevronRight size={20} />
              </button>
            </div>
            <button
              type="button"
              className={cn(
                styles.previewChoose,
                selectedIds.has(previewSeat.id) && styles.previewChosen,
              )}
              aria-pressed={selectedIds.has(previewSeat.id)}
              aria-label={
                selectedIds.has(previewSeat.id)
                  ? "Убрать это место из выбора"
                  : "Выбрать это место"
              }
              disabled={isPending || previewSeat.occupied}
              onClick={() => toggleSeat(previewSeat)}
            >
              {selectedIds.has(previewSeat.id) ? (
                <>
                  <Check size={17} />
                  Место выбрано
                </>
              ) : previewSeat.occupied ? (
                "Место занято"
              ) : (
                <>
                  Выбрать это место
                  <Plus size={17} />
                </>
              )}
            </button>
          </div>
          <div className={styles.previewFooter}>
            <DialogDescription className={styles.previewDisclaimer}>
              Условная визуализация: ракурс зависит от ряда и места. Размеры и
              отделка зала могут отличаться.
            </DialogDescription>
            <button type="button" onClick={() => setPreviewOpen(false)}>
              <ArrowLeft size={14} />К схеме зала
            </button>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}

function SeatSlot({
  children,
  aisleBefore,
  number,
}: {
  children: React.ReactNode;
  aisleBefore: boolean;
  number: number;
}) {
  return (
    <>
      {aisleBefore && <span className={styles.aisle} data-aisle-after={number - 1} aria-hidden="true" />}
      {children}
    </>
  );
}

function SeatIcon({
  number,
  selected,
  occupied,
}: {
  number?: number;
  selected?: boolean;
  occupied?: boolean;
}) {
  return (
    <svg viewBox="0 0 32 30" fill="none" aria-hidden="true">
      <path
        d="M6 7c0-2.76 2.24-5 5-5h10c2.76 0 5 2.24 5 5v12H6V7Z"
        fill="currentColor"
      />
      <path
        d="M7 7c0-2.21 1.79-4 4-4h10c2.21 0 4 1.79 4 4"
        stroke="white"
        strokeOpacity=".2"
      />
      <path d="M7 18h18v7H7z" fill="currentColor" />
      <path d="M7 19h18" stroke="black" strokeOpacity=".22" />
      <rect x="2" y="13" width="5" height="13" rx="2" fill="currentColor" />
      <rect x="25" y="13" width="5" height="13" rx="2" fill="currentColor" />
      <path
        d="M7 26h18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {selected ? (
        <path
          d="m12 11 3 3 5-6"
          stroke="#302219"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : occupied ? (
        <path
          d="m13 9 6 6m0-6-6 6"
          stroke="#676570"
          strokeWidth="1.25"
          strokeLinecap="round"
        />
      ) : number ? (
        <text
          x="16"
          y="14"
          textAnchor="middle"
          fill="#f8e7e7"
          fontSize="9"
          fontWeight="600"
          fontFamily="inherit"
        >
          {number}
        </text>
      ) : null}
    </svg>
  );
}
