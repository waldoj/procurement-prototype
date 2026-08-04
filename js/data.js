/* Fetch, cache, and lookup for data/solicitations.json. Exposes RFP.data. */
(function () {
  "use strict";

  window.RFP = window.RFP || {};

  var promise = null;

  // Records are never mutated (SPEC 6). Derived values live in a parallel
  // structure keyed by solicitationNumber, computed once at load.
  function derive(payload) {
    var now = new Date();
    var agencies = {};
    var categories = {};

    payload.agencies.forEach(function (a) {
      agencies[a.id] = a;
    });
    payload.categories.forEach(function (c) {
      categories[c.id] = c;
    });

    var derived = {};
    payload.solicitations.forEach(function (s) {
      var deadline = new Date(s.deadline);
      var agency = agencies[s.agency];
      var category = categories[s.category];

      // DATA-SCHEMA 5: closure is derived. An "open" record with a past
      // deadline is closed everywhere in the UI.
      var isClosed =
        s.status === "closed" || s.status === "awarded" || deadline < now;
      var days = RFP.format.daysUntil(deadline, now);

      derived[s.solicitationNumber] = {
        deadlineDate: deadline,
        isClosed: isClosed,
        daysUntilDeadline: days,
        // Urgency tag only for open records closing within 7 days (SPEC 4.5).
        isClosingSoon: !isClosed && days <= 7,
        agencyName: agency ? agency.name : s.agency,
        categoryName: category ? category.name : s.category,
        haystack: [
          s.title,
          s.summary,
          s.description,
          s.solicitationNumber,
          agency ? agency.name : ""
        ]
          .join(" ")
          .toLowerCase()
          .replace(/\s+/g, " ")
      };
    });

    return {
      agencies: payload.agencies,
      categories: payload.categories,
      solicitations: payload.solicitations,
      derived: derived
    };
  }

  // Fetched once per page load; repeat callers get the same promise.
  function load() {
    if (!promise) {
      promise = fetch("data/solicitations.json")
        .then(function (response) {
          if (!response.ok) {
            throw new Error("HTTP " + response.status + " loading solicitations");
          }
          return response.json();
        })
        .then(derive);
    }
    return promise;
  }

  function find(model, id) {
    var match = null;
    model.solicitations.forEach(function (s) {
      if (s.solicitationNumber === id) match = s;
    });
    return match;
  }

  RFP.data = {
    load: load,
    find: find
  };
})();
