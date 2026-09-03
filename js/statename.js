/* Swaps the fictional state name to match the chosen design system.
 *
 * A demonstration prop, not a site feature (SPEC 3.3, 8.7). When the switcher
 * moves to a state's design system, the state name in the page text follows it,
 * so the comparison reads as one site restyled rather than as stock USWDS with
 * a state palette bolted on. The source text is authored around "Columbia"
 * (SPEC 7.1); this rewrites what is rendered, never the data.
 *
 * The pass rewrites *any* of the three names to the current one rather than
 * only "Columbia". That makes it idempotent and lets it switch straight from
 * one state to another without having to remember what the text said first.
 *
 * Deliberately not comprehensive: solicitation numbers keep their COL- prefix,
 * and the fabricated ZIP codes and "Capitol City" do not move.
 */
(function () {
  "use strict";

  window.RFP = window.RFP || {};

  var NAMES = {
    uswds: "Columbia",
    njwds: "New Jersey",
    mdwds: "Maryland"
  };

  var ANY_NAME = /Columbia|New Jersey|Maryland/g;

  // The switcher's own option labels are two of these state names. Rewriting
  // them would collapse the control into three identical choices.
  var SKIP_SELECTOR = ".rfp-demo-bar";

  // The only two attributes carrying the state name (banner label, logo link).
  var ATTRIBUTES = ["aria-label", "title"];

  function currentName() {
    return NAMES[document.documentElement.getAttribute("data-theme")] || NAMES.uswds;
  }

  function swapText(node, name) {
    var swapped = node.nodeValue.replace(ANY_NAME, name);
    if (swapped !== node.nodeValue) node.nodeValue = swapped;
  }

  function swapAttributes(element, name) {
    ATTRIBUTES.forEach(function (attribute) {
      var value = element.getAttribute(attribute);
      if (!value) return;
      var swapped = value.replace(ANY_NAME, name);
      if (swapped !== value) element.setAttribute(attribute, swapped);
    });
  }

  function apply() {
    var name = currentName();

    document.title = document.title.replace(ANY_NAME, name);

    var walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
      function (node) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          return node.matches(SKIP_SELECTOR)
            ? NodeFilter.FILTER_REJECT
            : NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    );

    var node;
    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.TEXT_NODE) {
        swapText(node, name);
      } else {
        swapAttributes(node, name);
      }
    }
  }

  // The chrome is in the HTML, so it needs one pass of its own. Rendered
  // regions call apply() themselves, since their text arrives from the JSON
  // after this has run.
  document.addEventListener("DOMContentLoaded", apply);

  RFP.stateName = { apply: apply };
})();
