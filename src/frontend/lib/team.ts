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
const GITHUB_ASSETS = "https://cdn.jsdelivr.net/gh/abhinavjn45/gateways2026-assets@main";

export const ADVISORY_COMMITTEE: TeamMember[] = [
  { name: "Dr. Fr. Jossy P George", subtitle: "Director CS, Statistics & DS", image: `${GITHUB_ASSETS}/our-team/drJossyPGeorge.jpg`  },
  { name: "Dr. Deepthi Das", subtitle: "Associate Dean", image: `${GITHUB_ASSETS}/our-team/drDeepthiDas.jpg` },
  { name: "Dr. Rupali Sunil Wagh", subtitle: "Head of Department", image: `${GITHUB_ASSETS}/our-team/drRupaliSunilWagh.jpg` },
  { name: "Dr. Gobi Ramasamy", subtitle: "Associate HOD", image: `${GITHUB_ASSETS}/our-team/drGobiR.jpg` },
  { name: "Dr. Cynthia T", subtitle: "PG Program Coordinator", image: `${GITHUB_ASSETS}/our-team/drCynthiaT.jpg` },
];

export const FACULTY_COORDINATORS: TeamMember[] = [
  { name: "Dr. Neha Singhal", subtitle: "Assistant Professor", image: `${GITHUB_ASSETS}/our-team/drNehaSinghal.jpg` },
  { name: "Dr. Shivangi Singh", subtitle: "Assistant Professor", image: `${GITHUB_ASSETS}/our-team/drShivangiSingh.jpg` },
  { name: "Dr. Nizar Banu P K", subtitle: "Associate Professor", image: `${GITHUB_ASSETS}/our-team/drNizarBanuPK.jpg` },
];

/**
 * `blurb` is the member's portfolio — the committees they oversee. It is the
 * one piece of per-person information the roster carries that neither the
 * section heading nor the subtitle already says, so it earns the third line on
 * the card.
 */
