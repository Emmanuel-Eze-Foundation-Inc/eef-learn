"use client";

import { LayoutGrid, type LayoutGridCard } from "@/components/ui/layout-grid";

const PHOTOS = [
  {
    file: "9174",
    span: "col-span-2",
    title: "Certificate day",
    caption: "Students holding the certificates they earned in the computer training we paid for.",
    focus: "center 30%",
  },
  {
    file: "7525",
    title: "Home is on the water",
    caption: "Makoko is built on stilts over the Lagos Lagoon. Children paddle to school, to market, and home.",
    focus: "center 35%",
  },
  {
    file: "7556",
    title: "Food, delivered by canoe",
    caption: "Volunteers carried food parcels from boat to boat so no family had to come to us.",
    focus: "center 45%",
  },
  {
    file: "7508",
    title: "Raised above the lagoon",
    caption: "Families live in wooden homes on stilts, reached only by water.",
    focus: "center 40%",
  },
  {
    file: "9160",
    title: "Finished the course",
    caption: "A student with the certificate from a computer training most children here never get near.",
    focus: "center 25%",
  },
  {
    file: "7585",
    title: "The volunteer team",
    caption: "Volunteers heading into the community on a delivery day.",
    focus: "center 45%",
  },
  {
    file: "7536",
    span: "col-span-2",
    title: "Getting around Makoko",
    caption: "Our team travelling between homes by canoe.",
    focus: "center 55%",
  },
  {
    file: "7573",
    title: "One parcel at a time",
    caption: "Handing food up from the canoes to the families waiting on the walkways.",
    focus: "center 35%",
  },
  {
    file: "7483",
    title: "Crossing the lagoon",
    caption: "Most of the work happened on the water, one stop after another.",
    focus: "center 30%",
  },
  {
    file: "9140",
    title: "Paid for to the end",
    caption: "We covered the full cost of the training, so every child who started could finish.",
    focus: "center 25%",
  },
] as const;

const CARDS: LayoutGridCard[] = PHOTOS.map((photo, i) => ({
  id: i + 1,
  thumbnail: `/foundation/makoko/makoko-${photo.file}.jpg`,
  alt: `${photo.title}. ${photo.caption}`,
  focus: photo.focus,
  className: "span" in photo ? photo.span : "",
  content: (
    <div>
      <p className="text-2xl font-bold tracking-tight sm:text-3xl">{photo.title}</p>
      <p className="mt-2 max-w-[48ch] text-[15px] leading-relaxed text-white/85 sm:text-base">{photo.caption}</p>
    </div>
  ),
}));

export function MakokoGallery() {
  return (
    <LayoutGrid
      cards={CARDS}
      className="grid-flow-dense grid-cols-2 gap-3 auto-rows-[190px] sm:auto-rows-[260px] md:gap-4 lg:auto-rows-[300px]"
    />
  );
}
