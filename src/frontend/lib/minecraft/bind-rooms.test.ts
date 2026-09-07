import assert from "node:assert/strict";
import test from "node:test";
import type { FestEvent } from "../events";
import type { RoomAnchor } from "./engine-types";
import { bindEventsToRooms, orderForRooms, roomIndexForEvent, wrapLines } from "./bind-rooms";

function room(index: number): RoomAnchor {
  const x = index * 10;
  return {
    index,
    wing: "north",
    name: `N${index + 1}`,
    bounds: { min: { x, y: 9, z: 0 }, max: { x: x + 7, y: 13, z: 7 } },
    centre: { x: x + 4, y: 9, z: 4 },
    door: { x: x + 4, y: 9, z: 8, facing: "south", outside: { x: x + 4, y: 9, z: 9.5 } },
    sign: { x: x + 7, y: 10, z: 9, facing: "south" },
    label: { x: x + 4, y: 12.6, z: 8.6 },
    board: { cx: x + 4, cy: 11.5, cz: 0.02, axis: "z", dir: 1, w: 4, h: 3 },
  };
}

function event(i: number, track: FestEvent["track"]): FestEvent {
  return {
    slug: `event-${i}`,
    name: `Event ${i}`,
    kind: track === "technical" ? "Hackathon" : "Quiz",
    track,
    description: "",
    participation: "Individual",
    date: "10 Oct",
    venue: `Room ${i}`,
    timeFrom: "10:00",
    timeTo: "12:00",
    prizes: "",
    prizePool: "₹10,000",
    maxSlots: null,
  };
}

const options = {
  spare: [
    { label: "Sponsors' Pavilion", lines: ["SPONSORS'", "PAVILION"] },
    { label: "Leaderboard", lines: ["LEADERBOARD"] },
    { label: "Help Desk", lines: ["HELP DESK"] },
  ],
  comingSoon: { label: "Coming soon", lines: ["COMING", "SOON"] },
};

const rooms = Array.from({ length: 16 }, (_, i) => room(i));
// alternate tracks in sheet order, the way the real sheet interleaves them
const thirteen = Array.from({ length: 13 }, (_, i) =>
  event(i, i % 2 === 0 ? "technical" : "non-technical"),
);

test("thirteen events fill thirteen rooms and the spares take the rest", () => {
  const { bindings, overflow } = bindEventsToRooms(thirteen, rooms, options);
  assert.equal(bindings.length, 16);
  assert.equal(overflow.length, 0);
  assert.equal(bindings.filter((b) => b.interactive).length, 13);
  assert.deepEqual(
    bindings.slice(13).map((b) => b.label),
    ["Sponsors' Pavilion", "Leaderboard", "Help Desk"],
  );
  for (const b of bindings.slice(13)) assert.equal(b.slug, null);
});

test("technical events form a contiguous prefix, in sheet order", () => {
  const { bindings } = bindEventsToRooms(thirteen, rooms, options);
  const slugs = bindings.slice(0, 13).map((b) => b.slug);
  const expected = orderForRooms(thirteen).map((e) => e.slug);
  assert.deepEqual(slugs, expected);
  const firstNonTech = expected.findIndex((s) => s!.endsWith("1"));
  assert.equal(firstNonTech, 7, "seven technical events come first");
});

test("more events than rooms spill into overflow, and coming-soon never appears", () => {
  const twenty = Array.from({ length: 20 }, (_, i) => event(i, "technical"));
  const { bindings, overflow } = bindEventsToRooms(twenty, rooms, options);
  assert.equal(bindings.length, 16);
  assert.equal(overflow.length, 4);
  assert.ok(bindings.every((b) => b.interactive));
});

test("no events at all still signs every room", () => {
  const { bindings } = bindEventsToRooms([], rooms, options);
  assert.equal(bindings.filter((b) => b.label === "Coming soon").length, 13);
  assert.ok(bindings.every((b) => b.signLines.length > 0));
});

test("binding is deterministic", () => {
  const a = bindEventsToRooms(thirteen, rooms, options);
  const b = bindEventsToRooms(thirteen, rooms, options);
  assert.deepEqual(a, b);
});

test("roomIndexForEvent finds the slot", () => {
  const { bindings } = bindEventsToRooms(thirteen, rooms, options);
  assert.equal(roomIndexForEvent(bindings, "event-0"), 0);
  assert.equal(roomIndexForEvent(bindings, "nope"), null);
});

test("wrapLines respects width and line caps", () => {
  assert.deepEqual(wrapLines("Twenty Four Degree Shift", 14, 3), ["Twenty Four", "Degree Shift"]);
  assert.deepEqual(wrapLines("Supercalifragilistic", 8, 2), ["Superca…"]);
  assert.equal(wrapLines("a b c d e f g h", 3, 2).length, 2);
  assert.deepEqual(wrapLines("", 10, 2), [""]);
});
