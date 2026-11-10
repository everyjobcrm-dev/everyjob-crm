"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { LayoutGroup } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { TextRotate } from "@/components/ui/text-rotate";
import { Typewriter } from "@/components/ui/typewriter-text";

const ease = [0.16, 1, 0.3, 1] as const;

const rotatingPromises = ["משמרות טובות.", "שכר הוגן.", "צוות מנצח.", "גיוס אמיתי."];
const staffedRoles = ["מלצרים ומלצריות.", "ברמנים.", "צוותי הפקה.", "אנשי אבטחה.", "כוח אדם לאירועים."];
const roles = ["מלצרות", "בר", "הפקה", "אבטחה", "אירוח", "כנסים", "חתונות", "אירועי חברה"];

// The logo is three hands meeting in the middle. These are the three hands.
const hands = [
  {
    who: "עובדים",
    title: "רואים משמרת, נרשמים, עובדים",
    points: [
      "כל האירועים הפתוחים, עם התפקיד והשכר לשעה",
      "אישורים ורשימת המתנה, בלי לרדוף אחרי אף אחד",
      "שעות מאושרות ושכר משוער, חודש בחודשו",
    ],
    bg: "bg-sky",
  },
  {
    who: "מנהלי שטח ומגייסים",
    title: "מאיישים אירוע בלי אקסלים",
    points: [
      "אישור הרשמות, שיבוץ וקידום מרשימת ההמתנה",
      "נוכחות ודירוג בסוף כל משמרת",
      "זיכוי גיוס למגייסים על כל שעה מאושרת",
    ],
    bg: "bg-pink",
  },
  {
    who: "עסקים ולקוחות",
    title: "צוות מלא, בזמן",
    points: [
      "מלצרים, ברמנים, הפקה ואבטחה, לפי האירוע",
      "איוש מנוהל ומבוקר לכל תפקיד",
      "דיווח שעות מאושר ושקוף בסוף כל אירוע",
    ],
    bg: "bg-sun",
  },
] as const;

const steps = [
  { title: "נרשמים", body: "פותחים חשבון עם תעודת זהות ואימייל.", rule: "border-pink" },
  { title: "בוחרים משמרת", body: "רואים תפקיד, שעות ושכר, ונרשמים למה שמתאים.", rule: "border-sun" },
  { title: "עובדים ומקבלים שכר", body: "השעות מדווחות ומאושרות, והשכר המשוער גלוי לכם.", rule: "border-sky" },
];

const values = [
  { title: "שקיפות", body: "יושר מלא בכל שלב, מהראיון ועד לשכר בפועל." },
  { title: "אמינות", body: "מילה שלנו היא התחייבות. מקפידים על כל הבטחה." },
  { title: "מקצועיות", body: "ניסיון של שנים והיכרות מעמיקה עם עולם ההשמה." },
];

function Logo({ className = "h-10" }: { className?: string }) {
  return (
    <Image
      src="/images/everyJob-logo.png"
      alt="everyJob"
      width={738}
      height={411}
      priority
      className={`w-auto mix-blend-multiply ${className}`}
    />
  );
}

/** A sleeve cuff from the logo: a rounded bar with its button. */
function Cuff({ className }: { className: string }) {
  return (
    <span className={`flex items-center justify-start rounded-2xl ps-3 ${className}`} aria-hidden="true">
      <span className="h-2 w-2 rounded-full bg-ink/70" />
    </span>
  );
}

function useDrift(value: MotionValue<number>, amount: number) {
  return useTransform(value, (n) => n * amount);
}