export const CORE_COMMITTEE: TeamMember[] = [
  { name: "Shambhavi Sinha", subtitle: "4 MCA A (2547151)", blurb: "Decorations, Marketing & PR, Documentation", image: `${GITHUB_ASSETS}/our-team/students/2547151_Shambhavi Sinha.jpg` },
  { name: "Aimee Susan Joseph", subtitle: "4 MCA B (2547204)", blurb: "Logistics, Technical, Registrations", image: `${GITHUB_ASSETS}/our-team/students/2547204_Aimee Susan Joseph.JPG` },
  { name: "Smitha M", subtitle: "4 MSC AIML (2548556)", blurb: "Social Media, Media, Registrations, Finance & Accounts", image: `${GITHUB_ASSETS}/our-team/students/2548556_Smitha M.jpg` },
  { name: "Joshua Joby", subtitle: "4 MCA A (2547125)", blurb: "Hospitality, Sponsorship, Culturals, Finance & Accounts", image: `${GITHUB_ASSETS}/our-team/students/2547125_Joshua Joby.jpg` },
  { name: "Abhinav Jain", subtitle: "4 MCA B (2547203)", blurb: "Events, Logistics, Infobahn", image: `${GITHUB_ASSETS}/our-team/students/2547203_Abhinav Jain.jpg` },
  { name: "Hitesh Kumar", subtitle: "4 MSC AIML (2548525)", blurb: "Design & Graphics, Events, Culturals", image: `${GITHUB_ASSETS}/our-team/students/2548525_Hitesh Kumar.jpg` },
  { name: "Anooja Sreenivasan", subtitle: "1 MCA A (2647114)", blurb: "Decorations, Marketing & PR, Documentation", image: `${GITHUB_ASSETS}/our-team/students/2647114_Anooja Sreenivasan.jpg` },
  { name: "Haniya Zehra Mody", subtitle: "1 MCA B (2647225)", blurb: "Events, Logistics, Infobahn", image: `${GITHUB_ASSETS}/our-team/students/2647225_Haniya.jpg` },
  { name: "Joseph Alicia Elias", subtitle: "1 MSC AIML (2648525)", blurb: "Hospitality, Sponsorship, Culturals, Finance & Accounts", image: `${GITHUB_ASSETS}/our-team/students/2648525_Joseph Alicia Elias.jpg` },
  { name: "Iwin Jose", subtitle: "1 MCA A (2647126)", blurb: "Logistics, Technical, Registrations", image: `${GITHUB_ASSETS}/our-team/students/2647126_Iwin Jose.jpg` },
  { name: "Shiva A Karthik", subtitle: "1 MCA B (2647247)", blurb: "Social Media, Media, Registrations, Finance & Accounts", image: `${GITHUB_ASSETS}/our-team/students/2647247_Shiva A Karthik.jpg` },
  { name: "Ronith Tharun Joshi", subtitle: "1 MSC AIML (2648545)", blurb: "Design & Graphics, Events, Culturals", image: `${GITHUB_ASSETS}/our-team/students/2648545_Ronith Tharun Joshi.jpg` },
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
  { name: "Arden Savio Diago", team: "Culturals", subtitle: "4 MCA A (2547112)", image: `${GITHUB_ASSETS}/our-team/students/2547112_Arden Savio Diago.jpg` },
  { name: "Akhila Suresh", team: "Culturals", subtitle: "4 MSC AIML (2548507)", image: `${GITHUB_ASSETS}/our-team/students/2548507_Akhila Suresh.jpg` },
  { name: "Aadharsh Krishnaa G", team: "Culturals", subtitle: "4 MCA B (2547201)", image: `${GITHUB_ASSETS}/our-team/students/2547201_Aadharsh Krishnaa G.jpg` },
  { name: "Janis Anup", team: "Culturals", subtitle: "1 MCA B (2647230)", image: `${GITHUB_ASSETS}/our-team/students/2647230_Janis Anup.jpg` },
  { name: "Harinand A", team: "Culturals", subtitle: "1 MCA B (2647228)", image: `${GITHUB_ASSETS}/our-team/students/2647228_Harinand A.jpg` },

  { name: "Bhagyasree Roy", team: "Decorations", subtitle: "4 MCA A (2547118)", image: `${GITHUB_ASSETS}/our-team/students/2547118_Bhagyasree Roy.jpg` },
  { name: "Noel Lalichan", team: "Decorations", subtitle: "4 MSC AIML (2548537)", image: `${GITHUB_ASSETS}/our-team/students/2548537_Noel Lalichan.jpg` },
  { name: "Aksa Maria Thomas", team: "Decorations", subtitle: "1 MCA A (2647105)", image: `${GITHUB_ASSETS}/our-team/students/2647105_Aksa Maria Thomas.jpg` },
  { name: "Dixon Benoy", team: "Decorations", subtitle: "1 MCA B (2647220)", image: `${GITHUB_ASSETS}/our-team/students/2647220_Dixon Benoy.jpg` },

  { name: "Praneeth M", team: "Design & Graphics", subtitle: "4 MCA A (2547142)", image: `${GITHUB_ASSETS}/our-team/students/2547142_Praneeth M.jpg` },
  { name: "Hari Prasad B K", team: "Design & Graphics", subtitle: "4 MCA A (2547120)", image: `${GITHUB_ASSETS}/our-team/students/2547120_Hari Prasad B K.JPG` },
  { name: "Sarthak Behera", team: "Design & Graphics", subtitle: "1 MCA B (2647245)", image: `${GITHUB_ASSETS}/our-team/students/2647245_Sarthak Behera.jpg` },
  { name: "Tanisha Singha", team: "Design & Graphics", subtitle: "1 MSC AIML (2648548)", image: `${GITHUB_ASSETS}/our-team/students/2648548_Tanisha Singha.jpg` },

  { name: "Sharon Mathew", team: "Documentation", subtitle: "4 MCA B (2547247)", image: `${GITHUB_ASSETS}/our-team/students/2547247_Sharon Mathew.JPG` },
  { name: "Alok Tayal", team: "Documentation", subtitle: "4 MCA B (2547210)", image: `${GITHUB_ASSETS}/our-team/students/2547210_Alok Tayal.jpg` },
  { name: "Palak Kashyap", team: "Documentation", subtitle: "1 MCA A (2647139)", image: `${GITHUB_ASSETS}/our-team/students/2647139_Palak Kashyap.jpg` },
  { name: "Priscilla Philby Oommen", team: "Documentation", subtitle: "1 MSC AIML (2648541)", image: `${GITHUB_ASSETS}/our-team/students/2648541_Priscilla Philby Oommen.jpg` },

  { name: "Sudeepa Santhanam", team: "Events", subtitle: "4 MCA B (2547252)", image: `${GITHUB_ASSETS}/our-team/students/2547252_Sudeepa Santhanam.jpg` },
  { name: "Sankhe Athashree Sanjay", team: "Events", subtitle: "4 MSC AIML (2548546)", image: `${GITHUB_ASSETS}/our-team/students/2548546_Sankhe Athashree Sanjay.jpg` },
  { name: "Antony Chandy Douglas", team: "Events", subtitle: "1 MSC AIML (2648505)", image: `${GITHUB_ASSETS}/our-team/students/2648505_Antony Chandy Douglas.jpg` },
  { name: "Anugrahaa V", team: "Events", subtitle: "1 MSC AIML (2648506)", image: `${GITHUB_ASSETS}/our-team/students/2648506_Anugrahaa V.jpg` },
  { name: "Adharsh Mohanan", team: "Events", subtitle: "1 MSC AIML (2648503)", image: `${GITHUB_ASSETS}/our-team/students/2648503_Adharsh Mohanan.jpg` },

  { name: "B K Vishnu", team: "Finance & Accounts", subtitle: "4 MCA B (2547218)", image: `${GITHUB_ASSETS}/our-team/students/2547218_B K Vishnu.jpg` },
  { name: "Adarsh Gupta", team: "Finance & Accounts", subtitle: "4 MCA A (2547106)", image: `${GITHUB_ASSETS}/our-team/students/2547106_Adarsh Gupta.jpg` },
  { name: "Byrag Paul K B", team: "Finance & Accounts", subtitle: "1 MSC AIML (2648514)", image: `${GITHUB_ASSETS}/our-team/students/2648514_Byrag Paul K B.jpg` },
  { name: "Deepthi EK", team: "Finance & Accounts", subtitle: "1 MSC AIML (2648519)", image: `${GITHUB_ASSETS}/our-team/students/2648519_Deepthi EK.JPG` },

  { name: "Slaven Derick", team: "Hospitality", subtitle: "4 MCA B (2547249)", image: `${GITHUB_ASSETS}/our-team/students/2547249_Slaven Derick.jpg` },
  { name: "Sneha Varghese", team: "Hospitality", subtitle: "4 MCA B (2547250)", image: `${GITHUB_ASSETS}/our-team/students/2547250_Sneha Varghese.jpg` },
  { name: "Keerthan Thomas", team: "Hospitality", subtitle: "1 MCA A (2647133)", image: `${GITHUB_ASSETS}/our-team/students/2647133_Keerthan Thomas.JPG` },
  { name: "Ann miya", team: "Hospitality", subtitle: "1 MCA B (2647210)", image: `${GITHUB_ASSETS}/our-team/students/2647210_Ann miya.jpg` },

  { name: "Neha N", team: "Infobahn", subtitle: "4 MCA A (2547160)", image: `${GITHUB_ASSETS}/our-team/students/2547160_Neha N.jpg` },
  { name: "Nandini Singh", team: "Infobahn", subtitle: "4 MCA A (2547135)", image: `${GITHUB_ASSETS}/our-team/students/2547135_Nandini Singh.jpg` },
  { name: "Shawn Shiju Thomas", team: "Infobahn", subtitle: "1 MSC AIML (2648557)", image: `${GITHUB_ASSETS}/our-team/students/2648557_Shawn Shiju Thomas.jpg` },
  { name: "Swastik Sahu", team: "Infobahn", subtitle: "1 MCA A (2647155)", image: `${GITHUB_ASSETS}/our-team/students/2647155_Swastik Sahu.jpg` },

  { name: "Ananya Santosh Kumar Pillai", team: "Logistics", subtitle: "4 MSC AIML (2548511)", image: `${GITHUB_ASSETS}/our-team/students/2548511_Ananya Santosh Kumar Pillai.jpg` },
  { name: "Vishwas Vashishtha", team: "Logistics", subtitle: "4 MCA B (2547255)", image: `${GITHUB_ASSETS}/our-team/students/2547255_Vishwas Vashishtha.jpg` },
  { name: "Marcus Cunnumpuram Thomas", team: "Logistics", subtitle: "1 MSC AIML (2648529)", image: `${GITHUB_ASSETS}/our-team/students/2648529_Marcus Cunnumpuram Thomas.jpg` },
  { name: "Anvi Panwar", team: "Logistics", subtitle: "1 MSC AIML (2648564)", image: `${GITHUB_ASSETS}/our-team/students/2648564_Anvi Panwar.jpg` },

  { name: "Bhavya Dhanuka", team: "Marketing & PR", subtitle: "4 MCA B (2547219)", image: `${GITHUB_ASSETS}/our-team/students/2547219_Bhavya Dhanuka.jpg` },
  { name: "Anamaya Saraogi", team: "Marketing & PR", subtitle: "4 MCA A (2547109)", image: `${GITHUB_ASSETS}/our-team/students/2547109_Anamaya Saraogi.jpg` },
  { name: "Navin Jomi K", team: "Marketing & PR", subtitle: "1 MCA B (2647239)", image: `${GITHUB_ASSETS}/our-team/students/2647239_Navin Jomi K.jpg` },
  { name: "Varshini R B", team: "Marketing & PR", subtitle: "1 MCA B (2647257)", image: `${GITHUB_ASSETS}/our-team/students/2647257_Varshini R B.jpg` },

  { name: "S Kusum", team: "Media", subtitle: "4 MSC AIML (2548532)", image: `${GITHUB_ASSETS}/our-team/students/2548532_S Kusum.jpg` },
  { name: "Kapadia Ram Kalpesh", team: "Media", subtitle: "4 MSC AIML (2548530)", image: `${GITHUB_ASSETS}/our-team/students/2548530_Kapadia Ram Kalpesh.jpg` },
  { name: "Amogh Sahore", team: "Media", subtitle: "4 MCA A (2547108)", image: `${GITHUB_ASSETS}/our-team/students/2547108_Amogh Sahore.jpg` },
  { name: "Tharun Kumar", team: "Media", subtitle: "1 MCA B (2647255)", image: `${GITHUB_ASSETS}/our-team/students/2647255_Tharun Kumar.jpg` },
  { name: "Surabhi Kumari", team: "Media", subtitle: "1 MCA B (2647253)", image: `${GITHUB_ASSETS}/our-team/students/2647253_Surabhi Kumari.jpg` },
  { name: "Dibam Ranjan Sinha", team: "Media", subtitle: "1 MCA A (2647120)", image: `${GITHUB_ASSETS}/our-team/students/2647120_Dibam Ranjan Sinha.jpg` },

  { name: "Reno Reji Matthew", team: "Registrations", subtitle: "4 MCA A (2547145)", image: `${GITHUB_ASSETS}/our-team/students/2547145_Reno Reji Matthew.jpg` },
  { name: "Aditi Ahuja", team: "Registrations", subtitle: "4 MCA A (2547162)", image: `${GITHUB_ASSETS}/our-team/students/2547162_Aditi Ahuja.jpg` },
  { name: "Dhanashree Vishwajeet Dhavale", team: "Registrations", subtitle: "1 MCA B (2647219)", image: `${GITHUB_ASSETS}/our-team/students/2647219_Dhanashree Vishwajeet Dhavale.jpg` },
  { name: "Rohans S Martin", team: "Registrations", subtitle: "1 MCA B (2647244)", image: `${GITHUB_ASSETS}/our-team/students/2647244_Rohans S Martin.jpg` },

  { name: "Deon Thomas Binny", team: "Social Media", subtitle: "4 MSC AIML (2548519)", image: `${GITHUB_ASSETS}/our-team/students/2548519_Deon Thomas Binny.jpg` },
  { name: "Evana Joseph", team: "Social Media", subtitle: "4 MCA B (2547225)", image: `${GITHUB_ASSETS}/our-team/students/2547225_Evana Joseph.jpg` },
  { name: "Ishita Minia", team: "Social Media", subtitle: "1 MSC AIML (2648565)", image: `${GITHUB_ASSETS}/our-team/students/2648565_Ishita Minia.jpg` },
  { name: "Susan Matilda H", team: "Social Media", subtitle: "1 MCA B (2647254)", image: `${GITHUB_ASSETS}/our-team/students/2647254_Susan Matilda H.jpg` },

  { name: "S Vanshika", team: "Sponsorship", subtitle: "4 MSC AIML (2548544)", image: `${GITHUB_ASSETS}/our-team/students/2548544_S Vanshika.jpg` },
  { name: "Yash Barjatya", team: "Sponsorship", subtitle: "4 MCA B (2547257)", image: `${GITHUB_ASSETS}/our-team/students/2547257_Yash Barjatya.jpg` },
  { name: "Parthiv Sushil", team: "Sponsorship", subtitle: "4 MCA A (2547141)", image: `${GITHUB_ASSETS}/our-team/students/2547141_Parthiv Sushil.jpg` },
  { name: "Binosh Sibi", team: "Sponsorship", subtitle: "4 MSC AIML (2548515)", image: `${GITHUB_ASSETS}/our-team/students/2548515_Binosh Sibi.jpg` },
  { name: "Chethan Raj L", team: "Sponsorship", subtitle: "1 MCA A (2647117)", image: `${GITHUB_ASSETS}/our-team/students/2647117_Chethan Raj L.jpg` },
  { name: "Steve S Palakalam", team: "Sponsorship", subtitle: "1 MCA A (2647154)", image: `${GITHUB_ASSETS}/our-team/students/2647154_Steve S Palakalam.jpg` },
  { name: "Shebin John Bosco", team: "Sponsorship", subtitle: "1 MCA B (2647246)", image: `${GITHUB_ASSETS}/our-team/students/2647246_Shebin John Bosco.jpg` },
  { name: "Maegan Anna Jimmy", team: "Sponsorship", subtitle: "1 MSC AIML (2648558)", image: `${GITHUB_ASSETS}/our-team/students/2648558_Maegan Anna Jimmy.jpg` },
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
  { name: "Yanish Rai", subtitle: "4 MCA A (2547158)", image: `${GITHUB_ASSETS}/our-team/students/2547158_Yanish Rai.jpg` },
  { name: "Kartik Dewnani", subtitle: "4 MCA A (2547128)", image: `${GITHUB_ASSETS}/our-team/students/2547128_Kartik Dewnani.jpg` },
  { name: "Darshan Heble K", subtitle: "5 MCA A (2547119)", image: `${GITHUB_ASSETS}/our-team/students/2547119_Darshan Heble K.jpg` },
  { name: "Vishal B G", subtitle: "1 MCA A (2647158)", image: `${GITHUB_ASSETS}/our-team/students/2647158_Vishal B G.jpg` },
  { name: "Gerard Nicholas Paul M", subtitle: "1 MCA A (2647122)", image: `${GITHUB_ASSETS}/our-team/students/2647122_Gerard Nicholas Paul M.JPG` },
  { name: "S Anand", subtitle: "1 MCA A (2647145)", image: `${GITHUB_ASSETS}/our-team/students/2647145_S Anand.jpg` },
  { name: "Gokul T A", subtitle: "1 MCA B (2647224)", image: `${GITHUB_ASSETS}/our-team/students/2647224_Gokul T A.jpg` },
];

