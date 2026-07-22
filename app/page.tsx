"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowUpLeft, CalendarDays, Check, Clock3, Sparkles, WalletCards } from "lucide-react";
import { useEffect, useState } from "react";

const rotatingWords = ["אנשים טובים 770", "עבודות מזדמנות", "משמרות גמישות", "שכר מתגמל", "צוות מנצח"];

const pillars = [
  { title: "שקיפות", description: "יושר מלא בכל שלב — מהראיון ועד לשכר בפועל.", icon: Check, color: "bg-emerald-50 text-emerald-600" },
  { title: "אמינות", description: "מילה שלנו היא התחייבות — מקפידים על כל הבטחה.", icon: Sparkles, color: "bg-pink-50 text-pink-600" },
  { title: "מקצועיות", description: "ניסיון של שנים והיכרות מעמיקה עם עולם ההשמה.", icon: WalletCards, color: "bg-blue-50 text-blue-600" },
];

export default function Home() {
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setWordIndex((current) => (current + 1) % rotatingWords.length), 2600);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <main dir="rtl" className="overflow-x-hidden bg-white text-slate-950">
      <section className="relative isolate min-h-screen overflow-hidden bg-slate-50">
        <div className="absolute inset-0 -z-20 overflow-hidden" aria-hidden="true">
          <motion.div animate={{ x: ["-8%", "12%", "-8%"], y: ["3%", "-5%", "3%"], rotate: [-8, 4, -8] }} transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }} className="absolute -left-[18%] top-[12%] h-[42%] w-[72%] rounded-[45%] bg-emerald-300/55 blur-3xl will-change-transform" />
          <motion.div animate={{ x: ["8%", "-10%", "8%"], y: ["-6%", "7%", "-6%"], rotate: [9, -5, 9] }} transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }} className="absolute -right-[20%] top-[2%] h-[48%] w-[70%] rounded-[46%] bg-pink-300/45 blur-3xl will-change-transform" />
          <motion.div animate={{ x: ["-4%", "10%", "-4%"], y: ["8%", "-5%", "8%"] }} transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }} className="absolute bottom-[-24%] left-[22%] h-[58%] w-[66%] rounded-[50%] bg-blue-300/45 blur-3xl will-change-transform" />
          <div className="absolute inset-0 bg-white/45 backdrop-blur-[2px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(255,255,255,0.95),transparent_22%),radial-gradient(circle_at_80%_72%,rgba(255,255,255,0.8),transparent_26%)]" />
        </div>

        <header className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          <Link href="#top" className="flex min-h-11 items-center gap-3" aria-label="everyJob - דף הבית">
            <Image src="/images/everyJob-logo.png" alt="everyJob" width={50} height={50} className="h-11 w-11 object-contain" priority />
            <span className="text-lg font-bold tracking-tight text-slate-900">everyJob</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex" aria-label="ניווט ראשי">
            <Link href="#about" className="transition hover:text-slate-950">מי אנחנו</Link>
            <Link href="/login" className="transition hover:text-slate-950">כניסה</Link>
          </nav>
        </header>

        <div id="top" className="relative z-10 mx-auto flex min-h-[calc(100vh-84px)] w-full max-w-7xl flex-col items-center px-5 pb-8 pt-2 sm:px-8 md:justify-center lg:flex-row lg:gap-8 lg:px-10 lg:pb-16">
          <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, ease: "easeOut" }} className="flex w-full max-w-2xl flex-col items-center text-center lg:w-[54%] lg:items-start lg:text-right">
            <div className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/80 bg-white/55 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_5px_rgba(16,185,129,0.12)]" />
              החוויה החדשה של everyJob
            </div>

            <h1 className="mt-7 text-4xl font-black leading-[1.12] tracking-tight text-slate-900 sm:text-5xl md:text-6xl lg:text-7xl">
              <span>EveryJob מביאה לכם </span>
              <span className="relative mt-2 inline-flex min-h-[1.2em] min-w-[9ch] overflow-hidden align-bottom text-blue-600">
                <AnimatePresence initial={false} mode="popLayout">
                  <motion.span key={rotatingWords[wordIndex]} initial={{ x: "110%", opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: "-110%", opacity: 0 }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 whitespace-nowrap rounded-xl bg-blue-100/75 px-2">
                    {rotatingWords[wordIndex]}
                  </motion.span>
                </AnimatePresence>
              </span>
            </h1>

            <motion.h2 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.18 }} className="mt-5 max-w-xl text-2xl font-extrabold leading-tight text-slate-800 sm:text-3xl">
              כל מה שצריך כדי להפעיל צוות אירועים מנצח
            </motion.h2>
            <p className="mt-5 max-w-[700px] text-base leading-8 text-slate-600 sm:text-lg">
              EveryJob מאחדת ניהול עובדים, שיבוצים, נוכחות, שכר וטופס 101 — בעברית, בנייד, ובלי גיליונות. בשבילך, בשביל הצוות, ובשביל המשמרת הבאה.
            </p>

            <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Link href="/login" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-7 py-3 text-base font-bold text-white shadow-[0_14px_32px_rgba(15,23,42,0.2)] transition duration-300 hover:-translate-y-1 hover:bg-blue-700 hover:shadow-[0_18px_38px_rgba(37,99,235,0.28)]">התחבר <ArrowLeft className="h-4 w-4" /></Link>
              <Link href="/register" className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-300/80 bg-white/65 px-7 py-3 text-base font-bold text-slate-800 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-blue-300 hover:text-blue-700 hover:shadow-lg">הירשם</Link>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.94, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.12, ease: "easeOut" }} className="relative mt-8 flex min-h-[310px] w-full max-w-lg items-end justify-center sm:min-h-[390px] lg:mt-0 lg:w-[46%]">
            <div className="absolute bottom-5 h-40 w-72 rounded-full bg-blue-400/25 blur-3xl sm:h-52 sm:w-96" />
            <Image src="/images/tamarImage2.png" alt="נציגת everyJob" width={620} height={760} priority className="relative z-10 h-[300px] w-auto max-w-full object-contain object-bottom drop-shadow-[0_26px_28px_rgba(15,23,42,0.16)] sm:h-[390px]" />
            <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }} className="absolute bottom-20 left-0 z-20 w-[min(300px,72vw)] rounded-3xl border border-white/80 bg-white/70 p-4 text-right shadow-[0_22px_55px_rgba(15,23,42,0.15)] backdrop-blur-xl sm:bottom-28 sm:left-1 sm:w-80">
              <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-slate-500">משמרת קרובה</p><h3 className="mt-1 text-base font-bold text-slate-900">חוות רונית</h3></div><div className="rounded-xl bg-emerald-100 p-2 text-emerald-600"><CalendarDays className="h-4 w-4" /></div></div>
              <p className="mt-3 text-sm font-medium text-slate-700">מלצר/ית אולם אירועים</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500"><span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1"><Clock3 className="h-3.5 w-3.5" /> יום חמישי, 18:00 - 02:00</span></div>
              <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3"><span className="text-xs text-slate-500">תשלום</span><span className="text-sm font-extrabold text-emerald-600">₪50 לשעה + טיפים</span></div>
            </motion.div>
            <ArrowUpLeft className="absolute bottom-8 right-1 z-20 h-8 w-8 rotate-[-22deg] text-blue-500 sm:bottom-16 sm:right-4" />
          </motion.div>
        </div>
      </section>

      <section id="about" className="scroll-mt-8 bg-white px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-bold tracking-[0.24em] text-emerald-600">EVERY JOB</p>
            <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">מי אנחנו</h2>
            <p className="mt-5 text-xl font-semibold leading-9 text-slate-700">חברת כוח אדם והשמה שנולדה מתוך הרצון לתת מענה אמיתי למציאת עבודה בתנאים נוחים, עם שכר מתגמל ויחס אישי וחם.</p>
            <p className="mt-6 text-base leading-8 text-slate-600">EVERY JOB היא חברת כוח אדם והשמה, שנולדה מתוך הרצון לתת מענה אמיתי למציאת עבודה בתנאים נוחים, עם שכר מתגמל, יחס אישי וחם – ובהתאם לזמינות ולנוחות שלכם. ב־EVERY JOB אנחנו מאמינים שעבודה טובה היא הרבה יותר ממשרה – היא הזדמנות לצמיחה, להגשמה עצמית, לביטחון ולבניית עתיד טוב יותר. בכל יום אנו מחברים בין אנשים שמחפשים להתקדם ולהתפתח, לבין עסקים הזקוקים לכוח אדם איכותי, מקצועי, אמין ומותאם במדויק לצרכים שלהם – תוך התמקדות ברווחת העובד ובהגשמת שאיפותיו. הצוות שלנו חי ונושם את תחום הגיוס וההשמה, עם ניסיון של שנים והיכרות מעמיקה עם האתגרים, הרצונות והצרכים של שני הצדדים – העובדים ובעלי העסקים. אנחנו לא מסתפקים בלמצוא עבודה – אלא יוצרים שותפויות ארוכות טווח, מלווים ומכוונים כדי שכל השמה תהפוך לסיפור הצלחה אמיתי. ערכים אלו מתבטאים בליווי אישי, הכוונה ותמיכה – משלב הראיון ועד ההצלחה בתפקיד; במתן פתרונות חכמים לעסקים; ובמיון קפדני והתאמה אישית של העובד לארגון. אז בין אם אתה מחפש עבודה או עובד חדש – אנחנו כאן כדי לדאוג שזו תהיה ההתאמה המושלמת.</p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3">
            {pillars.map(({ title, description, icon: Icon, color }) => (
              <motion.article key={title} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.5 }} className="rounded-3xl border border-slate-200 bg-slate-50/75 p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-xl">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${color}`}><Icon className="h-5 w-5" /></div>
                <h3 className="mt-5 text-xl font-bold text-slate-900">{title}</h3>
                <p className="mt-2 leading-7 text-slate-600">{description}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
