"use client";

import { useCalendarEvents, useClasses, useCreateCalendarEvent, useDeleteCalendarEvent } from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import type { CalendarEvent, CalendarEventCategory } from "@skolara/types";
import { Button, Card, CardTitle, EmptyState, Input, Select, Textarea, cn } from "@skolara/ui";
import { useState, type FormEvent } from "react";
import { Field, ListState, PageTitle, SidePanel } from "@/components/ui-kit";
import { intlLocale } from "@/lib/intl";
import { classLabel } from "../home-helpers";

const CATEGORIES: CalendarEventCategory[] = ["HOLIDAY", "EXAM", "MEETING", "ACTIVITY", "TERM_START", "TERM_END", "OTHER"];

/** One colour per kind of day, used on the grid, the key and the list. */
const COLOUR: Record<CalendarEventCategory, string> = {
  HOLIDAY: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100",
  EXAM: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100",
  MEETING: "bg-violet-100 text-violet-900 dark:bg-violet-900/40 dark:text-violet-100",
  ACTIVITY: "bg-accent-100 text-amber-950 dark:bg-amber-900/40 dark:text-amber-100",
  TERM_START: "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100",
  TERM_END: "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100",
  OTHER: "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100",
};

const pad = (n: number) => String(n).padStart(2, "0");
const keyOf = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

/** The calendar day an event falls on. All-day events are stored as UTC midnight. */
function dayKey(date: Date, allDay: boolean): string {
  return allDay
    ? date.toISOString().slice(0, 10)
    : keyOf(date.getFullYear(), date.getMonth(), date.getDate());
}

function eventsOn(events: CalendarEvent[], key: string): CalendarEvent[] {
  return events.filter((event) => {
    const from = dayKey(new Date(event.startsAt), event.allDay);
    const to = dayKey(new Date(event.endsAt), event.allDay);
    return from <= key && key <= to;
  });
}

/**
 * The school year at a glance: holidays, exams and events on a month grid,
 * and what is coming up next beside it. Families see the same calendar in
 * the app; class events only reach that class.
 */
