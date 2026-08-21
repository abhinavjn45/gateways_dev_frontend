/**
 * THE SINGLE SOURCE OF TRUTH FOR THE TEAM ROSTER.
 *
 * The /about page renders these lists directly — no component hardcodes a
 * name or title, matching the rule `fest.ts` already sets for every other fest
 * fact. Add or update a person here and every card updates with them.
 */

import type { SkinId } from "./assets/manifest";

const SKIN_CYCLE: SkinId[] = ["prospector", "botanist", "sentinel", "voidwalker", "artificer"];

/**
 * Deterministic placeholder avatar, not a random one — the same name always
 * gets the same skin across reloads and renders, without hand-assigning one
 * to each of the ~35 people on this page.
 */
export function skinFor(name: string): SkinId {
  const sum = [...name].reduce((total, ch) => total + ch.charCodeAt(0), 0);
  return SKIN_CYCLE[sum % SKIN_CYCLE.length];
}

export interface TeamMember {
  name: string;
  /** Role, department, or "<year> <programme> <section>" — whatever the group uses. */
  subtitle: string;
  /** Short tagline. Not every group has one. */
  blurb?: string;
  /**
   * URL of a real photograph. Absolute (Cloudinary, see `CLOUDINARY_PHOTOS`)
   * or a public path — the card does not care which.
   *
   * The card falls back to the pixel avatar when the image is missing or fails
   * to load, so an entry with no photo costs nothing and a host that is down
   * degrades to the avatar rather than a broken frame.
   */
  image?: string;
}

/**
 * Faculty portraits are served from Cloudinary rather than committed to
 * `public/art/`: they are the only real photographs on the site, they change
 * independently of a deploy, and keeping ~500KB of JPEGs out of the repo keeps
 * the Vercel build lean. One constant for the delivery prefix so the account
 * can be changed in a single edit; the version segment differs per asset and
 * is part of each URL.
 *
 * `MemberPortrait` in about-screen.tsx falls back to the pixel avatar on a
 * load error, so an unreachable CDN degrades rather than breaks the page.
 */
const CLOUDINARY_PHOTOS = "https://res.cloudinary.com/dchqvsa57/image/upload";

export const ADVISORY_COMMITTEE: TeamMember[] = [
  { name: "Dr. Fr. Jossy P George", subtitle: "Director CS, Statistics & DS", image: `${CLOUDINARY_PHOTOS}/v1787329590/Dr._Jossy_P_George_jpgjmi.jpg`  },
  { name: "Dr. Deepthi Das", subtitle: "Associate Dean", image: `${CLOUDINARY_PHOTOS}/v1787329589/Dr._Deepthi_Das_tfo6tx.jpg` },
  { name: "Dr. Rupali Sunil Wagh", subtitle: "Head of Department", image: `${CLOUDINARY_PHOTOS}/v1787329592/Dr._Rupali_Sunil_Wagh_kcwbxq.jpg` },
  { name: "Dr. Gobi Ramasamy", subtitle: "Associate HOD", image: `${CLOUDINARY_PHOTOS}/v1787329591/Dr._Gobi_R_iko5zq.jpg` },
  { name: "Dr. Cynthia T", subtitle: "PG Program Coordinator", image: `${CLOUDINARY_PHOTOS}/v1787329592/Dr._Cynthia_T_dktteq.jpg` },
];

export const FACULTY_COORDINATORS: TeamMember[] = [
  { name: "Dr. Neha Singhal", subtitle: "Assistant Professor", image: `${CLOUDINARY_PHOTOS}/v1787329591/Dr._Neha_Singal_bmozvl.jpg` },
  { name: "Dr. Shivangi Singh", subtitle: "Assistant Professor", image: `${CLOUDINARY_PHOTOS}/v1787329800/Dr._20Shivangi_20Singh-DpB_cLfZ_cnen3a.jpg` },
  { name: "Dr. Nizar Banu P K", subtitle: "Associate Professor", image: `${CLOUDINARY_PHOTOS}/v1787329591/Dr._Nizar_Banu_P_K_rit7vl.jpg` },
];

