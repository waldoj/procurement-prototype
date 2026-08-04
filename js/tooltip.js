/* Tooltip show/hide for dynamically rendered triggers. Exposes RFP.tooltip.
 *
 * USWDS initializes tooltips against the DOM present at load and binds its
 * handlers to document.body. Neither reaches markup we insert after the fetch
 * resolves, and the bundle keeps its component registry private, so there is
 * no on() to call against a new subtree (SPEC 8.6).
 *
 * Triggers are authored in templates already wrapped in USWDS's initialized
 * shape, so all that is missing is show/hide. That is what this file adds,
 * using the same classes and aria-hidden flips USWDS itself uses.
 */
(function () {
  "use strict";

  window.RFP = window.RFP || {};

  function body(trigger) {
    return trigger.parentNode.querySelector(".usa-tooltip__body");
  }

  function show(trigger) {
    var tip = body(trigger);
    if (!tip) return;
    tip.setAttribute("aria-hidden", "false");
    tip.classList.add("is-set", "is-visible");
  }

  function hide(trigger) {
    var tip = body(trigger);
    if (!tip) return;
    tip.setAttribute("aria-hidden", "true");
    tip.classList.remove("is-set", "is-visible");
  }

  // Bound per trigger rather than delegated: focusin from a programmatic or
  // Tab-driven focus does not reliably reach a body-level listener here, which
  // is the failure SPEC 8.6 warns about.
  function bind(root) {
    var triggers = root.querySelectorAll(".usa-tooltip__trigger");
    Array.prototype.forEach.call(triggers, function (trigger) {
      trigger.addEventListener("focus", function () {
        show(trigger);
      });
      trigger.addEventListener("blur", function () {
        hide(trigger);
      });
      trigger.addEventListener("mouseenter", function () {
        show(trigger);
      });
      trigger.addEventListener("mouseleave", function () {
        hide(trigger);
      });
      trigger.addEventListener("keydown", function (e) {
        if (e.key === "Escape") hide(trigger);
      });
    });
  }

  RFP.tooltip = { bind: bind };
})();
