"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { LayoutGroup } from "motion/react";
import { ArrowLeft, Check, Clock3, MapPin, Sparkles, WalletCards } from "lucide-react";
import { TicketPass } from "@/components/TicketPass";
import { ClosingCTA } from "@/components/ClosingCTA";
import { TextRotate } from "@/components/ui/text-rotate";

const manifest = [
  {
    title: "שקיפות",
    description: "יושר מלא בכל שלב — מהראיון ועד לשכר בפועל.",
    icon: Check,
  },
  {
    title: "אמינות",
    description: "מילה שלנו היא התחייבות — מקפידים על כל הבטחה.",
    icon: Sparkles,
  },
  {
    title: "מקצועיות",
    description: "ניסיון של שנים והיכרות מעמיקה עם עולם ההשמה.",
    icon: WalletCards,
  },
];

// The rotator cycles through what everyJob actually delivers — same claims
// as the "who we are" pillars below, so the motion earns its place instead
// of just decorating the headline.
const rotatingPromises = ["משמרות טובות.", "שכר הוגן.", "צוות מנצח.", "גיוס אמיתי."];

const easeOut = [0.16, 1, 0.3, 1] as const;

export default function Home() {
  return (
    <main dir="rtl" className="overflow-x-hidden bg-cream text-obsidian">
      {/* ================= HERO ================= */}
      <section className="relative isolate overflow-hidden">
        {/* single, quiet spotlight — no blobs, no gradients competing for attention */}
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(900px circle at 78% 8%, rgba(201,161,91,0.20), transparent 60%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(20,19,26,1) 1px, transparent 1px), linear-gradient(90deg, rgba(20,19,26,1) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />

        <header className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-6 sm:px-8 lg:px-10">
          <Link href="#top" className="flex items-center gap-3" aria-label="everyJob - דף הבית">
            <div className="rounded-xl border border-obsidian/10 bg-white p-1.5 shadow-sm">
              <Image src="/images/everyJob-logo.png" alt="everyJob" width={34} height={34} className="h-8 w-8 object-contain" priority />
            </div>
            <span className="font-display text-lg font-semibold tracking-tight text-obsidian">everyJob</span>
          </Link>
          <nav className="flex items-center gap-8 text-sm font-medium text-obsidian/55" aria-label="ניווט ראשי">
            <Link href="#about" className="transition hover:text-obsidian">מי אנחנו</Link>
            <Link href="/login" className="transition hover:text-obsidian">כניסה</Link>
          </nav>
        </header>

        <div id="top" className="relative mx-auto grid w-full max-w-7xl grid-cols-1 gap-10 px-5 pb-28 pt-10 sm:px-8 md:grid-cols-12 md:gap-4 md:pb-40 md:pt-16 lg:px-10">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: easeOut }}
            className="flex flex-col items-center text-center md:col-span-7 md:items-start md:pt-10 md:text-right"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-brass-deep">
              everyJob · אנשים טובים 770
            </p>

            <h1 className="mt-6 flex flex-col items-center gap-2 font-display text-5xl leading-[1.12] text-obsidian sm:text-6xl lg:text-7xl md:items-start">
              <span>אנשים טובים,</span>
              <LayoutGroup>
                <TextRotate
                  texts={rotatingPromises}
                  mainClassName="rounded-2xl bg-brass px-4 py-1 text-obsidian sm:px-5"
                  staggerFrom="last"
                  staggerDuration={0.02}
                  splitLevelClassName="overflow-hidden pb-1"
                  transition={{ type: "spring", damping: 28, stiffness: 350 }}
                  rotationInterval={2600}
                />
              </LayoutGroup>
            </h1>

            <p className="mt-7 max-w-lg text-base leading-8 text-obsidian/60 sm:text-lg">
              EveryJob מאחדת ניהול עובדים, שיבוצים, נוכחות, שכר וטופס 101 — כל
              מה שצריך כדי להפעיל צוות אירועים מנצח, מהראיון ועד למשמרת
              הראשונה.
            </p>

            <div className="mt-9 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Link
                href="/login"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-obsidian px-8 py-3 text-sm font-bold text-cream transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                התחבר <ArrowLeft className="h-4 w-4" />
              </Link>
              <Link
                href="/register"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-obsidian/20 px-8 py-3 text-sm font-bold text-obsidian/75 transition hover:border-obsidian/40 hover:text-obsidian"
              >
                הירשם
              </Link>
            </div>
          </motion.div>

          {/* signature element: a live boarding-pass to a real shift, layered
              over a desaturated portrait rather than sat beside it */}
          <div className="relative mt-4 flex items-center justify-center md:col-span-5 md:mt-0 md:justify-end">
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.9, delay: 0.15, ease: easeOut }}
              className="pointer-events-none absolute -bottom-6 right-4 hidden h-[420px] w-[300px] sm:block md:-bottom-10 md:right-0 md:h-[480px] md:w-[340px]"
            >
              {/* filter is applied to the image itself (not a separate overlay)
                  so it respects the PNG's transparency instead of tinting a
                  solid rectangle behind it */}
              <div className="relative h-full w-full">
                <Image
                  src="/images/tamarImage2.png"
                  alt=""
                  fill
                  className="object-contain object-bottom"
                  style={{ filter: "grayscale(0.4) sepia(0.12) contrast(1.05) brightness(1.02)" }}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background: "linear-gradient(180deg, rgba(245,240,230,0) 45%, rgba(245,240,230,0.98) 97%)",
                  }}
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.35, ease: easeOut }}
              className="relative z-10 w-full max-w-sm md:mt-24"
            >
              <TicketPass
                eyebrow="EveryJob · משמרת פתוחה"
                title="מלצר/ית אולם אירועים"
                subtitle="חוות רונית"
                tilt={-3}
                stub={
                  <>
                    <span className="text-[10px] uppercase tracking-widest text-brass">שכר</span>
                    <span className="font-display text-sm font-bold text-cream">₪50/שעה</span>
                  </>
                }
              >
                <div className="mt-4 flex flex-col gap-2 text-xs text-cream/50">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock3 className="h-3.5 w-3.5" /> יום חמישי, 18:00–02:00
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> ראשון לציון
                  </span>
                </div>
              </TicketPass>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ================= ABOUT ================= */}
      <section id="about" className="relative scroll-mt-8 border-t border-obsidian/10 bg-cream px-5 py-24 sm:px-8 lg:px-10 lg:py-32">
        <div className="mx-auto max-w-5xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-brass-deep">Every Job</p>
          <h2 className="mt-4 font-display text-4xl text-obsidian sm:text-5xl">מי אנחנו</h2>
          <p className="mt-6 max-w-2xl text-xl font-medium leading-9 text-obsidian/80">
            חברת כוח אדם והשמה שנולדה מתוך הרצון לתת מענה אמיתי למציאת עבודה
            בתנאים נוחים, עם שכר מתגמל ויחס אישי וחם.
          </p>
          <p className="mt-6 max-w-2xl text-base leading-8 text-obsidian/55">
            בכל יום אנו מחברים בין אנשים שמחפשים להתקדם ולהתפתח, לבין עסקים
            הזקוקים לכוח אדם איכותי, מקצועי, אמין ומותאם במדויק לצרכים שלהם —
            תוך התמקדות ברווחת העובד ובהגשמת שאיפותיו. הצוות שלנו חי ונושם את
            תחום הגיוס וההשמה, עם ניסיון של שנים והיכרות מעמיקה עם האתגרים,
            הרצונות והצרכים של שני הצדדים. אנחנו לא מסתפקים בלמצוא עבודה —
            אלא יוצרים שותפויות ארוכות טווח, מלווים ומכוונים כדי שכל השמה
            תהפוך לסיפור הצלחה אמיתי.
          </p>

          {/* manifest, not a card grid — a quiet list a reader scans top to bottom */}
          <div className="mt-16 divide-y divide-obsidian/10 border-y border-obsidian/10 sm:divide-y-0 sm:border-none sm:grid sm:grid-cols-3">
            {manifest.map(({ title, description, icon: Icon }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className={`py-8 sm:py-0 sm:pl-8 ${i > 0 ? "sm:border-r sm:border-obsidian/10" : ""}`}
              >
                <Icon className="h-5 w-5 text-brass-deep" />
                <h3 className="mt-4 font-display text-xl text-obsidian">{title}</h3>
                <p className="mt-2 text-sm leading-7 text-obsidian/55">{description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* dark closing act — one deliberate contrast beat before the page ends */}
      <ClosingCTA />

      <footer className="border-t border-obsidian/10 bg-cream px-5 py-8 text-center text-xs text-obsidian/40 sm:px-8 lg:px-10">
        © {new Date().getFullYear()} everyJob · אנשים טובים 770
      </footer>
    </main>
  );
}