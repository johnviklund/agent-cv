import { COMPARISON_CONTRACT } from "./comparison-contract.js";

const COVERAGE_COPY = Object.freeze({
  documented: {
    label: "Documented evidence",
    description: "John's public CV or project record directly documents relevant experience.",
  },
  transferable: {
    label: "Transferable evidence",
    description: "John's public record documents adjacent experience that may transfer to this requirement.",
  },
  not_documented: {
    label: "Not documented yet",
    description: "The public CV does not document evidence for this requirement. This is not a claim that John lacks the capability.",
  },
  not_listed: {
    label: "Not listed in role",
    description: "This role does not list the requirement represented by this row.",
  },
});

const REASON_LABELS = Object.freeze({
  direct_responsibility: "Direct responsibility",
  directly_relevant_delivery: "Directly relevant delivery",
  related_domain_experience: "Related domain experience",
  related_technical_exposure: "Related technical exposure",
  analogous_scale_or_context: "Analogous scale or context",
});

const EMPTY_ROLE = Object.freeze({ title: "", company: "", description: "" });

export function validateRoleDrafts(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 3) {
    return { valid: false, roles: [], fieldErrors: [], formError: "Compare one to three roles." };
  }

  const limits = COMPARISON_CONTRACT.limits;
  let combined = 0;
  const fieldErrors = [];
  const roles = value.map((role) => {
    const title = cleanSingleLine(role?.title);
    const company = cleanSingleLine(role?.company);
    const description = cleanMultiline(role?.description);
    combined += title.length + company.length + description.length;
    fieldErrors.push({
      title: !title
        ? "Enter a role title."
        : title.length > limits.maxTitleCharacters
          ? `Keep the title to ${limits.maxTitleCharacters} characters or fewer.`
          : "",
      company: company.length > limits.maxCompanyCharacters
        ? `Keep the company to ${limits.maxCompanyCharacters} characters or fewer.`
        : "",
      description: !description
        ? "Paste the role description."
        : description.length > limits.maxDescriptionCharacters
          ? `Keep the description to ${limits.maxDescriptionCharacters.toLocaleString("en")} characters or fewer.`
          : "",
    });
    return { title, company, description };
  });
  const formError = combined > limits.maxCombinedRoleCharacters
    ? `Keep the combined role text to ${limits.maxCombinedRoleCharacters.toLocaleString("en")} characters or fewer.`
    : "";
  const valid = !formError && fieldErrors.every((errors) => Object.values(errors).every((message) => !message));
  return { valid, roles, fieldErrors, formError };
}

export function buildComparisonViewModel(state, evidenceItems = []) {
  const evidenceById = new Map(evidenceItems.map((item) => [item.id, item]));
  const result = state?.result || null;
  const roles = result?.roles?.map((role) => ({ ...role })) || [];
  const rows = result?.rows?.map((row) => ({
    id: row.id,
    position: row.position,
    label: row.label,
    cells: row.cells.map((cell) => {
      const coverage = COVERAGE_COPY[cell.coverage] || {
        label: "Coverage unavailable",
        description: "Coverage information is unavailable.",
      };
      return {
        id: cell.id,
        roleId: cell.roleId,
        requirement: cell.requirement,
        coverage: cell.coverage,
        coverageLabel: coverage.label,
        coverageDescription: coverage.description,
        evidence: cell.evidence.flatMap((reference) => {
          const item = evidenceById.get(reference.evidenceId);
          if (!item) return [];
          return [{
            id: item.id,
            title: item.title,
            contribution: item.text,
            projectStatus: extractProjectStatus(item.text),
            reasonCode: reference.reasonCode,
            reasonLabel: REASON_LABELS[reference.reasonCode] || "Relevant public evidence",
            sourceUrl: sourceUrl(item.source?.path),
            sourceLabel: sourceLabel(item.source?.path),
          }];
        }),
        questions: [...cell.questions],
      };
    }),
  })) || [];
  const isStale = Boolean(result && state?.resultStale);
  return {
    status: state?.status || "editing",
    error: state?.error || null,
    storageAvailable: state?.storageAvailable !== false,
    hasResult: Boolean(result),
    isStale,
    resultNotice: isStale
      ? "Showing the last comparison, based on the previous role descriptions. Compare again to refresh it."
      : "Comparison grounded in John's published CV and project evidence.",
    roles,
    rows,
    selection: state?.selection || { rowId: "", roleId: "", cellId: "" },
  };
}

