/**
 * Date & Time Utilities for DineHQ Print Templates & Dashboard
 * Formats dates in standard 12-hour format (e.g., 03:45 PM, 15 Oct 2026)
 */

export function format12HourTime(dateInput) {
  if (!dateInput) {
    const now = new Date();
    return formatParts(now);
  }

  const date =
    typeof dateInput === 'string' || typeof dateInput === 'number'
      ? new Date(dateInput)
      : dateInput;

  if (isNaN(date.getTime())) {
    return formatParts(new Date());
  }

  return formatParts(date);
}

function formatParts(date) {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 hour should be 12
  const strHours = hours < 10 ? `0${hours}` : `${hours}`;
  const strMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  const timeOnly = `${strHours}:${strMinutes} ${ampm}`;
  const dateOnly = `${day} ${month} ${year}`;
  const full12Hour = `${day} ${month} ${year}, ${timeOnly}`;

  return {
    timeOnly,
    dateOnly,
    full12Hour,
  };
}
