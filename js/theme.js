/* Design-system stylesheet switcher. Exposes RFP.theme.
 *
 * A demonstration control, not a site feature (SPEC 8.7). It swaps the href of
 * the one themed stylesheet link between the two vendored design systems, both
 * of which are USWDS builds carrying the same class names, so no markup changes.
 * Grove ships a uswds.min.js byte-identical to the one in uswds/js/, so the
 * scripts are shared and only CSS moves.
 *
 * This file loads in <head> rather than at the end of <body> (the exception to
 * SPEC 2.2), so a stored choice is applied before first paint.
 */
(function () {
  "use strict";

  window.RFP = window.RFP || {};

  var STORAGE_KEY = "rfp-theme";
  var DEFAULT = "uswds";

  // The head phase runs before the <select> exists, so it cannot read the
  // option values. This is the allowlist that keeps a stored string from
  // reaching a stylesheet href unchecked.
  var SHEETS = {
    uswds: "uswds/css/uswds.min.css",
    njwds: "njwds/css/styles.css"
  };

  var current = DEFAULT;

  function apply(name) {
    var link = document.getElementById("theme-stylesheet");
    if (!link) return;
    current = name;
    link.setAttribute("href", SHEETS[name]);
    // custom.css keys its color tokens off this. Set on <html> rather than
    // <body>, which does not exist yet when this runs in <head>.
    document.documentElement.setAttribute("data-theme", name);
  }

  // Private-mode and blocked-storage browsers throw on access rather than
  // returning null, and a prototype should still render if that happens.
  function stored() {
    var name;
    try {
      name = window.localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
    return Object.prototype.hasOwnProperty.call(SHEETS, name) ? name : null;
  }

  function remember(name) {
    try {
      window.localStorage.setItem(STORAGE_KEY, name);
    } catch (e) {
      /* Choice still applies for this page; it just will not carry over. */
    }
  }

  apply(stored() || DEFAULT);

  // No aria-live announcement here: SPEC 8.4 makes the result count the single
  // announcement channel, and the change is visible without one.
  document.addEventListener("DOMContentLoaded", function () {
    var select = document.getElementById("theme-select");
    if (!select) return;
    select.value = current;
    select.addEventListener("change", function () {
      apply(select.value);
      remember(select.value);
    });
  });

  RFP.theme = { apply: apply };
})();
