// Скрипт наполнения БД тестовыми данными.
// Запуск: npx prisma db seed
//
// Создаёт:
//  - 1 админ (admin@cinema.local / admin123) и 1 клиент (client@cinema.local / client123)
//  - 5 жанров
//  - 8 фильмов (с постерами с TMDB-cdn, чтобы не возиться с загрузкой)
//  - 3 зала разных форматов с автогенерацией мест
//  - сеансы на 7 ближайших дней: для каждого активного фильма по 5 в день,
//    с разной ценой по времени (утро 200 / день 250 / вечер 350)
//  - 1 демо-бронирование от клиента
//
// Skip-логика: если данные уже есть (по уникальным email/name), скрипт идемпотентен —
// можно запускать повторно без дублей.

import "dotenv/config";
import bcrypt from "bcryptjs";
import { addDays, setHours, setMinutes, setSeconds, setMilliseconds, startOfDay } from "date-fns";

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { ensureHallLayout, HALL_LAYOUTS } from "./hall-layouts";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Генератор кинопостеров через placehold.co.
// Тёмный фон + золотой текст, шрифт Oswald — выглядит как настоящая киноафиша.
// В дипломе можно подключить реальную загрузку файлов через next/image в S3/локально.
function posterUrl(title: string): string {
  const text = encodeURIComponent(title);
  return `https://placehold.co/500x750/0a0a0a/d4af37.png?font=oswald&text=${text}`;
}