export default function CalendarPage() {
  const { t, locale } = useTranslation();
  const today = new Date();
  const [month, setMonth] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const first = new Date(month.y, month.m, 1);
  const daysInMonth = new Date(month.y, month.m + 1, 0).getDate();
  // Monday-first, as Pakistani school calendars are printed.
  const lead = (first.getDay() + 6) % 7;
  const from = new Date(month.y, month.m, 1 - lead).toISOString();
  const to = new Date(month.y, month.m + 1, 7).toISOString();
  const events = useCalendarEvents(from, to);
  const upcoming = useCalendarEvents(new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString());
  const classes = useClasses();
  const remove = useDeleteCalendarEvent();
  const [adding, setAdding] = useState<string | null>(null);
  const [open, setOpen] = useState<CalendarEvent | null>(null);

  const tag = intlLocale(locale);
  const monthName = new Intl.DateTimeFormat(tag, { month: "long", year: "numeric" }).format(first);
  const weekday = new Intl.DateTimeFormat(tag, { weekday: "short" });
  const formatDay = new Intl.DateTimeFormat(tag, { weekday: "short", day: "numeric", month: "short" });
  const todayKey = keyOf(today.getFullYear(), today.getMonth(), today.getDate());
  const classNames = new Map((classes.data ?? []).map((c) => [c.id, classLabel(c.name, c.section ?? null)]));
  const cells = Array.from({ length: Math.ceil((lead + daysInMonth) / 7) * 7 }, (_, i) => {
    const date = new Date(month.y, month.m, i - lead + 1);
    return { date, key: keyOf(date.getFullYear(), date.getMonth(), date.getDate()), inMonth: date.getMonth() === month.m };
  });
  const shift = (by: number) => setMonth(({ y, m }) => ({ y: m + by < 0 ? y - 1 : m + by > 11 ? y + 1 : y, m: (m + by + 12) % 12 }));
  const when = (event: CalendarEvent) => {
    const start = new Date(event.startsAt);
    const end = new Date(event.endsAt);
    const same = dayKey(start, event.allDay) === dayKey(end, event.allDay);
    const time = new Intl.DateTimeFormat(tag, { hour: "numeric", minute: "2-digit" });
    if (event.allDay) return same ? formatDay.format(start) : `${formatDay.format(start)} – ${formatDay.format(end)}`;
    return same ? `${formatDay.format(start)}, ${time.format(start)} – ${time.format(end)}` : `${formatDay.format(start)} – ${formatDay.format(end)}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title={t("calendar.title")}
        subtitle={t("calendar.description")}
        action={<Button onClick={() => setAdding(todayKey)}>{t("calendar.add")}</Button>}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <Card className="p-0">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3 dark:border-slate-800">
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-50" aria-live="polite">{monthName}</h2>
            <div className="flex items-center gap-1">
              <Button variant="ghost" aria-label={t("calendar.previousMonth")} onClick={() => shift(-1)}>
                <span aria-hidden className="rtl:rotate-180">‹</span>
              </Button>
              <Button variant="secondary" onClick={() => setMonth({ y: today.getFullYear(), m: today.getMonth() })}>{t("calendar.today")}</Button>
              <Button variant="ghost" aria-label={t("calendar.nextMonth")} onClick={() => shift(1)}>
                <span aria-hidden className="rtl:rotate-180">›</span>
              </Button>
            </div>
          </div>
          {events.isError ? (
            <ListState isError isLoading={false} onRetry={() => void events.refetch()} errorText={t("calendar.loadError")} />
          ) : (
            <div className="overflow-x-auto">
              <div role="grid" aria-label={monthName} className="grid min-w-[640px] grid-cols-7">
                {cells.slice(0, 7).map((cell) => (
                  <div key={`h-${cell.key}`} role="columnheader" className="border-b border-slate-200 px-2 py-2 text-xs font-bold uppercase text-slate-600 dark:border-slate-800 dark:text-slate-400">
                    {weekday.format(cell.date)}
                  </div>
                ))}
                {cells.map((cell) => {
                  const dayEvents = eventsOn(events.data ?? [], cell.key);
                  return (
                    <div
                      key={cell.key}
                      role="gridcell"
                      className={cn(
                        "group relative min-h-[6.5rem] border-b border-e border-slate-100 p-1.5 dark:border-slate-800",
                        !cell.inMonth && "bg-slate-50/70 dark:bg-slate-900/40",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-full text-sm tabular-nums",
                            cell.key === todayKey ? "bg-brand-700 font-extrabold text-white" : cell.inMonth ? "font-bold text-slate-800 dark:text-slate-200" : "text-slate-400",
                          )}
                        >
                          {cell.date.getDate()}
                        </span>
                        <button
                          type="button"
                          onClick={() => setAdding(cell.key)}
                          aria-label={t("calendar.addOn", { date: formatDay.format(cell.date) })}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 opacity-0 transition hover:bg-slate-100 focus-visible:opacity-100 group-hover:opacity-100 dark:hover:bg-slate-800"
                        >
                          +
                        </button>
                      </div>
                      <ul className="mt-1 flex flex-col gap-1">
                        {dayEvents.slice(0, 3).map((event) => (
                          <li key={event.id}>
                            <button
                              type="button"
                              onClick={() => setOpen(event)}
                              className={cn("w-full truncate rounded-md px-1.5 py-0.5 text-start text-xs font-bold", COLOUR[event.category])}
                            >
                              {event.title}
                            </button>
                          </li>
                        ))}
                        {dayEvents.length > 3 && <li className="px-1.5 text-xs font-bold text-slate-600 dark:text-slate-400">{t("calendar.more", { count: dayEvents.length - 3 })}</li>}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <ul className="flex flex-wrap gap-3 px-5 py-3" aria-label={t("calendar.key")}>
            {CATEGORIES.filter((c) => c !== "TERM_END").map((category) => (
              <li key={category} className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                <span aria-hidden className={cn("h-3 w-3 rounded", COLOUR[category])} />
                {category === "TERM_START" ? t("calendar.termDates") : t(`eventCategory.${category}`)}
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardTitle>{t("calendar.upcoming")}</CardTitle>
          {upcoming.isLoading ? (
            <ListState isError={false} isLoading onRetry={() => undefined} errorText="" rows={3} />
          ) : (upcoming.data ?? []).length === 0 ? (
            <EmptyState title={t("calendar.nothingOnCalendar")} description={t("calendar.nothingBody")} />
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {(upcoming.data ?? []).slice(0, 8).map((event) => (
                <li key={event.id}>
                  <button type="button" onClick={() => setOpen(event)} className="flex w-full items-start gap-3 rounded-xl p-1 text-start hover:bg-slate-50 dark:hover:bg-slate-800/60">
                    <span aria-hidden className={cn("mt-1 h-8 w-1.5 shrink-0 rounded-full", COLOUR[event.category])} />
                    <span className="min-w-0">
                      <span className="block truncate font-bold text-slate-900 dark:text-slate-50">{event.title}</span>
                      <span className="block text-sm text-slate-600 dark:text-slate-400">
                        {when(event)} · {event.classId ? classNames.get(event.classId) ?? "" : t("calendar.wholeSchool")}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <SidePanel open={adding !== null} title={t("calendar.addEvent")} onClose={() => setAdding(null)}>
        {adding && <EventForm initialDate={adding} onDone={() => setAdding(null)} />}
      </SidePanel>

      <SidePanel open={open !== null} title={open?.title ?? ""} onClose={() => setOpen(null)}>
        {open && (
          <div className="flex flex-col gap-4">
            <span className={cn("w-fit rounded-full px-3 py-1 text-xs font-bold", COLOUR[open.category])}>{t(`eventCategory.${open.category}`)}</span>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="font-bold text-slate-600 dark:text-slate-400">{t("calendar.when")}</dt>
              <dd className="text-slate-900 dark:text-slate-50">{when(open)}</dd>
              <dt className="font-bold text-slate-600 dark:text-slate-400">{t("calendar.who")}</dt>
              <dd className="text-slate-900 dark:text-slate-50">{open.classId ? classNames.get(open.classId) ?? "" : t("calendar.wholeSchool")}</dd>
            </dl>
            {open.description && <p className="whitespace-pre-line text-sm text-slate-700 dark:text-slate-300">{open.description}</p>}
            <div>
              <Button
                variant="secondary"
                disabled={remove.isPending}
                onClick={() => remove.mutate(open.id, { onSuccess: () => setOpen(null) })}
              >
                {t("calendar.removeThis")}
              </Button>
            </div>
          </div>
        )}
      </SidePanel>
    </div>
  );
}

function EventForm({ initialDate, onDone }: { initialDate: string; onDone: () => void }) {
  const { t } = useTranslation();
  const classes = useClasses();
  const create = useCreateCalendarEvent();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<CalendarEventCategory>("HOLIDAY");
  const [classId, setClassId] = useState("");
  const [startDate, setStartDate] = useState(initialDate);
  const [endDate, setEndDate] = useState(initialDate);
  const [allDay, setAllDay] = useState(true);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit(event: FormEvent) {
    event.preventDefault();
    const found: Record<string, string> = {};
    if (!title.trim()) found.title = t("calendar.titleRequired");
    const startsAt = allDay ? new Date(`${startDate}T00:00:00Z`) : new Date(`${startDate}T${startTime}`);
    const endsAt = allDay ? new Date(`${endDate || startDate}T00:00:00Z`) : new Date(`${endDate || startDate}T${endTime}`);
    if (!startDate || Number.isNaN(startsAt.getTime())) found.start = t("calendar.dateRequired");
    else if (Number.isNaN(endsAt.getTime()) || endsAt < startsAt) found.end = t("calendar.endAfterStart");
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    create.mutate(
      { title: title.trim(), category, classId: classId || undefined, startsAt, endsAt, allDay, description: description.trim() || undefined },
      { onSuccess: onDone, onError: (e) => setErrors({ form: e instanceof Error ? e.message : t("calendar.couldNotSave") }) },
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Field label={t("calendar.eventTitle")} error={errors.title}>
        {(props) => <Input {...props} maxLength={140} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("calendar.titlePlaceholder")} />}
      </Field>
      <fieldset>
        <legend className="mb-1 block text-sm font-bold text-slate-900 dark:text-slate-50">{t("calendar.kind")}</legend>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <label key={c} className={cn("flex min-h-[2.5rem] cursor-pointer items-center rounded-xl border px-3 text-sm font-bold focus-within:outline focus-within:outline-2 focus-within:outline-brand-700", category === c ? "border-brand-700 bg-brand-50 text-brand-800 dark:bg-brand-900/40 dark:text-brand-100" : "border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300")}>
              <input type="radio" name="category" className="sr-only" checked={category === c} onChange={() => setCategory(c)} />
              {t(`eventCategory.${c}`)}
            </label>
          ))}
        </div>
      </fieldset>
      <Field label={t("calendar.who")}>
        {(props) => (
          <Select {...props} value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">{t("calendar.wholeSchool")}</option>
            {(classes.data ?? []).map((c) => <option key={c.id} value={c.id}>{classLabel(c.name, c.section ?? null)}</option>)}
          </Select>
        )}
      </Field>
      <label className="flex min-h-[2.75rem] items-center gap-3 text-sm font-bold text-slate-900 dark:text-slate-50">
        <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="h-5 w-5 accent-brand-700" />
        {t("calendar.allDay")}
      </label>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("calendar.starts")} error={errors.start}>
          {(props) => <Input {...props} type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); if (endDate < e.target.value) setEndDate(e.target.value); }} />}
        </Field>
        <Field label={t("calendar.ends")} error={errors.end}>
          {(props) => <Input {...props} type="date" min={startDate} value={endDate} onChange={(e) => setEndDate(e.target.value)} />}
        </Field>
        {!allDay && (
          <>
            <Field label={t("calendar.startTime")}>{(props) => <Input {...props} type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />}</Field>
            <Field label={t("calendar.endTime")}>{(props) => <Input {...props} type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />}</Field>
          </>
        )}
      </div>
      <Field label={t("calendar.details")} optional>
        {(props) => <Textarea {...props} rows={3} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} />}
      </Field>
      {errors.form && <p role="alert" className="text-sm font-bold text-red-700 dark:text-red-400">{errors.form}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={create.isPending}>{create.isPending ? t("calendar.saving") : t("calendar.add")}</Button>
        <Button type="button" variant="ghost" onClick={onDone}>{t("common.cancel")}</Button>
      </div>
    </form>
  );
}