export function describeComparisonSelection(row, role) {
  return `Opened details for ${role.title}, ${row.label}.`;
}

export function createComparisonView({ root, controller, requestMode = () => ({ status: "invalid" }) } = {}) {
  if (!root || !controller) throw new TypeError("Comparison view requires a root and controller.");

  const form = root.querySelector("[data-comparison-form]");
  const editorList = root.querySelector("[data-role-editors]");
  const addButton = root.querySelector("[data-add-role]");
  const submitButton = root.querySelector("[data-compare-submit]");
  const clearButton = root.querySelector("[data-compare-clear]");
  const cancelButton = root.querySelector("[data-compare-cancel]");
  const formError = root.querySelector("[data-comparison-form-error]");
  const status = root.querySelector("[data-comparison-status]");
  const storageNote = root.querySelector("[data-comparison-storage-note]");
  const resultRegion = root.querySelector("[data-comparison-result]");
  const resultNotice = root.querySelector("[data-comparison-result-notice]");
  const resultTable = root.querySelector("[data-comparison-table]");
  const resultCaption = root.querySelector("[data-comparison-caption]");
  const retryButton = root.querySelector("[data-comparison-retry]");
  const errorBox = root.querySelector("[data-comparison-error]");
  const errorCopy = root.querySelector("[data-comparison-error-copy]");
  const count = root.querySelector("[data-role-count]");
  let drafts = [emptyRole(), emptyRole()];
  let hydrated = false;
  let latestState = controller.getState();
  let latestModel = buildComparisonViewModel(latestState, controller.getEvidenceItems?.() || []);
  let localUpdate = false;

  form?.addEventListener("submit", submit);
  addButton?.addEventListener("click", addRole);
  clearButton?.addEventListener("click", clear);
  cancelButton?.addEventListener("click", () => controller.cancelComparison());
  retryButton?.addEventListener("click", submit);
  editorList?.addEventListener("input", handleEditorInput);
  editorList?.addEventListener("click", handleEditorClick);
  resultTable?.addEventListener("click", handleResultClick);
  root.querySelectorAll("[data-comparison-back]").forEach((control) => {
    control.addEventListener("click", (event) => {
      event.preventDefault();
      requestMode("home");
    });
  });

  function render(state) {
    latestState = state;
    if (!hydrated || (!localUpdate && !sameDrafts(drafts, state.roles))) {
      drafts = state.roles?.length ? state.roles.map((role) => ({ ...role })) : [emptyRole(), emptyRole()];
      hydrated = true;
      renderEditors();
    }
    latestModel = buildComparisonViewModel(state, controller.getEvidenceItems?.() || []);
    renderChrome();
    renderResult();
  }

  function renderEditors({ focusIndex = -1 } = {}) {
    editorList.replaceChildren();
    drafts.forEach((role, index) => editorList.append(createRoleEditor(role, index, drafts.length)));
    count.textContent = `${drafts.length} of 3 roles`;
    addButton.hidden = drafts.length >= 3;
    if (focusIndex >= 0) editorList.querySelector(`[data-role-index="${focusIndex}"][data-role-field="title"]`)?.focus();
  }

  function createRoleEditor(role, index, roleCount) {
    const fieldset = document.createElement("fieldset");
    fieldset.className = "role-editor";
    fieldset.dataset.roleEditor = String(index);
    const legend = document.createElement("legend");
    legend.textContent = `Role ${String(index + 1).padStart(2, "0")}`;
    fieldset.append(legend);

    const heading = document.createElement("div");
    heading.className = "role-editor-heading";
    const ordinal = document.createElement("span");
    ordinal.textContent = index === 0 ? "PRIMARY BRIEF" : "COMPARISON BRIEF";
    heading.append(ordinal);
    if (roleCount > 1) {
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "role-remove";
      remove.dataset.removeRole = String(index);
      remove.textContent = "Remove role";
      remove.setAttribute("aria-label", `Remove role ${index + 1}`);
      heading.append(remove);
    }
    fieldset.append(heading);

    fieldset.append(
      createField(index, "title", "Role title", role.title, "e.g. Director of AI Product", true),
      createField(index, "company", "Company", role.company, "Optional", false),
      createField(index, "description", "Role description", role.description, "Paste the responsibilities and requirements", true, true),
    );
    return fieldset;
  }

  function createField(index, name, labelText, value, placeholder, required, multiline = false) {
    const wrap = document.createElement("div");
    wrap.className = `comparison-field${multiline ? " comparison-field-wide" : ""}`;
    const id = `comparison-role-${index + 1}-${name}`;
    const errorId = `${id}-error`;
    const label = document.createElement("label");
    label.htmlFor = id;
    label.textContent = labelText;
    const control = document.createElement(multiline ? "textarea" : "input");
    control.id = id;
    control.name = `roles[${index}][${name}]`;
    control.dataset.roleIndex = String(index);
    control.dataset.roleField = name;
    control.value = value;
    control.placeholder = placeholder;
    control.required = required;
    control.maxLength = COMPARISON_CONTRACT.limits[`max${capitalize(name)}Characters`];
    control.setAttribute("aria-describedby", errorId);
    if (multiline) control.rows = 8;
    const error = document.createElement("p");
    error.id = errorId;
    error.className = "field-error";
    error.dataset.fieldError = `${index}:${name}`;
    wrap.append(label, control, error);
    return wrap;
  }

  function handleEditorInput(event) {
    const control = event.target.closest?.("[data-role-field]");
    if (!control) return;
    const index = Number(control.dataset.roleIndex);
    const name = control.dataset.roleField;
    drafts[index][name] = control.value;
    clearFieldError(index, name);
    formError.textContent = "";
    try {
      setControllerRoles(drafts);
    } catch {
      formError.textContent = "The combined role text is too long. Shorten one or more descriptions.";
    }
  }

  function handleEditorClick(event) {
    const remove = event.target.closest?.("[data-remove-role]");
    if (!remove || drafts.length <= 1) return;
    const index = Number(remove.dataset.removeRole);
    drafts.splice(index, 1);
    setControllerRoles(drafts);
    renderEditors({ focusIndex: Math.max(0, index - 1) });
    announce(`Role ${index + 1} removed. ${drafts.length} ${drafts.length === 1 ? "role remains" : "roles remain"}.`);
  }

  function addRole() {
    if (drafts.length >= 3) return;
    drafts.push(emptyRole());
    setControllerRoles(drafts);
    renderEditors({ focusIndex: drafts.length - 1 });
    announce(`Role ${drafts.length} added.`);
  }

  async function submit(event) {
    event?.preventDefault?.();
    const validation = validateRoleDrafts(drafts);
    showValidation(validation);
    if (!validation.valid) {
      editorList.querySelector("[aria-invalid=true]")?.focus();
      announce("Check the role details before comparing.");
      return;
    }
    let outcome;
    localUpdate = true;
    try {
      outcome = await controller.submitComparison(validation.roles, { source: "manual" });
    } finally {
      localUpdate = false;
    }
    if (outcome.status === "ready") {
      resultCaption.focus({ preventScroll: true });
      announce(`Comparison ready for ${validation.roles.length} ${validation.roles.length === 1 ? "role" : "roles"}.`);
    } else if (outcome.status === "error") {
      errorBox.focus({ preventScroll: true });
    }
  }

  function showValidation(validation) {
    formError.textContent = validation.formError;
    validation.fieldErrors.forEach((errors, index) => {
      for (const [name, message] of Object.entries(errors)) {
        const control = editorList.querySelector(`[data-role-index="${index}"][data-role-field="${name}"]`);
        const error = editorList.querySelector(`[data-field-error="${index}:${name}"]`);
        if (control) control.setAttribute("aria-invalid", message ? "true" : "false");
        if (error) error.textContent = message;
      }
    });
  }

  function clearFieldError(index, name) {
    const control = editorList.querySelector(`[data-role-index="${index}"][data-role-field="${name}"]`);
    const error = editorList.querySelector(`[data-field-error="${index}:${name}"]`);
    control?.removeAttribute("aria-invalid");
    if (error) error.textContent = "";
  }

  function clear() {
    controller.clearComparison();
    drafts = [emptyRole(), emptyRole()];
    hydrated = true;
    renderEditors({ focusIndex: 0 });
    announce("Comparison cleared. Two blank role briefs are ready.");
  }

  function renderChrome() {
    const analyzing = latestModel.status === "analyzing";
    submitButton.disabled = analyzing;
    submitButton.textContent = analyzing ? "Reading the briefs…" : "Compare the evidence";
    cancelButton.hidden = !analyzing;
    clearButton.hidden = !latestState.roles?.length && !latestModel.hasResult;
    storageNote.hidden = latestModel.storageAvailable;
    errorBox.hidden = !latestModel.error;
    errorCopy.textContent = latestModel.error?.message || "";
    retryButton.hidden = analyzing;
    status.textContent = analyzing ? "Comparing role requirements with John's published evidence." : "";
  }

  function renderResult() {
    resultRegion.hidden = !latestModel.hasResult;
    if (!latestModel.hasResult) {
      resultTable.replaceChildren();
      return;
    }
    resultRegion.classList.toggle("is-stale", latestModel.isStale);
    resultNotice.textContent = latestModel.resultNotice;
    resultNotice.classList.toggle("stale-result-notice", latestModel.isStale);
    resultTable.replaceChildren(createTable(latestModel));
  }

  function createTable(model) {
    const table = document.createElement("table");
    table.className = "comparison-matrix";
    table.style.minWidth = `${220 + (model.roles.length * 280)}px`;
    const caption = document.createElement("caption");
    caption.textContent = "Role requirements compared with John's documented public evidence";
    const thead = document.createElement("thead");
    const headingRow = document.createElement("tr");
    const corner = document.createElement("th");
    corner.scope = "col";
    corner.className = "requirement-column";
    corner.textContent = "Requirement theme";
    headingRow.append(corner);
    model.roles.forEach((role) => {
      const heading = document.createElement("th");
      heading.scope = "col";
      const ordinal = document.createElement("span");
      ordinal.className = "matrix-role-number";
      ordinal.textContent = `ROLE ${String(role.position).padStart(2, "0")}`;
      const title = document.createElement("strong");
      title.textContent = role.title;
      const company = document.createElement("span");
      company.textContent = role.company || "Company not supplied";
      heading.append(ordinal, title, company);
      headingRow.append(heading);
    });
    thead.append(headingRow);

    const tbody = document.createElement("tbody");
    model.rows.forEach((row) => {
      const tableRow = document.createElement("tr");
      const rowHeading = document.createElement("th");
      rowHeading.scope = "row";
      rowHeading.className = "requirement-column";
      const number = document.createElement("span");
      number.className = "matrix-row-number";
      number.textContent = String(row.position).padStart(2, "0");
      const label = document.createElement("span");
      label.textContent = row.label;
      rowHeading.append(number, label);
      tableRow.append(rowHeading);
      row.cells.forEach((cell, index) => tableRow.append(createCell(
        row,
        model.roles[index],
        cell,
        model.selection.cellId === cell.id,
      )));
      tbody.append(tableRow);
    });
    table.append(caption, thead, tbody);
    return table;
  }

  function createCell(row, role, cell, expanded) {
    const td = document.createElement("td");
    td.dataset.coverage = cell.coverage;
    const badge = document.createElement("span");
    badge.className = "coverage-badge";
    badge.textContent = cell.coverageLabel;
    const summary = document.createElement("p");
    summary.className = "coverage-summary";
    summary.textContent = cell.requirement || cell.coverageDescription;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "cell-detail-toggle";
    button.dataset.cellToggle = cell.id;
    button.setAttribute("aria-expanded", String(expanded));
    button.setAttribute("aria-controls", `${cell.id}-details`);
    button.setAttribute(
      "aria-label",
      `${expanded ? "Close" : "Inspect"} details for ${role.title}, ${row.label}`,
    );
    button.textContent = expanded ? "Close details" : "Inspect evidence";
    const panel = createCellPanel(cell);
    panel.hidden = !expanded;
    td.append(badge, summary, button, panel);
    return td;
  }

  function createCellPanel(cell) {
    const panel = document.createElement("div");
    panel.id = `${cell.id}-details`;
    panel.className = "cell-detail-panel";
    panel.tabIndex = -1;
    const stateTitle = document.createElement("h4");
    stateTitle.textContent = "Coverage reading";
    const stateCopy = document.createElement("p");
    stateCopy.textContent = cell.coverageDescription;
    panel.append(stateTitle, stateCopy);
    if (cell.requirement) {
      const title = document.createElement("h4");
      title.textContent = "Role wording";
      const wording = document.createElement("blockquote");
      wording.textContent = cell.requirement;
      panel.append(title, wording);
    }
    cell.evidence.forEach((evidence) => panel.append(createEvidence(evidence)));
    if (cell.questions.length) {
      const title = document.createElement("h4");
      title.textContent = "Questions to ask John";
      const list = document.createElement("ul");
      list.className = "comparison-question-list";
      cell.questions.forEach((question) => {
        const item = document.createElement("li");
        const copy = document.createElement("span");
        copy.textContent = question;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "question-copy";
        button.dataset.copyQuestion = question;
        button.textContent = "Copy";
        button.setAttribute("aria-label", `Copy question: ${question}`);
        item.append(copy, button);
        list.append(item);
      });
      const note = document.createElement("p");
      note.className = "question-note";
      note.textContent = "Questions are suggestions only. Copying does not send them to chat.";
      panel.append(title, list, note);
    }
    return panel;
  }

  function createEvidence(evidence) {
    const article = document.createElement("article");
    article.className = "comparison-evidence";
    const eyebrow = document.createElement("p");
    eyebrow.className = "evidence-reason";
    eyebrow.textContent = evidence.reasonLabel;
    const heading = document.createElement("h4");
    heading.textContent = evidence.title;
    const contribution = document.createElement("p");
    contribution.className = "evidence-contribution";
    contribution.textContent = evidence.contribution;
    article.append(eyebrow, heading);
    if (evidence.projectStatus) {
      const projectStatus = document.createElement("p");
      projectStatus.className = "evidence-status";
      projectStatus.textContent = `Project status: ${evidence.projectStatus}`;
      article.append(projectStatus);
    }
    article.append(contribution);
    if (evidence.sourceUrl) {
      const link = document.createElement("a");
      link.href = evidence.sourceUrl;
      link.textContent = `${evidence.sourceLabel} ↗`;
      article.append(link);
    }
    return article;
  }

  async function handleResultClick(event) {
    const copy = event.target.closest?.("[data-copy-question]");
    if (copy) {
      try {
        await navigator.clipboard.writeText(copy.dataset.copyQuestion);
        copy.textContent = "Copied";
        announce("Question copied. It has not been sent anywhere.");
      } catch {
        announce("Copy failed. Select the question text and copy it manually.");
      }
      return;
    }
    const toggle = event.target.closest?.("[data-cell-toggle]");
    if (!toggle) return;
    const panel = root.querySelector(`#${toggle.getAttribute("aria-controls")}`);
    const expanded = toggle.getAttribute("aria-expanded") === "true";
    if (expanded) {
      controller.selectComparisonCell({ rowId: "", roleId: "", cellId: "" });
      root.querySelector(`[data-cell-toggle="${toggle.dataset.cellToggle}"]`)?.focus({ preventScroll: true });
      return;
    }
    const row = latestModel.rows.find(({ cells }) => cells.some(({ id }) => id === toggle.dataset.cellToggle));
    const cell = row?.cells.find(({ id }) => id === toggle.dataset.cellToggle);
    const role = latestModel.roles.find(({ id }) => id === cell?.roleId);
    if (row && role && cell) {
      controller.selectComparisonCell({ rowId: row.id, roleId: role.id, cellId: cell.id });
      root.querySelector(`#${cell.id}-details`)?.focus({ preventScroll: true });
      announce(describeComparisonSelection(row, role));
    }
  }

  function announce(message) {
    status.textContent = "";
    requestAnimationFrame(() => { status.textContent = message; });
  }

  renderEditors();
  renderChrome();
  return { render, getDrafts: () => drafts.map((role) => ({ ...role })) };

  function setControllerRoles(roles) {
    localUpdate = true;
    try {
      return controller.setRoles(roles);
    } finally {
      localUpdate = false;
    }
  }
}

function emptyRole() { return { ...EMPTY_ROLE }; }
function cleanSingleLine(value) { return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : ""; }
function cleanMultiline(value) { return typeof value === "string" ? value.replace(/\r\n?/g, "\n").trim() : ""; }
function capitalize(value) { return `${value[0].toUpperCase()}${value.slice(1)}`; }
function sameDrafts(first, second) {
  return JSON.stringify(first.map(normalizedDraft)) === JSON.stringify((second || []).map(normalizedDraft));
}
function normalizedDraft(role) {
  return {
    title: cleanSingleLine(role?.title),
    company: cleanSingleLine(role?.company),
    description: cleanMultiline(role?.description),
  };
}

function extractProjectStatus(text) {
  const match = String(text || "").match(/^\*\*Status:\*\*\s*([^\n]+)/i);
  return match?.[1]?.trim() || "";
}

function sourceUrl(path) {
  if (path === "data/cv.md") return "/cv/";
  if (path === "data/projects.md") return "/projects/";
  if (path === "data/overview.md") return "/overview.md";
  return "";
}

function sourceLabel(path) {
  if (path === "data/cv.md") return "View CV source";
  if (path === "data/projects.md") return "View project source";
  if (path === "data/overview.md") return "View professional overview";
  return "View source";
}