async function main() {
  console.log("🌱 Начинаю seed...");

  // === Пользователи ===
  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  const clientPasswordHash = await bcrypt.hash("client123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@cinema.local" },
    update: {},
    create: {
      email: "admin@cinema.local",
      name: "Администратор",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
    },
  });

  const client = await prisma.user.upsert({
    where: { email: "client@cinema.local" },
    update: {},
    create: {
      email: "client@cinema.local",
      name: "Иван Демо",
      passwordHash: clientPasswordHash,
      role: "CLIENT",
      loyaltyPoints: 150,
    },
  });

  console.log(`✓ Пользователи: ${admin.email}, ${client.email}`);

  // === Жанры ===
  const genreNames = ["Боевик", "Драма", "Комедия", "Фантастика", "Триллер", "Анимация"];
  const genres = await Promise.all(
    genreNames.map((name) =>
      prisma.genre.upsert({ where: { name }, update: {}, create: { name } }),
    ),
  );
  const genreMap = Object.fromEntries(genres.map((g) => [g.name, g.id]));
  console.log(`✓ Жанры: ${genres.length}`);

  // === Фильмы ===
  const moviesData = [
    {
      title: "Дюна: Часть третья",
      description:
        "Пол Атрейдес продолжает войну со Знатными Домами Империи. Эпический финал саги Дени Вильнёва.",
      durationMin: 165,
      ageRating: "12+",
      director: "Дени Вильнёв",
      cast: "Тимоти Шаламе, Зендея, Ребекка Фергюсон",
      releaseDate: new Date("2026-03-15"),
      genres: ["Фантастика", "Драма"],
    },
    {
      title: "Оппенгеймер 2",
      description:
        "Биографическая драма о послевоенных годах учёного. Кристофер Нолан возвращается к истории создания атомной бомбы.",
      durationMin: 180,
      ageRating: "16+",
      director: "Кристофер Нолан",
      cast: "Киллиан Мёрфи, Эмили Блант",
      releaseDate: new Date("2026-04-22"),
      genres: ["Драма", "Триллер"],
    },
    {
      title: "Аватар: Семя пепла",
      description:
        "Джейк Салли защищает Пандору от новых пришельцев. Очередная глава саги Джеймса Кэмерона.",
      durationMin: 192,
      ageRating: "12+",
      director: "Джеймс Кэмерон",
      cast: "Сэм Уортингтон, Зои Салдана",
      releaseDate: new Date("2026-05-01"),
      genres: ["Фантастика", "Боевик"],
    },
    {
      title: "Холоп. Возвращение",
      description:
        "Продолжение народной комедии. Григорий снова попадает в передрягу — теперь во времена Петра I.",
      durationMin: 110,
      ageRating: "12+",
      director: "Клим Шипенко",
      cast: "Милош Бикович, Александра Бортич",
      releaseDate: new Date("2026-05-10"),
      genres: ["Комедия"],
    },
    {
      title: "Бойцовский клуб: Перезагрузка",
      description:
        "Тайлер Дёрден возвращается в новой эпохе цифрового потребления. Современная экранизация по мотивам Чака Паланика.",
      durationMin: 140,
      ageRating: "18+",
      director: "Дэвид Финчер",
      cast: "Эдвард Нортон, Брэд Питт",
      releaseDate: new Date("2026-04-30"),
      genres: ["Триллер", "Драма"],
    },
    {
      title: "Головоломка 3",
      description:
        "Эмоции Райли взрослеют вместе с ней. Pixar снова доказывает, что мультфильмы бывают для взрослых.",
      durationMin: 95,
      ageRating: "0+",
      director: "Келси Манн",
      cast: "Эми Полер, Майя Хоук",
      releaseDate: new Date("2026-05-08"),
      genres: ["Анимация", "Комедия"],
    },
    {
      title: "Джон Уик: Балерина",
      description:
        "Спин-офф вселенной Джона Уика. История молодой убийцы из Руски Романи.",
      durationMin: 125,
      ageRating: "18+",
      director: "Лен Уайзман",
      cast: "Ана де Армас, Киану Ривз",
      releaseDate: new Date("2026-05-12"),
      genres: ["Боевик", "Триллер"],
    },
    {
      title: "Барби: Сиквел",
      description:
        "Барбиленд переживает новый кризис идентичности. Грета Гервиг продолжает разговор о современности.",
      durationMin: 118,
      ageRating: "12+",
      director: "Грета Гервиг",
      cast: "Марго Робби, Райан Гослинг",
      releaseDate: new Date("2026-06-01"),
      genres: ["Комедия", "Фантастика"],
    },
  ].map((m) => ({ ...m, posterUrl: posterUrl(m.title) }));

  // title не unique в схеме, поэтому используем findFirst → create/update вместо upsert.
  // Если фильм уже есть — обновляем posterUrl и описания (чтобы при повторном seed
  // подтянулись свежие постеры из placehold.co).
  const movies = [];
  for (const data of moviesData) {
    const { genres: movieGenres, ...rest } = data;
    const existing = await prisma.movie.findFirst({ where: { title: rest.title } });
    const movie = existing
      ? await prisma.movie.update({ where: { id: existing.id }, data: rest })
      : await prisma.movie.create({ data: rest });

    // Подвязываем жанры (сбрасываем существующие связи и ставим новые).
    await prisma.movie.update({
      where: { id: movie.id },
      data: {
        genres: {
          set: [],
          connect: movieGenres.map((name) => ({ id: genreMap[name] })),
        },
      },
    });
    movies.push(movie);
  }
  console.log(`✓ Фильмы: ${movies.length}`);

  // === Залы и места ===
  const halls = [];
  for (const data of HALL_LAYOUTS) {
    const { hall } = await ensureHallLayout(prisma, data);
    halls.push(hall);
  }
  console.log(`✓ Залы: ${halls.length} (с автогенерацией мест)`);

  // === Сеансы (5 на день для каждого активного фильма, на 7 дней вперёд) ===
  // Перед пересозданием сеансов нужно убрать существующие бронирования и билеты,
  // иначе FK-ограничение Postgres не даст удалить showtime, на который есть FK.
  // Tickets удаляются каскадно от Booking, а Booking → удаляем напрямую.
  await prisma.ticket.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.showtime.deleteMany({});

  const today = startOfDay(new Date());
  const timeSlots = [
    { hours: 10, minutes: 0, price: 200 }, // утро
    { hours: 13, minutes: 30, price: 250 }, // день
    { hours: 16, minutes: 0, price: 250 }, // день
    { hours: 19, minutes: 30, price: 350 }, // вечер
    { hours: 22, minutes: 0, price: 350 }, // вечер
  ];

  let showtimeCount = 0;
  for (let day = 0; day < 7; day++) {
    const date = addDays(today, day);
    for (const movie of movies) {
      // Каждому фильму назначаем зал циклически
      for (let i = 0; i < timeSlots.length; i++) {
        const slot = timeSlots[i];
        const hall = halls[(movies.indexOf(movie) + i + day) % halls.length];
        const startsAt = setMilliseconds(
          setSeconds(setMinutes(setHours(date, slot.hours), slot.minutes), 0),
          0,
        );
        await prisma.showtime.create({
          data: {
            movieId: movie.id,
            hallId: hall.id,
            startsAt,
            price: slot.price,
          },
        });
        showtimeCount++;
      }
    }
  }
  console.log(`✓ Сеансы: ${showtimeCount}`);

  // === Демо-бронирование от клиента ===
  // Берём какой-нибудь ближайший сеанс и покупаем 2 места.
  const demoShowtime = await prisma.showtime.findFirst({
    where: { startsAt: { gte: new Date() } },
    orderBy: { startsAt: "asc" },
    include: { hall: { include: { seats: { where: { isActive: true }, take: 2 } } } },
  });

  if (demoShowtime && demoShowtime.hall.seats.length >= 2) {
    const totalPrice = Number(demoShowtime.price) * 2;
    await prisma.booking.create({
      data: {
        userId: client.id,
        showtimeId: demoShowtime.id,
        contactEmail: client.email,
        status: "PAID",
        totalPrice,
        tickets: {
          create: demoShowtime.hall.seats.map((seat) => ({
            showtimeId: demoShowtime.id,
            seatId: seat.id,
            price: demoShowtime.price,
          })),
        },
      },
    });
    console.log(`✓ Демо-бронирование клиента: 2 билета на «${demoShowtime.startsAt.toISOString()}»`);
  }

  console.log("🌱 Seed готов.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
