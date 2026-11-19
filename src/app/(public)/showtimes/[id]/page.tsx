import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock3, MapPin } from "lucide-react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCinemaTheme } from "@/lib/cinema-theme";
import { SeatPicker } from "@/components/booking/seat-picker";
import styles from "@/components/booking/booking.module.css";

const hallFormats: Record<string, string> = {
  STANDARD_2D: "2D",
  FORMAT_3D: "3D",
  IMAX: "IMAX",
  VIP: "VIP",
};

export default async function ShowtimePage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const showtime = await prisma.showtime.findUnique({
    where: { id },
    include: {
      movie: { select: { title: true, durationMin: true, ageRating: true } },
      hall: {
        include: {
          seats: {
            where: { isActive: true },
            orderBy: [{ row: "asc" }, { number: "asc" }],
          },
        },
      },
      tickets: { select: { seatId: true } },
    },
  });
  if (!showtime) notFound();
  const hallTheme = getCinemaTheme(showtime.hall.name);
  if (showtime.startsAt <= new Date()) {
    return (
      <section className={styles.page} data-cinema-booking data-hall-theme={hallTheme}>
        <div className={styles.inner}>
          <Link
            href={`/movies/${showtime.movieId}`}
            className={styles.backLink}
          >
            <ArrowLeft size={15} />К расписанию фильма
          </Link>
          <div className={styles.hero}>
            <div>
              <span className={styles.eyebrow}>ПРОДАЖИ ЗАВЕРШЕНЫ</span>
              <h1>Этот сеанс уже начался</h1>
              <p className="text-sm text-muted-foreground">
                Выберите другое время в расписании фильма.
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const occupiedSeatIds = new Set(showtime.tickets.map((t) => t.seatId));
  const session = await auth();
  const dateLabel = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    weekday: "short",
    timeZone: "Europe/Moscow",
  }).format(showtime.startsAt);
  const timeLabel = new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
  }).format(showtime.startsAt);

  return (
    <section className={styles.page} data-cinema-booking data-hall-theme={hallTheme}>
      <div className={styles.inner}>
        <Link href={`/movies/${showtime.movieId}`} className={styles.backLink}>
          <ArrowLeft size={15} />К фильму и сеансам
        </Link>
        <div className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>БИЛЕТЫ В КИНО</span>
            <h1>{showtime.movie.title}</h1>
            <div className={styles.movieMeta}>
              <span>
                <CalendarDays size={14} />
                {dateLabel}
                <b className="font-medium text-[#ead3b4]">· {timeLabel}</b>
              </span>
              <span>
                <MapPin size={14} />
                {showtime.hall.name}
              </span>
              <span>
                <Clock3 size={14} />
                {showtime.movie.durationMin} мин
              </span>
              <span className={styles.formatBadge}>
                {hallFormats[showtime.hall.format] ?? "2D"}
              </span>
              <span className={styles.ageBadge}>
                {showtime.movie.ageRating}
              </span>
            </div>
          </div>
          <ol className={styles.steps} aria-label="Этапы оформления">
            <li className={styles.activeStep} aria-current="step">
              <b>1</b>
              <span>Выбор мест</span>
            </li>
            <li className={styles.stepLine} aria-hidden="true" />
            <li>
              <b>2</b>
              <span>Ваши билеты</span>
            </li>
          </ol>
        </div>
        <SeatPicker
          showtimeId={showtime.id}
          price={Number(showtime.price)}
          rowsCount={showtime.hall.rowsCount}
          seatsPerRow={showtime.hall.seatsPerRow}
          aislesAfter={showtime.hall.aislesAfter}
          seats={showtime.hall.seats.map((s) => ({
            id: s.id,
            row: s.row,
            number: s.number,
            occupied: occupiedSeatIds.has(s.id),
          }))}
          userEmail={session?.user?.email ?? null}
          movieTitle={showtime.movie.title}
          hallName={showtime.hall.name}
          hallTheme={hallTheme}
          sessionLabel={`${dateLabel} · ${timeLabel}`}
        />
      </div>
    </section>
  );
}
