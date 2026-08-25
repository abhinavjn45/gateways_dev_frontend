/**
 * THE SINGLE SOURCE OF TRUTH FOR THE TEAM ROSTER.
 *
 * The /about page renders these lists directly — no component hardcodes a
 * name or title, matching the rule `fest.ts` already sets for every other fest
 * fact. Add or update a person here and every card updates with them.
 *
 * The three STUDENT lists below (core committee, committee heads, technical
 * committee — 82 people) are transcribed from the organising committee's
 * official roster sheet, "Our Team Gateways 2026". Anyone not on that sheet is
 * not on this page; when the sheet is reissued, regenerate these three arrays
 * from it rather than editing names by hand.
 *
 * Only the four fields the roster is published with are carried here: name,
 * register number, class, and role. The sheet also holds personal email
 * addresses and phone numbers for every student — those are deliberately NOT
 * in this file, because everything in it is rendered on a public page.
 *
 * The ADVISORY and FACULTY lists are maintained separately and by hand; they
 * are not part of that sheet.
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

/**
 * `blurb` is the member's portfolio — the committees they oversee. It is the
 * one piece of per-person information the roster carries that neither the
 * section heading nor the subtitle already says, so it earns the third line on
 * the card.
 */
export const CORE_COMMITTEE: TeamMember[] = [
  { name: "Shambhavi Sinha", subtitle: "4 MCA A (2547151)", blurb: "Decorations, Marketing & PR, Documentation" },
  { name: "Joshua Joby", subtitle: "4 MCA A (2547125)", blurb: "Hospitality, Sponsorship, Culturals, Finance & Accounts" },
  { name: "Aimee Susan Joseph", subtitle: "4 MCA B (2547204)", blurb: "Logistics, Technical, Registrations" },
  { name: "Abhinav Jain", subtitle: "4 MCA B (2547203)", blurb: "Events, Logistics, Infobahn" },
  { name: "Smitha M", subtitle: "4 MSC AIML (2548556)", blurb: "Social Media, Media, Registrations, Finance & Accounts" },
  { name: "Hitesh Kumar", subtitle: "4 MSC AIML (2548525)", blurb: "Design & Graphics, Events, Culturals" },
  { name: "Anooja Sreenivasan", subtitle: "1 MCA A (2647114)", blurb: "Decorations, Marketing & PR, Documentation" },
  { name: "Iwin Jose", subtitle: "1 MCA A (2647126)", blurb: "Logistics, Technical, Registrations" },
  { name: "Haniya Zehra Mody", subtitle: "1 MCA B (2647225)", blurb: "Events, Logistics, Infobahn" },
  { name: "Shiva A Karthik", subtitle: "1 MCA B (2647247)", blurb: "Social Media, Media, Registrations, Finance & Accounts" },
  { name: "Joseph Alicia Elias", subtitle: "1 MSC AIML (2648525)", blurb: "Hospitality, Sponsorship, Culturals, Finance & Accounts" },
  { name: "Ronith Tharun Joshi", subtitle: "1 MSC AIML (2648545)", blurb: "Design & Graphics, Events, Culturals" },
];

export interface CommitteeHead extends TeamMember {
  /** The team this head runs, e.g. "Decorations" — its own line above the name/year. */
  team: string;
}

/**
 * Grouped by team, teams in alphabetical order, and within a team the senior
 * students first — which is the order `CommitteeHeadsSection` renders, since it
 * buckets into a Map and Maps preserve insertion order.
 *
 * The role ("Committee Head") is the section heading and the team is the group
 * heading, so neither is repeated on the cards; they carry the class and
 * register number only.
 */
