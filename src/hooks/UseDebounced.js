/**
 * useDebounced(value, delayMs): returns the value only after it stopped changing for delayMs
 * (search boxes).
 *
 * Used by: pages/InvoiceListPage.jsx
 */

import { useEffect, useState } from "react";

/**
 * Returns `value` only after it has stopped changing for `milliseconds` (search boxes).
 *
 * search box — har key par API call na ho
 *
 * @param {*} value
 * @param {number} [milliseconds=350] Wait time, default 350.
 * @returns {*} The settled value.
 */
export const useDebounced = (value, milliseconds = 350) => {
  const [draftValue, setDraftValue] = useState(value);
  useEffect(() => {
    const timerId = setTimeout(() => setDraftValue(value), milliseconds);
    return () => clearTimeout(timerId);
  }, [value, milliseconds]);
  return draftValue;
};
