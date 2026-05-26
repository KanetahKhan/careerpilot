"use client";

import { ReactTyped } from "react-typed";

type Props = {
  strings: string[];
  typeSpeed?: number;
  backSpeed?: number;
  backDelay?: number;
};

export function TypeWriter({
  strings,
  typeSpeed = 80,
  backSpeed = 30,
  backDelay = 1400,
}: Props) {
  return (
    <ReactTyped
      strings={strings}
      typeSpeed={typeSpeed}
      backSpeed={backSpeed}
      backDelay={backDelay}
      loop
      smartBackspace
      showCursor
      cursorChar="|"
    />
  );
}
