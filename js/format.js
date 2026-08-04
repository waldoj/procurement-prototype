/* Date, time, and label formatting helpers. Exposes RFP.format. */
(function () {
  "use strict";

  window.RFP = window.RFP || {};

  var TIME_ZONE = "America/Chicago";

  // "March 14, 2026"
  var dateFmt = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: TIME_ZONE
  });

  // "2:00 PM"
  var timeFmt = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: TIME_ZONE
  });

  // The state is in US Central. SPEC 7.4 requires the zone named in words,
  // so "Central time" is written out rather than taken from a formatter,
  // which would render "CDT"/"CST".
  function dateTime(iso) {
    var d = new Date(iso);
    return dateFmt.format(d) + ", " + timeFmt.format(d) + " Central time";
  }

  // postedDate is a date-only string; parsing it bare would land at UTC
  // midnight and can render as the previous day in Central. Pin it to noon
  // UTC so the calendar date is stable.
  function date(iso) {
    var d = iso.length === 10 ? new Date(iso + "T12:00:00Z") : new Date(iso);
    return dateFmt.format(d);
  }

  // Whole days from now until the deadline, counted in Central calendar days
  // so "closes today" means today where the agency is, not where the reader is.
  function daysUntil(deadlineDate, now) {
    var a = centralMidnight(now);
    var b = centralMidnight(deadlineDate);
    return Math.round((b - a) / 86400000);
  }

  var partsFmt = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: TIME_ZONE
  });

  function centralMidnight(d) {
    var p = {};
    partsFmt.formatToParts(d).forEach(function (part) {
      p[part.type] = part.value;
    });
    return Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day));
  }

  // "Closes today" / "Closes tomorrow" / "Closes in 5 days" (DATA-SCHEMA 5).
  function closesInLabel(days) {
    if (days <= 0) return "Closes today";
    if (days === 1) return "Closes tomorrow";
    return "Closes in " + days + " days";
  }

  // "(in 5 days)" for the detail page key-facts row.
  function countdownLabel(days) {
    if (days <= 0) return "(today)";
    if (days === 1) return "(tomorrow)";
    return "(in " + days + " days)";
  }

  RFP.format = {
    dateTime: dateTime,
    date: date,
    daysUntil: daysUntil,
    closesInLabel: closesInLabel,
    countdownLabel: countdownLabel
  };
})();