export default function Home() {
  const reduce = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const photoY = useTransform(scrollYProgress, [0, 1], [0, 80]);

  // the disc and the cuffs drift a little against the pointer, so the collage has depth
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 16 });
  const sy = useSpring(my, { stiffness: 60, damping: 16 });
  const backX = useDrift(sx, -22);
  const backY = useDrift(sy, -22);
  const frontX = useDrift(sx, 26);
  const frontY = useDrift(sy, 26);

  function onHeroMove(e: React.MouseEvent<HTMLElement>) {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  }

  return (
    <main className="overflow-x-clip bg-canvas text-ink">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-4 sm:px-8 lg:px-12">
        <Link href="/" aria-label="everyJob - דף הבית">
          <Logo className="h-12 sm:h-14" />
        </Link>
        <nav className="hidden items-center gap-9 text-sm font-medium md:flex" aria-label="ניווט ראשי">
          <Link href="#who" className="hover:underline hover:underline-offset-8">למי זה מתאים</Link>
          <Link href="#how" className="hover:underline hover:underline-offset-8">איך זה עובד</Link>
          <Link href="#about" className="hover:underline hover:underline-offset-8">מי אנחנו</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="btn px-3 hover:bg-surface2">כניסה</Link>
          <Link href="/register" className="btn btn-primary">הרשמה</Link>
        </div>
      </header>

      {/* ================= HERO ================= */}
      <section ref={heroRef} onMouseMove={onHeroMove}>
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-6 px-5 pb-16 pt-8 sm:px-8 md:grid-cols-12 md:pb-24 md:pt-12 lg:px-12">
          <div className="text-center md:col-span-7 md:text-start">
            <h1 className="font-display text-[12.5vw] font-black leading-[1.02] tracking-tight sm:text-7xl lg:text-[6.75rem]">
              <motion.span
                className="block"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease }}
              >
                אנשים טובים,
              </motion.span>
              <motion.span
                className="mt-2 flex justify-center md:justify-start"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.12, ease }}
              >
                <LayoutGroup>
                  <TextRotate
                    texts={rotatingPromises}
                    mainClassName="-rotate-1 bg-sun px-[0.16em] pb-[0.06em]"
                    staggerFrom="last"
                    staggerDuration={0.02}
                    splitLevelClassName="overflow-hidden pb-1"
                    transition={{ type: "spring", damping: 28, stiffness: 350 }}
                    rotationInterval={2600}
                  />
                </LayoutGroup>
              </motion.span>
            </h1>

            <p className="mx-auto mt-9 max-w-xl text-lg leading-8 text-muted md:mx-0">
              everyJob מאחדת ניהול עובדים, שיבוצים, נוכחות ושכר: כל מה שצריך כדי להפעיל צוות אירועים מנצח, מהראיון ועד
              למשמרת הראשונה.
            </p>

            <div className="mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center md:justify-start">
              <Link href="/register" className="btn btn-primary btn-lg group">
                מצטרפים לצוות
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" aria-hidden="true" />
              </Link>
              <Link href="/login" className="btn btn-lg underline-offset-8 hover:underline">
                כבר רשומים? כניסה
              </Link>
            </div>
          </div>

          {/* the logo, life-size: its dotted ring, two cuffs, and one of the people it stands for */}
          <div className="relative mx-auto mt-4 h-[420px] w-full max-w-[400px] md:col-span-5 md:mt-0 md:h-[580px] md:max-w-none">
            <motion.div style={{ x: backX, y: backY }} className="absolute inset-0" aria-hidden="true">
              <div className="absolute -inset-x-[4%] top-[3%] aspect-square animate-spin-slow rounded-full border-[3px] border-dotted border-ink/25" />
              <div className="absolute inset-x-[8%] top-[10%] aspect-square rounded-full bg-sun" />
            </motion.div>

            <motion.div style={{ x: frontX, y: frontY }} className="absolute inset-0" aria-hidden="true">
              <motion.div
                initial={{ x: 80, opacity: 0, rotate: -40 }}
                animate={{ x: 0, opacity: 1, rotate: -16 }}
                transition={{ duration: 0.9, delay: 0.3, ease }}
                className="absolute -start-2 top-[12%]"
              >
                <Cuff className="h-14 w-36 bg-sky" />
              </motion.div>
              <motion.div
                initial={{ x: -80, opacity: 0, rotate: 40 }}
                animate={{ x: 0, opacity: 1, rotate: 14 }}
                transition={{ duration: 0.9, delay: 0.4, ease }}
                className="absolute -end-1 bottom-[20%]"
              >
                <Cuff className="h-14 w-40 bg-pink" />
              </motion.div>
            </motion.div>

            <motion.div
              style={{ y: photoY }}
              className="absolute inset-0 [mask-image:linear-gradient(to_bottom,black_82%,transparent)]"
            >
              <Image
                src="/images/tamarImage.png"
                alt="חברת צוות של everyJob"
                fill
                priority
                sizes="(max-width: 768px) 400px, 520px"
                className="object-contain object-bottom"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* what we staff, as a plain line of type */}
      <p className="border-y border-ink px-5 py-6 text-center font-display text-2xl font-bold leading-[1.9] sm:text-3xl">
        {roles.map((role, i) => (
          <span key={role}>
            {i > 0 && <span className="px-4 text-muted" aria-hidden="true">/</span>}
            {role}
          </span>
        ))}
      </p>

      {/* ================= THREE HANDS ================= */}
      <section id="who" className="scroll-mt-8 px-5 pt-24 sm:px-8 lg:px-12 lg:pt-32">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display text-5xl font-black leading-[1.05] sm:text-7xl">
            שלוש ידיים.
            <br />
            צוות אחד.
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-8 text-muted">
            כמו בלוגו שלנו: עובדים, מנהלי שטח ולקוחות נפגשים באמצע.
          </p>

          {/* the cards pile onto each other as you scroll, the way the hands pile up in the logo */}
          <div className="mt-14">
            {hands.map((hand, i) => (
              <article
                key={hand.who}
                className={`sticky mb-6 grid gap-8 rounded-3xl p-7 sm:p-10 lg:grid-cols-2 lg:gap-16 lg:p-14 ${hand.bg}`}
                style={{ top: `${1.5 + i * 1.5}rem` }}
              >
                <div>
                  <p className="text-sm font-bold">
                    <span className="font-display text-base tabular-nums">0{i + 1}</span>
                    <span className="px-2" aria-hidden="true">/</span>
                    {hand.who}
                  </p>
                  <h3 className="mt-5 font-display text-4xl font-black leading-[1.1] sm:text-5xl">{hand.title}</h3>
                </div>
                <ul className="self-end border-t border-ink/30">
                  {hand.points.map((point) => (
                    <li key={point} className="border-b border-ink/30 py-4 text-lg leading-7">
                      {point}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ================= HOW ================= */}
      <section id="how" className="scroll-mt-8 px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display text-5xl font-black sm:text-6xl">איך זה עובד</h2>
          <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
            {steps.map((step, i) => (
              <li key={step.title} className={`border-t-[6px] pt-5 ${step.rule}`}>
                <span className="font-display text-7xl font-black leading-none tabular-nums" aria-hidden="true">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-2xl font-bold">{step.title}</h3>
                <p className="mt-2 max-w-xs leading-7 text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ================= ABOUT ================= */}
      <section id="about" className="scroll-mt-8 border-t border-ink px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
        <div className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <h2 className="font-display text-5xl font-black sm:text-6xl">מי אנחנו?</h2>
            <p className="mt-5 flex flex-wrap items-center gap-2 font-display text-xl sm:text-2xl">
              <span className="text-muted">מאיישים:</span>
              <Typewriter text={staffedRoles} speed={70} deleteSpeed={35} delay={1400} loop cursor="|" className="font-bold" />
            </p>
            <p className="mt-8 text-xl font-medium leading-9">
              חברת כוח אדם והשמה שנולדה מתוך הרצון לתת מענה אמיתי למציאת עבודה בתנאים נוחים, עם שכר מתגמל ויחס אישי
              וחם.
            </p>
            <p className="mt-6 leading-8 text-muted">
              בכל יום אנו מחברים בין אנשים שמחפשים להתקדם ולהתפתח, לבין עסקים הזקוקים לכוח אדם איכותי, מקצועי, אמין
              ומותאם במדויק לצרכים שלהם, תוך התמקדות ברווחת העובד ובהגשמת שאיפותיו. הצוות שלנו חי ונושם את תחום הגיוס
              וההשמה, עם ניסיון של שנים והיכרות מעמיקה עם האתגרים, הרצונות והצרכים של שני הצדדים. אנחנו לא מסתפקים
              בלמצוא עבודה, אלא יוצרים שותפויות ארוכות טווח, מלווים ומכוונים כדי שכל השמה תהפוך לסיפור הצלחה אמיתי.
            </p>
          </div>
          <dl className="self-end border-t border-line-strong lg:col-span-5">
            {values.map((value) => (
              <div key={value.title} className="border-b border-line-strong py-6">
                <dt className="font-display text-2xl font-bold">{value.title}</dt>
                <dd className="mt-1 leading-7 text-muted">{value.body}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ================= CLOSING ================= */}
      <section className="bg-ink px-6 py-24 text-center text-surface sm:py-32">
        <div className="mx-auto flex max-w-3xl flex-col items-center">
          <Huddle />
          <h2 className="mt-12 font-display text-5xl font-black leading-[1.05] sm:text-7xl">המשמרת הבאה שלכם מחכה.</h2>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link href="/register" className="btn btn-lg group bg-sun text-ink hover:bg-surface">
              מצטרפים לצוות
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" aria-hidden="true" />
            </Link>
            <Link href="/login" className="btn btn-lg underline-offset-8 hover:underline">
              כניסה למערכת
            </Link>
          </div>
          <p className="mt-20 text-sm text-surface/60">© {new Date().getFullYear()} everyJob · אנשים טובים 770</p>
        </div>
      </section>
    </main>
  );
}

/** The logo, rebuilt in motion: three hands travel in from three sides and meet inside the dotted ring. */
function Huddle() {
  const cuffs = [
    { angle: 0, color: "bg-sky" },
    { angle: 120, color: "bg-sun" },
    { angle: 240, color: "bg-pink" },
  ];
  return (
    <motion.div
      initial="apart"
      whileInView="together"
      viewport={{ once: true, amount: 0.6 }}
      transition={{ staggerChildren: 0.15, delayChildren: 0.15 }}
      className="relative h-44 w-44"
      aria-hidden="true"
    >
      <div className="absolute inset-0 animate-spin-slow rounded-full border-[3px] border-dotted border-surface/30" />
      {cuffs.map((cuff) => (
        <div key={cuff.angle} className="absolute inset-0" style={{ transform: `rotate(${cuff.angle}deg)` }}>
          <motion.div
            variants={{
              apart: { y: -150, opacity: 0 },
              together: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 90, damping: 12 } },
            }}
            className="absolute start-1/2 top-3 -ms-6 flex h-[4.5rem] w-12 flex-col items-center rounded-2xl bg-peach"
          >
            <span className={`flex h-6 w-14 items-center justify-center rounded-lg ${cuff.color}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-ink/70" />
            </span>
          </motion.div>
        </div>
      ))}
    </motion.div>
  );
}
