/* eslint-disable @typescript-eslint/no-explicit-any */
import Papa from "papaparse";

export type EventTrack = "technical" | "non-technical";

export const EVENT_TRACKS: { id: EventTrack; label: string }[] = [
  { id: "technical", label: "Technical" },
  { id: "non-technical", label: "Non-Technical" },
];

export interface FestEvent {
  slug: string;
  name: string;
  kind: string;
  track: EventTrack;
  description: string;
  participation: string;
  minTeamSize: number | null;
  maxTeamSize: number | null;
  date: string;
  venue: string;
  timeFrom: string;
  timeTo: string;
  prizes: string;
  prizePool: string;
  maxSlots: string | null;
  rulesUrl?: string;
  whatsappLink?: string;
  registrationDeadline?: string;
  prize1?: string;
  prize2?: string;
  prize3?: string;
}

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

export async function fetchFestEvents(): Promise<FestEvent[]> {
  const url = `https://docs.google.com/spreadsheets/d/e/2PACX-1vTVdl4RgUOu2FZ5ku6FW9pqARwbORf5pUZIySfgjq5d-VD9AQR48D4U7K9oHi9hjjfZlxst2LcOQTIS/pub?output=csv&t=${Date.now()}`;
  
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch events: ${response.statusText}`);
  }
  
  const csvText = await response.text();
  
  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const events: FestEvent[] = results.data
          .filter((row: any) => row["Name of Event"] && row["Name of Event"].trim() !== "")
          .map((row: any) => {
            const trackStr = (row["Category"] || "").toLowerCase();
            const track: EventTrack = trackStr.includes("non") ? "non-technical" : "technical";
            
            return {
              slug: slugify(row["Name of Event"]),
              name: row["Name of Event"] || "",
              kind: row["Event"] || "",
              track,
              description: row["Event Description"] || "",
              participation: row["Participation Type"] || "",
              minTeamSize: row["Min Team Size"] ? parseInt(row["Min Team Size"], 10) : null,
              maxTeamSize: row["Max Team Size"] ? parseInt(row["Max Team Size"], 10) : null,
              date: row["Date"] || "",
              venue: row["Venue"] || "",
              timeFrom: row["Time From"] || "TBA",
              timeTo: row["Time To"] || "TBA",
              prizes: row["Prizes"] || "",
              prizePool: row["Prize Pool"] || "",
              maxSlots: row["Maximum Slots"] || null,
              rulesUrl: row["Rules & Regulations"] || undefined,
              whatsappLink: row["WhatsApp Group Link"] || undefined,
              registrationDeadline: row["Registration Deadline"] || undefined,
              prize1: row["1st Prize"] || undefined,
              prize2: row["2nd Prize"] || undefined,
              prize3: row["3rd Prize"] || undefined,
            };
          });
        resolve(events);
      },
      error: (error: any) => reject(error)
    });
  });
}

/** The events on one side of the line-up, in sheet order. */
export function eventsForTrack(events: FestEvent[], track: EventTrack): FestEvent[] {
  return events.filter((e) => e.track === track);
}

/** The time window as one readable string. */
export function eventTime(event: FestEvent): string {
  const { timeFrom, timeTo } = event;
  if (!timeFrom && !timeTo) return "TBA";
  if (!timeTo || timeFrom === timeTo) return timeFrom || timeTo;
  return `${timeFrom} – ${timeTo}`;
}

export interface ScheduleDay {
  date: string;
  label: string;
  events: FestEvent[];
}

/** The line-up grouped into days, in sheet order. */
export function eventSchedule(events: FestEvent[]): ScheduleDay[] {
  const days = new Map<string, FestEvent[]>();
  for (const event of events) {
    const list = days.get(event.date);
    if (list) list.push(event);
    else days.set(event.date, [event]);
  }

  return [...days.entries()].map(([date, dayEvents]) => ({
    date,
    label: date.replace(/,?\s*20\d{2}\s*$/, ""),
    events: dayEvents,
  }));
}

/** An event's time for the schedule, or the notice that there isn't one yet. */
export function eventTimeOrTba(event: FestEvent): string {
  const time = eventTime(event);
  return /^tba$/i.test(time) ? "To be announced" : time;
}

export interface EventResult {
  slug: string;
  name: string;
  kind: string;
  firstPosition?: string;
  secondPosition?: string;
  thirdPosition?: string;
}

export async function fetchFestResults(): Promise<EventResult[]> {
  const url = `https://docs.google.com/spreadsheets/d/e/2PACX-1vTVdl4RgUOu2FZ5ku6FW9pqARwbORf5pUZIySfgjq5d-VD9AQR48D4U7K9oHi9hjjfZlxst2LcOQTIS/pub?output=csv&single=true&gid=127695123&t=${Date.now()}`;
  
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch results: ${response.statusText}`);
  }
  
  const csvText = await response.text();
  
  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const announcedResults: EventResult[] = results.data
          .filter((row: any) => row["Status"] && row["Status"].trim().toLowerCase() === "announced")
          .map((row: any) => ({
            slug: slugify(row["Name of Event"] || row["Event"]),
            name: row["Name of Event"] || "",
            kind: row["Event"] || "",
            firstPosition: row["1st Position"] || undefined,
            secondPosition: row["2nd Position"] || undefined,
            thirdPosition: row["3rd Position"] || undefined,
          }));
        resolve(announcedResults);
      },
      error: (error: any) => reject(error)
    });
  });
}
