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
  var subscribed = false;

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
    el.subscribe = document.getElementById("subscribe");
    el.subscribeBody = document.getElementById("subscribe-body");
    el.subscribeSummary = document.getElementById("subscribe-summary");
    el.subscribeForm = document.getElementById("subscribe-form");
    el.subscribeEmail = document.getElementById("subscribe-email");
    el.confirmTemplate = document.getElementById("template-subscribe-confirm");
    el.rssToggle = document.getElementById("rss-toggle");
    el.rssAddress = document.getElementById("rss-address");
    el.rssUrl = document.getElementById("rss-url");
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

  // --- subscription ---------------------------------------------------------

  function selectedNames(map, entries) {
    var ids = selectedIds(map);
    return entries
      .filter(function (entry) {
        return ids.indexOf(entry.id) !== -1;
      })
      .map(function (entry) {
        return entry.name;
      });
  }

  // Serial comma only when an item carries an "and" of its own: half the
  // category names do, and "construction and building or information
  // technology" does not parse. No agency name does, so those read plainly.
  // Capped at three so a fully checked column cannot run the sentence away.
  function nameList(names) {
    if (names.length === 1) return names[0];
    if (names.length > 3) {
      return names.slice(0, 3).join(", ") + ", and " + (names.length - 3) + " more";
    }
    var comma = names.some(function (name) {
      return name.indexOf(" and ") !== -1;
    })
      ? ","
      : "";
    return names.slice(0, -1).join(", ") + comma + " or " + names[names.length - 1];
  }

  // American style: a terminal period belongs inside the closing quotation
  // mark, and the search clause is the one that can end the phrase on a quote.
  function sentence(phrase) {
    return phrase.slice(-1) === '"' ? phrase.slice(0, -1) + '."' : phrase + ".";
  }

  // Category names are sentence case ("Information technology") and not one of
  // the ten is a proper noun or starts with an acronym, so this is safe.
  function lowerFirst(name) {
    return name.charAt(0).toLowerCase() + name.slice(1);
  }

  // "new opportunities in information technology from the Department of Health
  // that mention "network"". Shared by the summary line and the confirmation so
  // the two cannot drift apart. The status radio is deliberately not read: you
  // subscribe to what gets posted, and "open and closed" is a browsing choice.
  function criteriaPhrase() {
    var categories = selectedNames(state.categories, model.categories);
    var agencies = selectedNames(state.agencies, model.agencies);
    var search = el.search.value.trim();

    if (!categories.length && !agencies.length && !search) {
      return "every new opportunity the state posts";
    }

    var phrase = "new opportunities";
    if (categories.length) {
      phrase += " in " + nameList(categories.map(lowerFirst));
    }
    if (agencies.length) {
      phrase += " from " + nameList(agencies.map(function (name) {
        return "the " + name;
      }));
    }
    if (search) {
      phrase += ' that mention "' + search + '"';
    }
    return phrase;
  }

  // Where a real feed would live. Nothing serves it. The point of showing it is
  // that it visibly carries the same filters the summary sentence describes.
  function rssUrl() {
    var params = new URLSearchParams();
    selectedIds(state.agencies).forEach(function (id) {
      params.append("agency", id);
    });
    selectedIds(state.categories).forEach(function (id) {
      params.append("category", id);
    });
    var search = el.search.value.trim();
    if (search) params.set("q", search);
    var query = params.toString();
    return "https://bids.example.gov/opportunities.xml" + (query ? "?" + query : "");
  }

  function renderSubscribe() {
    if (subscribed) return;
    el.subscribeSummary.textContent =
      "You'll get updates about " + sentence(criteriaPhrase());
    el.rssUrl.value = rssUrl();
  }

  // Replaces the whole body, summary included: a live-updating sentence left
  // sitting above a confirmation would soon describe different filters than
  // the ones actually signed up for.
  function confirmSubscription(address) {
    var node = el.confirmTemplate.content.cloneNode(true);
    node.querySelector("[data-field='text']").textContent =
      "On a real site we would email " + address + " about " +
      sentence(criteriaPhrase()) +
      " This is a demonstration site, so no email is on its way.";
    subscribed = true;
    el.subscribeBody.replaceChildren(node);

    // No second live region (SPEC 8.4) — the confirmation is announced by
    // moving focus to it, and deferred for the same reason as clearFilters.
    window.setTimeout(function () {
      el.subscribeBody.querySelector("[data-field='heading']").focus();
    }, 0);
  }

  function bindSubscribe() {
    el.subscribeForm.addEventListener("submit", function (e) {
      e.preventDefault();
      confirmSubscription(el.subscribeEmail.value.trim());
    });

    el.rssToggle.addEventListener("click", function () {
      var open = el.rssToggle.getAttribute("aria-expanded") === "true";
      el.rssToggle.setAttribute("aria-expanded", open ? "false" : "true");
      el.rssAddress.hidden = open;
      el.rssToggle.textContent = open
        ? "Show the RSS address"
        : "Hide the RSS address";
    });

    RFP.tooltip.bind(el.subscribe);
  }

  // --- render -------------------------------------------------------------

  function render() {
    var records = model.solicitations.filter(matches).sort(compare);

    el.count.textContent = countText(records.length);

    // Before the branch: an empty result set is the moment a subscription is
    // worth the most, so the summary has to be current there too.
    renderSubscribe();

    if (records.length === 0) {
      var empty = el.noResultsTemplate.content.cloneNode(true);
      empty.querySelector("[data-field='clear']").addEventListener("click", clearFilters);
      el.list.replaceChildren(empty);
    } else {
      el.list.replaceChildren.apply(el.list, records.map(buildRow));

      // Rows are new DOM every render; their tooltips need binding (SPEC 8.6).
      RFP.tooltip.bind(el.list);
    }

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
    // Nothing loaded, so there is nothing to subscribe to — and an unbound
    // form would submit and reload the page.
    el.subscribe.hidden = true;
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
        bindSubscribe();
        render();
      })
      .catch(showError);
  }

  document.addEventListener("DOMContentLoaded", init);

  RFP.list = { init: init };
})();
