import type { Metadata } from "next";

import { StrayPage } from "./components/stray-page";

export const metadata: Metadata = { title: "Not found · EEF Learn" };

export default function NotFound() {
  return (
    <StrayPage
      title="This page drifted out of orbit"
      body="Owlbert has searched nine thousand galaxies and can't find it here. The link may be old, or the map may be private."
    />
  );
}
