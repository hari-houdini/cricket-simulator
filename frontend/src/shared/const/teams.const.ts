import { array } from "zod";
import { teamSchema } from "../types/team.schema";
import type { Team } from "../types/team.types";

/**
 * The ten IPL franchises in the league, with their team colors.
 *
 * Colors come from third-party palette sites (brandpalettes.com and
 * teamcolorcodes.com), not from franchise brand guidelines. Entries marked
 * `UNVERIFIED` could not be sourced at all and are placeholders to confirm
 * before release.
 *
 * The array is validated against {@link teamSchema} at module load, so a bad
 * edit fails at startup instead of rendering a broken badge.
 */
export const TEAMS: readonly Team[] = array(teamSchema).parse([
  {
    id: "csk",
    name: "Chennai Super Kings",
    abbreviation: "CSK",
    color: "#F9CD05",
  },
  { id: "mi", name: "Mumbai Indians", abbreviation: "MI", color: "#005FA2" },
  // UNVERIFIED: the sourced value is for a red shade (#E63329). Confirm the primary.
  {
    id: "rcb",
    name: "Royal Challengers Bengaluru",
    abbreviation: "RCB",
    color: "#E63329",
  },
  {
    id: "kkr",
    name: "Kolkata Knight Riders",
    abbreviation: "KKR",
    color: "#3A225D",
  },
  // Sourced from the former name, Delhi Daredevils. Confirm against the current brand.
  { id: "dc", name: "Delhi Capitals", abbreviation: "DC", color: "#213F7D" },
  // UNVERIFIED: no source found. Placeholder for the Royals' blue.
  { id: "rr", name: "Rajasthan Royals", abbreviation: "RR", color: "#254AA5" },
  {
    id: "srh",
    name: "Sunrisers Hyderabad",
    abbreviation: "SRH",
    color: "#F7A721",
  },
  // UNVERIFIED: no source found. Placeholder for the Super Giants' maroon.
  {
    id: "lsg",
    name: "Lucknow Super Giants",
    abbreviation: "LSG",
    color: "#A72056",
  },
  // UNVERIFIED: no source found. Placeholder for the Titans' navy.
  { id: "gt", name: "Gujarat Titans", abbreviation: "GT", color: "#1B2133" },
  // Sourced from the former name, Kings XI Punjab. Confirm against the current brand.
  { id: "pbks", name: "Punjab Kings", abbreviation: "PBKS", color: "#ED1D24" },
]);
