/**
 * THE SINGLE SOURCE OF TRUTH FOR THE GALLERY LAYOUT.
 *
 * Photos are grouped twice over: by fest edition, and within an edition by
 * CHAPTER — the arc of a fest as it is actually lived, from the inauguration
 * through the events, the candid moments, and out at the valedictory.
 *
 * The chapter grouping is what the gallery renders as one carousel each, so
 * this file decides the page's shape: add a chapter here and a fifth carousel
 * appears; move a moment between chapters and it slides to the other carousel.
 * Nothing in `gallery-screen.tsx` names a chapter or a moment.
 *
 * `edition` is on every moment (not a top-level grouping key alone) so a future
 * year's photos can be appended without a schema change — the screen derives
 * its edition tabs from whatever editions are present, and a chapter that has
 * no photos in the selected edition simply does not render.
 *
 * What is here today is the ARCHIVE of the last fest, not a live feed of this
 * one: Gateways 2026 has not happened, so nothing is captioned as forthcoming
 * and no chapter holds a stand-in tile waiting to be filled. When 2026 is shot,
 * append those moments with `edition: FEST.edition` and the edition tabs appear
 * on their own.
 */

/**
 * The most recent fest that actually happened — the one these photos are of.
 *
 * Not derived from `FEST.edition` (that names the UPCOMING fest, Gateways
 * 2026), and deliberately a plain string rather than arithmetic on it: a fest
 * that skips a year would make `edition - 1` quietly wrong.
 */
const PREVIOUS_EDITION = "Gateways 2025";

/**
 * Gallery photographs are served from Cloudinary rather than committed to
 * `public/art/`, for the same reasons as the faculty portraits in `team.ts` —
 * except these are 6MB camera originals, so shipping them in the repo is not
 * on the table at all.
 *
 * `f_auto,q_auto,w_1200,c_limit` is not optional decoration:
 *
 *   - `f_auto` is what makes the HEIC originals VISIBLE. Several of these came
 *     off an iPhone as `.heic`, which only Safari renders — Chrome, Firefox and
 *     Edge fail the load outright and the tile falls back to its placeholder.
 *     With `f_auto` Cloudinary transcodes to WebP for anything that asks.
 *   - `w_1200,c_limit` caps the delivered width. The tile is never wider than
 *     about 600px, and the untransformed originals run 2.5–6MB EACH: one
 *     carousel would ship more bytes than the rest of the site put together.
 *     Capped, they land around 90–180KB. `c_limit` only ever shrinks, so a
 *     smaller original is passed through untouched rather than upscaled.
 */
const CLOUDINARY_GALLERY = "https://res.cloudinary.com/dchqvsa57/image/upload";

/** Builds a delivery URL from an asset's `<version>/<public-id>` tail. */
function photo(asset: string): string {
  return `${CLOUDINARY_GALLERY}/f_auto,q_auto,w_1200,c_limit/${asset}`;
}

export interface GalleryMoment {
  /**
   * What this specific frame shows, when anyone can say so honestly.
   *
   * Optional, and usually absent: an archive hands over `IMG_9078.jpg`, not a
   * caption, and inventing one ("Lighting the Lamp") states as fact something
   * nobody checked against the photo. With no title the tile shows no caption
   * bar and the chapter supplies the alt text — the carousel is already
   * labelled, so the frame loses nothing.
   */
  title?: string;
  edition: string;
  /** Delivery URL for the photo. Absent renders the camera placeholder. */
  image?: string;
  /** Alt text. Falls back to `title`, then to the chapter's title. */
  alt?: string;
}

export interface GalleryChapter {
  /** Stable key — used for React keys and the carousel's ARIA ids. */
  id: string;
  /** Caption under the carousel. */
  title: string;
  /** One line of context, shown beneath the caption. */
  blurb: string;
  moments: GalleryMoment[];
}

const edition = PREVIOUS_EDITION;

export const GALLERY_CHAPTERS: GalleryChapter[] = [
  {
    id: "inauguration",
    title: "Inauguration & Opening",
    blurb: "The lamp, the address, and the first walk into the realm.",
    moments: [
      { edition, image: photo("v1787334924/IMG_9060_p7p5zx.jpg") },
      { edition, image: photo("v1787334929/IMG_9078_ibkbcy.jpg") },
      { edition, image: photo("v1787334928/IMG_9127_aq96re.jpg") },
      { edition, image: photo("v1787334927/IMG_9045_ho1rsr.jpg") },
      { edition, image: photo("v1787334927/DSC_0205_khvzhk.jpg") },
    ],
  },
  {
    id: "events",
    title: "Events",
    blurb: "Two days of building, quizzing, playing and performing.",
    moments: [
      { edition, image: photo("v1787334924/IMG20250926093123_lwywsm.jpg") },
      { edition, image: photo("v1787334923/IMG_2203_kp4ryy.heic") },
      { edition, image: photo("v1787334923/IMG20250926170629_zsimrc.jpg") },
      { edition, image: photo("v1787334923/IMG_0617_nkbkfg.heic") },
      { edition, image: photo("v1787334923/IMG_0653_zz0urj.heic") },
    ],
  },
  // The remaining two chapters of the arc, kept declared and empty rather than
  // deleted: `chaptersForEdition` drops a chapter with no photos, so neither
  // renders today, and filling either one is an edit to this array alone.
  {
    id: "moments",
    title: "Moments",
    blurb: "The in-between frames — corridors, crews and golden hour.",
    moments: [],
  },
  {
    id: "valedictory",
    title: "Valedictory",
    blurb: "Trophies handed over and the portal closing on the edition.",
    moments: [],
  },
];

/** Every edition present across all chapters, in first-seen order. */
export function galleryEditions(): string[] {
  return [
    ...new Set(GALLERY_CHAPTERS.flatMap((c) => c.moments.map((m) => m.edition))),
  ];
}

/**
 * The chapters as they should render for one edition — each narrowed to that
 * edition's photos, with empty chapters dropped so a year the fest ran no
 * culturals does not leave a dead carousel on the page.
 */
export function chaptersForEdition(edition: string): GalleryChapter[] {
  return GALLERY_CHAPTERS.map((chapter) => ({
    ...chapter,
    moments: chapter.moments.filter((m) => m.edition === edition),
  })).filter((chapter) => chapter.moments.length > 0);
}
