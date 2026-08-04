/* Detail page controller. Exposes RFP.detail. */
(function () {
  "use strict";

  window.RFP = window.RFP || {};

  var root = null;

  // Long text is plain, \n\n-separated. One <p> per chunk, via textContent.
  function paragraphs(container, text) {
    var parts = text.split("\n\n").filter(function (chunk) {
      return chunk.trim() !== "";
    });
    container.replaceChildren.apply(
      container,
      parts.map(function (chunk) {
        var p = document.createElement("p");
        p.textContent = chunk.trim();
        return p;
      })
    );
  }

  function removeSection(node, name) {
    var section = node.querySelector("[data-section='" + name + "']");
    if (section) section.remove();
  }

  function renderMeeting(container, meeting) {
    var when = document.createElement("p");
    when.textContent = RFP.format.dateTime(meeting.datetime);

    var where = document.createElement("p");
    where.textContent = meeting.location;

    var required = document.createElement("p");
    required.textContent = meeting.required
      ? "You must attend this meeting. If you skip it, you cannot bid on this opportunity."
      : "This meeting is optional. You can still bid if you do not attend.";
    if (meeting.required) required.className = "text-bold";

    container.replaceChildren(when, where, required);
  }

  function renderAttachments(list, attachments) {
    var template = document.getElementById("template-attachment");
    var items = attachments.map(function (a) {
      var node = template.content.cloneNode(true);
      var link = node.querySelector("[data-field='link']");
      link.textContent = a.label;
      link.href = "documents/" + a.filename;
      node.querySelector("[data-field='format']").textContent = " (" + a.format + ")";
      return node;
    });
    list.replaceChildren.apply(list, items);
  }

  function renderRecord(model, record) {
    var d = model.derived[record.solicitationNumber];
    var node = document.getElementById("template-detail").content.cloneNode(true);

    document.title = record.title + " — Columbia Bid Opportunities";

    // Status / urgency tag, same rules as the list.
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

    node.querySelector("[data-field='title']").textContent = record.title;

    var numberTrigger = node.querySelector("[data-field='number-trigger']");
    numberTrigger.textContent = "Opportunity #" + record.solicitationNumber;
    numberTrigger.setAttribute("aria-label", 'What does "Opportunity #" mean?');

    // Give each tooltip body a unique id so aria-describedby resolves.
    [
      ["number", "Opportunity #"],
      ["deadline", "Bids due"],
      ["questions", "Questions due"],
      ["category", "Type of work"],
      ["value", "Estimated value"],
      ["term", "Contract length"]
    ].forEach(function (pair) {
      var key = pair[0];
      var trigger = node.querySelector("[data-field='" + key + "-trigger']");
      var tip = node.querySelector("[data-field='" + key + "-tip']");
      if (!trigger || !tip) return;
      var id = "tip-" + key;
      tip.id = id;
      trigger.setAttribute("aria-describedby", id);
      if (key !== "number") {
        trigger.setAttribute("aria-label", 'What does "' + pair[1] + '" mean?');
      }
    });

    var deadlineText = RFP.format.dateTime(record.deadline);
    if (d.isClosingSoon) {
      deadlineText += " " + RFP.format.countdownLabel(d.daysUntilDeadline);
    }
    node.querySelector("[data-field='deadline']").textContent = deadlineText;

    node.querySelector("[data-field='posted']").textContent =
      RFP.format.date(record.postedDate);
    node.querySelector("[data-field='agency']").textContent = d.agencyName;
    node.querySelector("[data-field='category']").textContent = d.categoryName;

    // Optional key-facts rows.
    if (record.questionsDeadline) {
      node.querySelector("[data-field='questions']").textContent =
        RFP.format.dateTime(record.questionsDeadline);
    } else {
      removeSection(node, "questions");
    }

    if (record.estimatedValue) {
      node.querySelector("[data-field='value']").textContent = record.estimatedValue;
    } else {
      removeSection(node, "value");
    }

    if (record.contractTerm) {
      node.querySelector("[data-field='term']").textContent = record.contractTerm;
    } else {
      removeSection(node, "term");
    }

    paragraphs(node.querySelector("[data-field='summary']"), record.summary);
    paragraphs(node.querySelector("[data-field='description']"), record.description);
    paragraphs(node.querySelector("[data-field='submission']"), record.submission);

    // Optional sections: heading and all.
    if (record.eligibility) {
      var panel = node.querySelector("[data-field='eligibility-panel']");
      var button = node.querySelector("[data-field='eligibility-button']");
      var panelId = "eligibility-panel";
      panel.id = panelId;
      button.setAttribute("aria-controls", panelId);
      paragraphs(panel, record.eligibility);
    } else {
      removeSection(node, "eligibility");
    }

    if (record.preBidMeeting) {
      renderMeeting(node.querySelector("[data-field='meeting']"), record.preBidMeeting);
    } else {
      removeSection(node, "meeting");
    }

    if (record.attachments && record.attachments.length) {
      renderAttachments(
        node.querySelector("[data-field='attachments']"),
        record.attachments
      );
    } else {
      removeSection(node, "attachments");
    }

    node.querySelector("[data-field='contact-name']").textContent =
      record.contact.name + ", " + record.contact.title;

    var email = node.querySelector("[data-field='contact-email']");
    email.textContent = record.contact.email;
    email.href = "mailto:" + record.contact.email;

    var phone = node.querySelector("[data-field='contact-phone']");
    phone.textContent = record.contact.phone;
    phone.href = "tel:+1" + record.contact.phone.replace(/\D/g, "");

    root.replaceChildren(node);

    // Rendered after load, so USWDS never saw these tooltips (SPEC 8.6).
    RFP.tooltip.bind(root);
  }

  function renderNotFound() {
    document.title = "Opportunity not found — Columbia Bid Opportunities";
    root.replaceChildren(
      document.getElementById("template-not-found").content.cloneNode(true)
    );
  }

  function showError(error) {
    console.error(error);
    root.replaceChildren(
      document.getElementById("template-error").content.cloneNode(true)
    );
  }

  function init() {
    root = document.getElementById("detail-root");
    var id = new URLSearchParams(window.location.search).get("id");

    if (!id) {
      renderNotFound();
      return;
    }

    RFP.data
      .load()
      .then(function (model) {
        var record = RFP.data.find(model, id);
        if (record) {
          renderRecord(model, record);
        } else {
          renderNotFound();
        }
      })
      .catch(showError);
  }

  document.addEventListener("DOMContentLoaded", init);

  RFP.detail = { init: init };
})();
