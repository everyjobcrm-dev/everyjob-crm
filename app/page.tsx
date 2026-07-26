//app/page.tsx
"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion";
import { LayoutGroup } from "motion/react";
import { ArrowLeft, Check, Sparkles, WalletCards } from "lucide-react";
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

const easeOutExpo = [0.16, 1, 0.3, 1] as const;

const headlineLine = {
  hidden: { opacity: 0, y: 26, filter: "blur(10px)" },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.85, delay: 0.15 + i * 0.14, ease: easeOutExpo },
  }),
};

/** A button whose label nudges toward the cursor and whose fill blooms a
 *  soft gold-edge glow on hover — a "physical" response, not a color swap. */
function MagneticCTA({
  children,
  href,
  variant = "solid",
}: {
  children: React.ReactNode;
  href: string;
  variant?: "solid" | "outline";
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 18, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 200, damping: 18, mass: 0.4 });

  const handleMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left - rect.width / 2) * 0.28);
    y.set((e.clientY - rect.top - rect.height / 2) * 0.28);
  };
  const handleLeave = () => {
    x.set(0);
    y.set(0);
  };

  const base =
    variant === "solid"
      ? "bg-obsidian text-cream shadow-[0_0_0_0_rgba(201,161,91,0)]"
      : "border border-obsidian/20 text-obsidian/75 hover:border-obsidian/40 hover:text-obsidian";

  return (
    <motion.a
      href={href}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      whileHover={
        variant === "solid"
          ? { boxShadow: "0 0 0 6px rgba(201,161,91,0.22)" }
          : undefined
      }
      transition={{ duration: 0.4 }}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-8 py-3 text-sm font-bold transition-colors ${base}`}
    >
      <motion.span style={{ x: sx, y: sy }} className="inline-flex items-center gap-2">
        {children}
      </motion.span>
    </motion.a>
  );
}

/** A pillar icon whose ring draws itself once, on scroll into view —
 *  a restrained substitute for a stroke-animated icon that still reads
 *  as "counting itself in." */
function DrawnIcon({ icon: Icon, delay }: { icon: typeof Check; delay: number }) {
  return (
    <span className="relative inline-flex h-11 w-11 items-center justify-center">
      <svg viewBox="0 0 44 44" className="absolute inset-0 h-11 w-11 -rotate-90">
        <motion.circle
          cx="22"
          cy="22"
          r="19"
          fill="none"
          stroke="var(--color-brass)"
          strokeWidth="1.5"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 0.55 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.9, delay, ease: easeOutExpo }}
        />
      </svg>
      <Icon className="h-4 w-4 text-brass-deep" />
    </span>
  );
}

export default function Home() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  // Photo drifts slower than the surrounding text — a ~15% speed
  // differential is enough to read as parallax without feeling gimmicky.
  const photoY = useTransform(scrollYProgress, [0, 1], [0, 70]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, 20]);

  return (
    <main dir="rtl" className="overflow-x-hidden grain-cream text-obsidian">
      {/* ================= HERO ================= */}
      <section ref={heroRef} className="relative isolate overflow-hidden">
        {/* single, quiet spotlight — no blobs, no gradients competing for attention */}
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(900px circle at 78% 8%, rgba(201,161,91,0.22), transparent 60%)",
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

        <header className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-6 sm:px-8 lg:px-12">
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

        <div id="top" className="relative mx-auto grid w-full max-w-7xl grid-cols-1 gap-10 px-5 pb-28 pt-12 sm:px-8 md:grid-cols-12 md:gap-4 md:pb-48 md:pt-20 lg:px-14">
          <motion.div style={{ y: textY }} className="flex flex-col items-center text-center md:col-span-7 md:items-start md:pt-8 md:text-right">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: easeOutExpo }}
              className="glass-panel-light inline-flex rounded-full px-4 py-1.5"
            >
              <p className="text-[11px] font-semibold uppercase text-brass-deep tracking-luxe">
                everyJob · השמה בעברית, בלי גיליונות
              </p>
            </motion.div>

            <h1 className="mt-8 flex flex-col items-center gap-1 font-display text-[15vw] font-black leading-[1.04] text-obsidian sm:text-7xl md:items-start md:text-8xl lg:text-[6.4rem]">
              <motion.span custom={0} variants={headlineLine} initial="hidden" animate="visible">
                אנשים טובים,
              </motion.span>
              <motion.span custom={1} variants={headlineLine} initial="hidden" animate="visible">
                <LayoutGroup>
                  <TextRotate
                    texts={rotatingPromises}
                    mainClassName="gold-metal-text"
                    staggerFrom="last"
                    staggerDuration={0.02}
                    splitLevelClassName="overflow-hidden pb-1"
                    transition={{ type: "spring", damping: 28, stiffness: 350 }}
                    rotationInterval={2600}
                  />
                </LayoutGroup>
              </motion.span>
            </h1>

            <div className="mt-6 h-px w-24 hairline-gold" aria-hidden />

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.55, ease: easeOutExpo }}
              className="mt-6 max-w-lg text-base leading-8 text-obsidian/60 sm:text-lg"
            >
              EveryJob מאחדת ניהול עובדים, שיבוצים, נוכחות, שכר וטופס 101 — כל
              מה שצריך כדי להפעיל צוות אירועים מנצח, מהראיון ועד למשמרת
              הראשונה.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.7, ease: easeOutExpo }}
              className="mt-9 flex w-full flex-col gap-3 sm:w-auto sm:flex-row"
            >
              <MagneticCTA href="/login" variant="solid">
                התחבר <ArrowLeft className="h-4 w-4" />
              </MagneticCTA>
              <MagneticCTA href="/register" variant="outline">
                הירשם
              </MagneticCTA>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 1 }}
              className="mt-8 text-xs tracking-luxe text-obsidian/40"
            >
              מאות משמרות מאוישות מדי חודש ברחבי הארץ
            </motion.p>
          </motion.div>

          {/* hero visual: cinematic crop, warmer grade, parallax drift */}
          <div className="relative mt-4 flex items-center justify-center md:col-span-5 md:mt-0 md:justify-end">
            <motion.div
              style={{ y: photoY }}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.9, delay: 0.2, ease: easeOutExpo }}
              className="relative h-[480px] w-[320px] sm:h-[560px] sm:w-[380px] md:-mr-6 lg:-mr-10"
            >
              {/* large, soft, offset shadow so the portrait feels lifted off the page */}
              <div
                className="absolute -inset-x-6 bottom-4 -z-10 h-24 rounded-[50%] opacity-40 blur-3xl"
                style={{ background: "radial-gradient(50% 50% at 50% 50%, rgba(20,19,26,0.55), transparent 70%)" }}
              />
              <Image
                src="/images/tamarImage.png"
                alt=""
                fill
                className="object-cover object-top"
                style={{ filter: "grayscale(0.35) sepia(0.16) contrast(1.08) brightness(1.03) saturate(1.05)" }}
              />
              {/* warm vignette to integrate the portrait into the cream field
                  instead of reading as a cut-and-pasted stock photo */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(245,240,230,0) 40%, rgba(245,240,230,0.98) 96%), radial-gradient(120% 90% at 85% 10%, rgba(201,161,91,0.22), transparent 55%)",
                }}
              />
              <div
                className="absolute inset-0 mix-blend-multiply opacity-30"
                style={{ background: "radial-gradient(120% 120% at 50% 0%, transparent 55%, rgba(20,19,26,0.5))" }}
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ================= ABOUT ================= */}
      <section id="about" className="relative scroll-mt-8 border-t border-obsidian/10 px-5 py-24 sm:px-8 lg:px-14 lg:py-36">
        <div className="mx-auto max-w-5xl">
          <p className="text-[11px] font-semibold uppercase text-brass-deep tracking-luxe">Every Job</p>
          <div className="mt-3 h-px w-16 hairline-gold" aria-hidden />
          <h2 className="mt-5 font-display text-5xl font-bold text-obsidian sm:text-6xl">מי אנחנו</h2>
          <p className="mt-8 max-w-2xl text-xl font-medium leading-9 text-obsidian/80">
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
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.6, delay: i * 0.12, ease: easeOutExpo }}
                className={`py-8 sm:py-0 sm:pl-8 ${i > 0 ? "sm:border-r sm:border-obsidian/10" : ""}`}
              >
                <DrawnIcon icon={Icon} delay={i * 0.12 + 0.15} />
                <h3 className="mt-4 font-display text-xl text-obsidian">{title}</h3>
                <p className="mt-2 text-sm leading-7 text-obsidian/55">{description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* dark closing act — one deliberate contrast beat before the page ends */}
      <ClosingCTA />

      <footer className="border-t border-obsidian/10 px-5 py-8 text-center text-xs text-obsidian/40 sm:px-8 lg:px-10">
        © {new Date().getFullYear()} everyJob · אנשים טובים 770
      </footer>
    </main>
  );
}