export const CORE_COMMITTEE: TeamMember[] = [
  { name: "Smitha M", subtitle: "4 MSC AIML (2548556)" },
  { name: "Shambhavi Sinha", subtitle: "4 MCA A (2547151)" },
  { name: "Aimee Susan Joseph", subtitle: "4 MCA B (2547204)" },
  { name: "Hitesh Kumar", subtitle: "4 MSC AIML (2548525)" },
  { name: "Joshua Joby", subtitle: "4 MCA A (2547125)" },
  { name: "Abhinav Jain", subtitle: "4 MCA B (2547203)" },
  { name: "Joseph Alicia Elias", subtitle: "1 MSC AIML (2648525)" },
  { name: "Anooja Sreenivasan", subtitle: "1 MCA A (2647114)" },
  { name: "Haniya Zehra Mody", subtitle: "1 MCA B (2647225)" },
  { name: "Ronith Tharun Joshi", subtitle: "1 MSC AIML (2648545)" },
  { name: "Iwin Jose", subtitle: "1 MCA A (2647126)" },
  { name: "Shiva A Karthik", subtitle: "1 MCA B (2647247)" },
];

export interface CommitteeHead extends TeamMember {
  /** The team this head runs, e.g. "Decorations" — its own line above the name/year. */
  team: string;
}

export const COMMITTEE_HEADS: CommitteeHead[] = [
  { name: "Annie Neena A A", team: "Audi Management", subtitle: "3 MCA B" },
  { name: "Binosh Sibi", team: "Audi Management", subtitle: "4 MSC AIML (2548515)" },
  { name: "Shreya G", team: "Culturals (Dance)", subtitle: "3 MSC AIML" },
  { name: "Jai Pareek", team: "Culturals (Dance)", subtitle: "3 MCA B" },
  { name: "Aadharsh Krishnaa G", team: "Culturals (Music)", subtitle: "4 MCA B (2547201)" },
  { name: "Omkaar Chakraborty", team: "Culturals (Music)", subtitle: "3 MCA B" },
  { name: "Bhagyashree Roy", team: "Decorations", subtitle: "4 MCA A (2547118)" },
  { name: "Sheethal T Kochery", team: "Decorations", subtitle: "3 MSC AIML" },
  { name: "Kusum S", team: "Designs", subtitle: "4 MSC AIML (2548532)" },
  { name: "Praneeth M", team: "Designs", subtitle: "4 MCA A (2547142)" },
  { name: "Kanika Jain", team: "Documentation", subtitle: "3 MCA A" },
  { name: "Sharon Mathew", team: "Documentation", subtitle: "4 MCA B (2547247)" },
  { name: "JV Baarathi", team: "Events", subtitle: "3 MSC AIML" },
  { name: "Abhinav Jain", team: "Events", subtitle: "4 MCA B (2547203)" },
  { name: "Jariwala Mohit S", team: "Finance", subtitle: "3 MSC AIML" },
  { name: "Nishit Daruwala", team: "Finance", subtitle: "3 MSC AIML" },
  { name: "Ananya Pillai", team: "Hospitality", subtitle: "4 MSC AIML (2548511)" },
  { name: "R Karan", team: "Hospitality", subtitle: "3 MCA B" },
  { name: "Ekta Singh", team: "Infobahn", subtitle: "3 MCA B" },
  { name: "Neha N", team: "Infobahn", subtitle: "4 MCA A (2547160)" },

  { name: "Joshua V. Praveen", team: "Logistics", subtitle: "3 MSC AIML" },
  { name: "Amogh Sahore", team: "Media", subtitle: "4 MCA A (2547108)" },
  { name: "Deon Binny", team: "Media", subtitle: "4 MSC AIML (2548519)" },
];

/**
 * The people who build and run the website and application.
 *
 * `subtitle` is the class and register number, not the role — "Technical
 * (Website / Application)" is what the section itself says, so repeating it on
 * every card would be noise. Vishal B G and Gerard Nicholas Paul M used to
 * carry that role string as a placeholder because no class was on record for
 * them; the official roster supplies both, so every card now reads the same
 * way: "<year> <programme> <section> (<register number>)".
 */
export const TECHNICAL_COMMITTEE: TeamMember[] = [
  { name: "Yanish Rai", subtitle: "4 MCA A (2547158)", blurb: "Crafting portals to new worlds." },
  { name: "Kartik Dewnani", subtitle: "4 MCA A (2547128)", blurb: "Animating the Upside Down." },
  { name: "Darshan Heble", subtitle: "4 MCA A", blurb: "Code, coffee, and curiosity." },
  { name: "Vishal B G", subtitle: "1 MCA A (2647158)" },
  { name: "Gerard Nicholas Paul M", subtitle: "1 MCA A (2647122)" },
  { name: "S Anand", subtitle: "1 MCA A (2647145)", blurb: "Code, coffee, and curiosity." },
  { name: "Gokul T A", subtitle: "1 MCA B (2647224)", blurb: "Code, coffee, and curiosity." },
];

