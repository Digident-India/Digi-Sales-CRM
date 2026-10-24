/**
 * Number that counts up from 0 when shown.
 *
 * Used by: components/agent/AgentDrilldown.jsx
 */

import { useEffect, useRef, useState } from "react";

/* Lightweight count-up animation — no dependency needed.
   Animates from whatever is currently displayed to the new `value`
   whenever it changes, using an eased requestAnimationFrame loop. */
export default function CountUp({
  value = 0,
  duration = 900,
  decimals = 0,
  suffix = "",
  prefix = "",
}) {
  const [display, setDisplay] = useState(0);
  const displayRef = useRef(0);

  useEffect(() => {
    const from = displayRef.current;
    const to = Number(value) || 0;
    let raf;
    let start = null;

    const step = (timestamp) => {
      if (start === null) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      const current = from + (to - from) * eased;
      displayRef.current = current;
      setDisplay(current);
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  const shown =
    decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString("en-IN");
  return (
    <>
      {prefix}
      {shown}
      {suffix}
    </>
  );
}
