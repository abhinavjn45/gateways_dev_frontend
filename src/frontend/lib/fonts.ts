import { Press_Start_2P, VT323 } from "next/font/google";

/**
 * Two pixel fonts, deliberately split by role.
 *
 * next/font/google downloads these at BUILD time and self-hosts the woff2 from
 * our own origin — there is no runtime request to Google's CDN, and no
 * render-blocking external stylesheet.
 *
 * Press Start 2P is authentically blocky but very wide and cramped; it is
 * restricted to headings, buttons and short labels. VT323 carries body text:
 * still pixel, but legible in paragraphs. Mixing them is not an aesthetic
 * compromise, it is what keeps the UI readable.
 *
 * VT323 is set LARGE wherever it appears — see the note on `body` in
 * globals.css. It draws about a quarter smaller than its nominal size, so a
 * number that looks generous in the stylesheet is ordinary on the page.
 */
export const pressStart = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-press-start",
});

export const vt323 = VT323({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-vt323",
});

export const fontVariables = `${pressStart.variable} ${vt323.variable}`;
