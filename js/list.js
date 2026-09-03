/* List page controller. Exposes RFP.list. */
(function () {
  "use strict";

  window.RFP = window.RFP || {};

  var model = null;

  var state = {
    search: "",
    agencies: {},
    categories: {},
    status: "open",
    sort: "deadline"
  };

  var el = {};
  var debounceTimer = null;

  function cacheElements() {
    el.form = document.getElementById("search-form");
    el.search = document.getElementById("search-field");
    el.agencyFilters = document.getElementById("agency-filters");
    el.categoryFilters = document.getElementById("category-filters");
    el.statusInputs = document.querySelectorAll("input[name='status']");
    el.clear = document.getElementById("clear-filters");
    el.sort = document.getElementById("sort-select");
    el.count = document.getElementById("result-count");
    el.list = document.getElementById("results-list");
    el.heading = document.getElementById("results-heading");
    el.error = document.getElementById("error-region");
    el.rowTemplate = document.getElementById("template-rfp-row");
    el.noResultsTemplate = document.getElementById("template-no-results");
    el.optionTemplate = document.getElementById("template-filter-option");
    el.errorTemplate = document.getElementById("template-error");
  }

  // --- filter option rendering -------------------------------------------

  function renderFilterOptions(container, entries, kind) {
    var items = entries.map(function (entry) {
      var node = el.optionTemplate.content.cloneNode(true);
      var input = node.querySelector("[data-field='input']");
      var label = node.querySelector("[data-field='label']");
      var info = node.querySelector("[data-field='info']");
      var infoTip = node.querySelector("[data-field='info-tip']");
      var id = kind + "-" + entry.id;

      input.id = id;
      input.value = entry.id;
      input.addEventListener("change", function () {
        state[kind === "agency" ? "agencies" : "categories"][entry.id] =
          input.checked;
        render();
      });

      label.setAttribute("for", id);
      label.textContent = entry.name;

      // Filter options render after the fetch, missing USWDS's init, so the
      // tooltip body is authored in the template and filled in here rather
      // than left as a title attribute for USWDS to convert.
      var tipId = "tip-" + kind + "-" + entry.id;
      infoTip.id = tipId;
      infoTip.textContent = entry.description;
      info.setAttribute("aria-describedby", tipId);
      info.setAttribute("aria-label", 'What does "' + entry.name + '" mean?');

      return node;
    });
    container.replaceChildren.apply(container, items);
    RFP.tooltip.bind(container);
  }

  // --- filtering, sorting -------------------------------------------------

  function selectedIds(map) {
    return Object.keys(map).filter(function (k) {
      return map[k];
    });
  }

  function matches(record) {
    var d = model.derived[record.solicitationNumber];

    if (state.status === "open" && d.isClosed) return false;

    var agencies = selectedIds(state.agencies);
    if (agencies.length && agencies.indexOf(record.agency) === -1) return false;

    var categories = selectedIds(state.categories);
    if (categories.length && categories.indexOf(record.category) === -1) {
      return false;
    }

    if (state.search && d.haystack.indexOf(state.search) === -1) return false;

    return true;
  }

  function compare(a, b) {
    var da = model.derived[a.solicitationNumber];
    var db = model.derived[b.solicitationNumber];

    // Status is always the primary key: open before closed (SPEC 4.4).
    if (da.isClosed !== db.isClosed) return da.isClosed ? 1 : -1;

    var result = 0;
    if (state.sort === "deadline") {
      result = da.deadlineDate - db.deadlineDate;
    } else if (state.sort === "posted") {
      result = a.postedDate < b.postedDate ? 1 : a.postedDate > b.postedDate ? -1 : 0;
    } else if (state.sort === "title") {
      result = a.title.localeCompare(b.title, "en", { sensitivity: "base" });
    }
    if (result !== 0) return result;

    // Stable tiebreak.
    return a.solicitationNumber.localeCompare(b.solicitationNumber);
  }

  // --- row rendering ------------------------------------------------------

  function buildRow(record) {
    var d = model.derived[record.solicitationNumber];
    var node = el.rowTemplate.content.cloneNode(true);

    var link = node.querySelector("[data-field='title-link']");
    link.textContent = record.title;
    link.href = "detail.html?id=" + encodeURIComponent(record.solicitationNumber);

    var tagWrap = node.querySelector("[data-field='tag-wrap']");
    var tag = node.querySelector("[data-field='tag']");
    if (record.status === "awarded") {
      tag.textContent = "Awarded";
      tagWrap.hidden = false;
    } else if (d.isClosed) {
      tag.textContent = "Closed";
      tagWrap.hidden = false;
    } else if (d.isClosingSoon) {
      tag.textContent = RFP.format.closesInLabel(d.daysUntilDeadline);
      tag.classList.add("usa-tag--big", "rfp-tag--urgent");
      tagWrap.hidden = false;
    }

    node.querySelector("[data-field='summary']").textContent = record.summary;
    node.querySelector("[data-field='agency']").textContent = d.agencyName;

    var deadline = RFP.format.dateTime(record.deadline);
    if (d.isClosingSoon) {
      deadline += " " + RFP.format.countdownLabel(d.daysUntilDeadline);
    }
    node.querySelector("[data-field='deadline']").textContent = deadline;
    node.querySelector("[data-field='category']").textContent = d.categoryName;

    var trigger = node.querySelector("[data-field='number-trigger']");
    trigger.textContent = "Opportunity #" + record.solicitationNumber;
    trigger.setAttribute("aria-label", 'What does "Opportunity #" mean?');

    // Tooltip body needs a unique id for aria-describedby to resolve.
    var tip = node.querySelector("[data-field='number-tip']");
    var tipId = "tip-" + record.solicitationNumber;
    tip.id = tipId;
    trigger.setAttribute("aria-describedby", tipId);

    node.querySelector("[data-field='posted']").textContent =
      "Posted " + RFP.format.date(record.postedDate);

    return node;
  }

  // --- count text ---------------------------------------------------------

  function countText(n) {
    var noun = n === 1 ? "opportunity" : "opportunities";
    var text;
    if (state.search) {
      text = "Showing " + n + " " + noun + ' matching "' + el.search.value.trim() + '"';
    } else if (state.status === "open") {
      text = "Showing " + n + " open " + noun;
    } else {
      text = "Showing " + n + " " + noun;
    }
    return text;
  }

  // --- render -------------------------------------------------------------

  function render() {
    var records = model.solicitations.filter(matches).sort(compare);

    el.count.textContent = countText(records.length);

    if (records.length === 0) {
      var empty = el.noResultsTemplate.content.cloneNode(true);
      empty.querySelector("[data-field='clear']").addEventListener("click", clearFilters);
      el.list.replaceChildren(empty);
      return;
    }

    el.list.replaceChildren.apply(el.list, records.map(buildRow));

    // Rows are new DOM every render; their tooltips need binding (SPEC 8.6).
    RFP.tooltip.bind(el.list);
    RFP.stateName.apply();
  }

  // --- events -------------------------------------------------------------

  function clearFilters() {
    state.search = "";
    state.agencies = {};
    state.categories = {};
    state.status = "open";
    el.search.value = "";
    document.getElementById("status-open").checked = true;
    Array.prototype.forEach.call(
      document.querySelectorAll(".usa-checkbox__input"),
      function (input) {
        input.checked = false;
      }
    );
    render();

    // Deferred: a click handler that moves focus is undone when the browser
    // settles focus on the activated button afterward (SPEC 8.4).
    window.setTimeout(function () {
      el.heading.focus();
    }, 0);
  }

  function applySearch() {
    state.search = el.search.value.trim().toLowerCase().replace(/\s+/g, " ");
    render();
  }

  function bindEvents() {
    el.form.addEventListener("submit", function (e) {
      e.preventDefault();
      window.clearTimeout(debounceTimer);
      applySearch();
    });

    // Debounced so typing does not flood the live region (SPEC 8.4).
    el.search.addEventListener("input", function () {
      window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(applySearch, 200);
    });

    Array.prototype.forEach.call(el.statusInputs, function (input) {
      input.addEventListener("change", function () {
        if (input.checked) {
          state.status = input.value;
          render();
        }
      });
    });

    el.sort.addEventListener("change", function () {
      state.sort = el.sort.value;
      render();
    });

    el.clear.addEventListener("click", clearFilters);
  }

  function showError(error) {
    console.error(error);
    el.error.replaceChildren(el.errorTemplate.content.cloneNode(true));
    el.error.hidden = false;
  }

  function init() {
    cacheElements();
    RFP.data
      .load()
      .then(function (loaded) {
        model = loaded;
        renderFilterOptions(el.agencyFilters, model.agencies, "agency");
        renderFilterOptions(el.categoryFilters, model.categories, "category");
        bindEvents();
        render();
      })
      .catch(showError);
  }

  document.addEventListener("DOMContentLoaded", init);

  RFP.list = { init: init };
})();