export const COMMITTEE_HEADS: CommitteeHead[] = [
  { name: "Arden Savio Diago", team: "Culturals", subtitle: "4 MCA A (2547112)" },
  { name: "Akhila Suresh", team: "Culturals", subtitle: "4 MSC AIML (2548507)" },
  { name: "Aadharsh Krishnaa G", team: "Culturals", subtitle: "4 MCA B (2547201)" },
  { name: "Janis Anup", team: "Culturals", subtitle: "1 MCA B (2647230)" },
  { name: "Harinand A", team: "Culturals", subtitle: "1 MCA B (2647228)" },

  { name: "Bhagyasree Roy", team: "Decorations", subtitle: "4 MCA A (2547118)" },
  { name: "Noel Lalichan", team: "Decorations", subtitle: "4 MSC AIML (2548537)" },
  { name: "Aksa Maria Thomas", team: "Decorations", subtitle: "1 MCA A (2647105)" },
  { name: "Dixon Benoy", team: "Decorations", subtitle: "1 MCA B (2647220)" },

  { name: "Praneeth M", team: "Design & Graphics", subtitle: "4 MCA A (2547142)" },
  { name: "Hari Prasad B K", team: "Design & Graphics", subtitle: "4 MCA A (2547120)" },
  { name: "Sarthak Behera", team: "Design & Graphics", subtitle: "1 MCA B (2647245)" },
  { name: "Tanisha Singha", team: "Design & Graphics", subtitle: "1 MSC AIML (2648548)" },

  { name: "Sharon Mathew", team: "Documentation", subtitle: "4 MCA B (2547247)" },
  { name: "Alok Tayal", team: "Documentation", subtitle: "4 MCA B (2547210)" },
  { name: "Palak Kashyap", team: "Documentation", subtitle: "1 MCA A (2647139)" },
  { name: "Priscilla Philby Oommen", team: "Documentation", subtitle: "1 MSC AIML (2648541)" },

  { name: "Sudeepa Santhanam", team: "Events", subtitle: "4 MCA B (2547252)" },
  { name: "Sankhe Athashree Sanjay", team: "Events", subtitle: "4 MSC AIML (2548546)" },
  { name: "Antony Chandy Douglas", team: "Events", subtitle: "1 MSC AIML (2648505)" },
  { name: "Anugrahaa V", team: "Events", subtitle: "1 MSC AIML (2648506)" },
  { name: "Adharsh Mohanan", team: "Events", subtitle: "1 MSC AIML (2648503)" },

  { name: "B K Vishnu", team: "Finance & Accounts", subtitle: "4 MCA B (2547218)" },
  { name: "Adarsh Gupta", team: "Finance & Accounts", subtitle: "4 MCA A (2547106)" },
  { name: "Byrag Paul K B", team: "Finance & Accounts", subtitle: "1 MSC AIML (2648514)" },
  { name: "Deepthi EK", team: "Finance & Accounts", subtitle: "1 MSC AIML (2648519)" },

  { name: "Slaven Derick", team: "Hospitality", subtitle: "4 MCA B (2547249)" },
  { name: "Sneha Varghese", team: "Hospitality", subtitle: "4 MCA B (2547250)" },
  { name: "Keerthan Thomas", team: "Hospitality", subtitle: "1 MCA A (2647133)" },
  { name: "Ann miya", team: "Hospitality", subtitle: "1 MCA B (2647210)" },

  { name: "Neha N", team: "Infobahn", subtitle: "4 MCA A (2547160)" },
  { name: "Nandini Singh", team: "Infobahn", subtitle: "4 MCA A (2547135)" },
  { name: "Shawn Shiju Thomas", team: "Infobahn", subtitle: "1 MSC AIML (2648557)" },
  { name: "Swastik Sahu", team: "Infobahn", subtitle: "1 MCA A (2647155)" },

  { name: "Ananya Santosh Kumar Pillai", team: "Logistics", subtitle: "4 MSC AIML (2548511)" },
  { name: "Vishwas Vashishtha", team: "Logistics", subtitle: "4 MCA B (2547255)" },
  { name: "Marcus Cunnumpuram Thomas", team: "Logistics", subtitle: "1 MSC AIML (2648529)" },
  { name: "Anvi Panwar", team: "Logistics", subtitle: "1 MSC AIML (2648564)" },

  { name: "Bhavya Dhanuka", team: "Marketing & PR", subtitle: "4 MCA B (2547219)" },
  { name: "Anamaya Saraogi", team: "Marketing & PR", subtitle: "4 MCA A (2547109)" },
  { name: "Navin Jomi K", team: "Marketing & PR", subtitle: "1 MCA B (2647239)" },
  { name: "Varshini R B", team: "Marketing & PR", subtitle: "1 MCA B (2647257)" },

  { name: "S Kusum", team: "Media", subtitle: "4 MSC AIML (2548532)" },
  { name: "Kapadia Ram Kalpesh", team: "Media", subtitle: "4 MSC AIML (2548530)" },
  { name: "Amogh Sahore", team: "Media", subtitle: "4 MCA A (2547108)" },
  { name: "Tharun Kumar", team: "Media", subtitle: "1 MCA B (2647255)" },
  { name: "Surabhi Kumari", team: "Media", subtitle: "1 MCA B (2647253)" },
  { name: "Dibam Ranjan Sinha", team: "Media", subtitle: "1 MCA A (2647120)" },

  { name: "Reno Reji Matthew", team: "Registrations", subtitle: "4 MCA A (2547145)" },
  { name: "Aditi Ahuja", team: "Registrations", subtitle: "4 MCA A (2547162)" },
  { name: "Dhanashree Vishwajeet Dhavale", team: "Registrations", subtitle: "1 MCA B (2647219)" },
  { name: "Rohans S Martin", team: "Registrations", subtitle: "1 MCA B (2647244)" },

  { name: "Deon Thomas Binny", team: "Social Media", subtitle: "4 MSC AIML (2548519)" },
  { name: "Evana Joseph", team: "Social Media", subtitle: "4 MCA B (2547225)" },
  { name: "Ishita Minia", team: "Social Media", subtitle: "1 MSC AIML (2648565)" },
  { name: "Susan Matilda H", team: "Social Media", subtitle: "1 MCA B (2647254)" },

  { name: "S Vanshika", team: "Sponsorship", subtitle: "4 MSC AIML (2548544)" },
  { name: "Yash Barjatya", team: "Sponsorship", subtitle: "4 MCA B (2547257)" },
  { name: "Parthiv Sushil", team: "Sponsorship", subtitle: "4 MCA A (2547141)" },
  { name: "Binosh Sibi", team: "Sponsorship", subtitle: "4 MSC AIML (2548515)" },
  { name: "Chethan Raj L", team: "Sponsorship", subtitle: "1 MCA A (2647117)" },
  { name: "Steve S Palakalam", team: "Sponsorship", subtitle: "1 MCA A (2647154)" },
  { name: "Shebin John Bosco", team: "Sponsorship", subtitle: "1 MCA B (2647246)" },
  { name: "Maegan Anna Jimmy", team: "Sponsorship", subtitle: "1 MSC AIML (2648558)" },
];

/**
 * The people who build and run the website and application.
 *
 * On the roster sheet these six are committee heads like any other, filed
 * under "Technical (Website / Application)". They keep a section of their own
 * here because it is the group that carries personal blurbs, and because the
 * page has always credited the builders separately.
 *
 * `subtitle` is the class and register number, not the role — the section
 * heading already says what they do, so repeating it on every card would be
 * noise.
 */
export const TECHNICAL_COMMITTEE: TeamMember[] = [
  { name: "Yanish Rai", subtitle: "4 MCA A (2547158)", blurb: "Crafting portals to new worlds." },
  { name: "Kartik Dewnani", subtitle: "4 MCA A (2547128)", blurb: "Animating the Upside Down." },
  { name: "Vishal B G", subtitle: "1 MCA A (2647158)" },
  { name: "Gerard Nicholas Paul M", subtitle: "1 MCA A (2647122)" },
  { name: "S Anand", subtitle: "1 MCA A (2647145)", blurb: "Code, coffee, and curiosity." },
  { name: "Gokul T A", subtitle: "1 MCA B (2647224)", blurb: "Code, coffee, and curiosity." },
];

