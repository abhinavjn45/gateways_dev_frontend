import Papa from "papaparse";

export interface Announcement {
  id: string;
  targetAudience: string;
  content: string;
  expiryDate: string;
  isExpired: boolean;
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

export function extractEventSlugFromAudience(audience: string): string | null {
  const aud = audience.trim();
  if (aud.toLowerCase() === "everyone" || aud.toLowerCase() === "participants") return null;
  
  // Assumes format "{Event Name} Participants"
  const match = aud.match(/(.+)\s+Participants/i);
  if (match) {
    return slugify(match[1].trim());
  }
  return slugify(aud);
}

export async function fetchAnnouncements(): Promise<Announcement[]> {
  const url = `https://docs.google.com/spreadsheets/d/e/2PACX-1vTVdl4RgUOu2FZ5ku6FW9pqARwbORf5pUZIySfgjq5d-VD9AQR48D4U7K9oHi9hjjfZlxst2LcOQTIS/pub?output=csv&gid=529000825&t=${Date.now()}`;
  
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch announcements: ${response.statusText}`);
  }
  
  const csvText = await response.text();
  
  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const now = new Date();
          now.setHours(0, 0, 0, 0); // Start of today

          const rawData = results.data as any[];
          const announcements: Announcement[] = rawData.map((row: any, index: number) => {
            const expiryStr = row["Announcement Expiry On"];
            let isExpired = false;
            
            if (expiryStr) {
              const [month, day, year] = expiryStr.split('/');
              if (month && day && year) {
                const expiry = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                if (expiry < now) {
                  isExpired = true;
                }
              }
            }

            return {
              id: row["Sr. No."] || String(index),
              targetAudience: row["Announcement For"] || "Everyone",
              content: row["Announcement Content"] || "",
              expiryDate: expiryStr || "",
              isExpired
            };
          });

          // Filter out expired and empty announcements
          const active = announcements.filter(a => !a.isExpired && a.content.trim() !== "");
          resolve(active);
        } catch (e) {
          reject(e);
        }
      },
      error: (error: any) => reject(error),
    });
  });
}
