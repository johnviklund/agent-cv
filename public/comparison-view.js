import { COMPARISON_CONTRACT } from "./comparison-contract.js";
import { createLink } from "./dom.js";
import {
  createLatestFileImport,
  parseRoleBatch,
  serializeComparisonExport,
  summarizeRoleRequirements,
  validateRoleDrafts,
} from "./comparison-transfer.js";

export { parseRoleBatch, serializeComparisonExport, validateRoleDrafts } from "./comparison-transfer.js";

const COVERAGE_COPY = Object.freeze({
  documented: {
    label: "Documented evidence",
    countLabel: "Documented",
    description: "John's public CV or project record directly documents relevant experience.",
  },
  transferable: {
    label: "Transferable evidence",
    countLabel: "Transferable",
    description: "John's public record documents adjacent experience that may transfer to this requirement.",
  },
  not_documented: {
    label: "Not documented yet",
    countLabel: "Not documented",
    description: "The public CV does not document evidence for this requirement. This is not a claim that John lacks the capability.",
  },
  not_listed: {
    label: "Not listed in role",
    countLabel: "Not listed",
    description: "This role does not list the requirement represented by this row.",
  },
  unmapped: {
    label: "Not assessed",
    countLabel: "Not assessed",
    description: "The comparison did not assess this extracted role requirement, so it is not included in any evidence outcome.",
  },
});
const COVERAGE_ORDER = Object.freeze(["documented", "transferable", "not_documented"]);

const REASON_LABELS = Object.freeze({
  direct_responsibility: "Direct responsibility",
  directly_relevant_delivery: "Directly relevant delivery",
  related_domain_experience: "Related domain experience",
  related_technical_exposure: "Related technical exposure",
  analogous_scale_or_context: "Analogous scale or context",
});

const EMPTY_ROLE = Object.freeze({ title: "", company: "", description: "" });
const EVIDENCE_SOURCES = Object.freeze({
  "data/cv.md": Object.freeze({ url: "/cv/", label: "View CV source" }),
  "data/projects.md": Object.freeze({ url: "/projects/", label: "View project source" }),
  "data/overview.md": Object.freeze({ url: "/overview.md", label: "View professional overview" }),
});

export function buildComparisonViewModel(state, evidenceItems = []) {
  const evidenceById = new Map(evidenceItems.map((item) => [item.id, item]));
  const result = state?.result || null;
  const unmappedByRoleId = new Map(
    (result?.unmappedRequirements || []).map(({ roleId, requirements }) => [roleId, [...requirements]]),
  );
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
          const source = EVIDENCE_SOURCES[item.source?.path] || { url: "", label: "View source" };
          return [{
            id: item.id,
            title: item.title,
            contribution: item.text,
            projectStatus: extractProjectStatus(item.text),
            reasonCode: reference.reasonCode,
            reasonLabel: REASON_LABELS[reference.reasonCode] || "Relevant public evidence",
            sourceUrl: source.url,
            sourceLabel: source.label,
          }];
        }),
        questions: [...cell.questions],
      };
    }),
  })) || [];
  const roles = result?.roles?.map((role, roleIndex) => {
    const unmappedRequirements = unmappedByRoleId.get(role.id) || [];
    const summary = summarizeRoleRequirements(rows, roleIndex, unmappedRequirements);
    return {
      ...role,
      assessedCount: summary.assessedCount,
      requirementTotal: summary.requirementTotal,
      unmappedRequirements,
      outcomeCounts: [...COVERAGE_ORDER.map((coverage) => ({
        coverage,
        label: COVERAGE_COPY[coverage].countLabel,
        count: summary.coverageCounts[coverage],
      })), {
        coverage: "unmapped",
        label: COVERAGE_COPY.unmapped.countLabel,
        count: unmappedRequirements.length,
      }],
    };
  }) || [];
  const evidenceLibrary = uniqueEvidence(rows);
  const isStale = Boolean(result && state?.resultStale);
  const assessedTotal = roles.reduce((total, role) => total + role.assessedCount, 0);
  const requirementTotal = roles.reduce((total, role) => total + role.requirementTotal, 0);
  const unmappedTotal = requirementTotal - assessedTotal;
  return {
    status: state?.status || "editing",
    error: state?.error || null,
    storageAvailable: state?.storageAvailable !== false,
    hasResult: Boolean(result),
    isStale,
    resultNotice: isStale
      ? "Showing the last comparison, based on the previous role descriptions. Compare again to refresh it."
      : `Comparison complete: ${assessedTotal} of ${requirementTotal} extracted role requirements assessed; ${unmappedTotal} not assessed.`,
    roles,
    rows,
    evidenceLibrary,
    selection: state?.selection || { rowId: "", roleId: "", cellId: "" },
  };
}

function uniqueEvidence(rows) {
  const items = new Map();
  rows.forEach(({ cells }) => cells.forEach(({ evidence }) => evidence.forEach((item) => {
    if (!items.has(item.id)) items.set(item.id, item);
  })));
  return [...items.values()];
}

export function describeComparisonSelection(row, role) {
  return `Opened details for ${role.title}, ${row.label}.`;
}

export function buildComparisonStatusPresentation(model) {
  const presentation = {
    indicator: "Comparison draft ready for editing.",
    errorLabel: "COMPARISON UNAVAILABLE",
    errorTitle: "Check the role briefs and try again.",
  };

  if (model.error && model.hasResult) {
    presentation.errorLabel = model.isStale
      ? "REFRESH FAILED · PREVIOUS RESULT VISIBLE"
      : "REFRESH FAILED · PREVIOUS RESULT READY";
    presentation.errorTitle = model.isStale
      ? "The previous comparison is visible but no longer current."
      : "The completed comparison remains available.";
  }

  if (model.status === "analyzing") {
    presentation.indicator = "Comparison in progress.";
  } else if (model.error && model.hasResult) {
    presentation.indicator = model.isStale
      ? "Previous comparison visible. The refresh failed, so this result does not reflect the edited role drafts."
      : "Comparison ready. The latest refresh failed, so the previous complete result remains visible.";
  } else if (model.error) {
    presentation.indicator = "Comparison unavailable. Review the message below and try again.";
  } else if (model.isStale) {
    presentation.indicator = "Previous comparison visible. Role drafts changed; compare again for a current result.";
  } else if (model.hasResult) {
    presentation.indicator = "Comparison ready.";
  }

  return presentation;
}

export function createComparisonView({ root, controller, requestMode = () => ({ status: "invalid" }) } = {}) {
  if (!root || !controller) throw new TypeError("Comparison view requires a root and controller.");

  const form = root.querySelector("[data-comparison-form]");
  const editorList = root.querySelector("[data-role-editors]");
  const addButton = root.querySelector("[data-add-role]");
  const submitButton = root.querySelector("[data-compare-submit]");
  const clearButton = root.querySelector("[data-compare-clear]");
  const cancelButton = root.querySelector("[data-compare-cancel]");
  const batchInput = root.querySelector("[data-role-batch]");
  const batchFile = root.querySelector("[data-role-file]");
  const batchImportButton = root.querySelector("[data-import-roles]");
  const batchStatus = root.querySelector("[data-role-batch-status]");
  const formError = root.querySelector("[data-comparison-form-error]");
  const status = root.querySelector("[data-comparison-status]");
  const stateIndicator = root.querySelector("[data-comparison-state]");
  const storageNote = root.querySelector("[data-comparison-storage-note]");
  const resultRegion = root.querySelector("[data-comparison-result]");
  const resultNotice = root.querySelector("[data-comparison-result-notice]");
  const resultTable = root.querySelector("[data-comparison-table]");
  const resultCaption = root.querySelector("[data-comparison-caption]");
  const retryButton = root.querySelector("[data-comparison-retry]");
  const errorBox = root.querySelector("[data-comparison-error]");
  const errorLabel = root.querySelector("[data-comparison-error-label]");
  const errorTitle = root.querySelector("[data-comparison-error-title]");
  const errorCopy = root.querySelector("[data-comparison-error-copy]");
  const unmappedRegion = root.querySelector("[data-comparison-unmapped]");
  const evidenceLibrary = root.querySelector("[data-comparison-evidence-library]");
  const evidenceItems = root.querySelector("[data-comparison-evidence-items]");
  const count = root.querySelector("[data-role-count]");
  let drafts = [emptyRole(), emptyRole()];
  let hydrated = false;
  let latestState = controller.getState();
  let latestModel = buildComparisonViewModel(latestState, controller.getEvidenceItems?.() || []);
  const expandedCellIds = new Set();
  const importLatestRoleFile = createLatestFileImport({
    maxBytes: COMPARISON_CONTRACT.limits.maxBodyBytes * 5,
    applySource: ({ file, source }) => {
      batchInput.value = source;
      applyImportedRoles(parseRoleBatch(source, { filename: file.name }));
    },
    reportError: (error) => {
      batchStatus.textContent = error?.message || "The role file could not be imported.";
    },
    clearSelection: () => {
      batchFile.value = "";
    },
  });

  form?.addEventListener("submit", submit);
  addButton?.addEventListener("click", addRole);
  batchImportButton?.addEventListener("click", importRoleBatch);
  batchFile?.addEventListener("change", importRoleFile);
  batchInput?.addEventListener("input", () => { void importLatestRoleFile(); });
  clearButton?.addEventListener("click", clear);
  cancelButton?.addEventListener("click", () => controller.cancelComparison());
  retryButton?.addEventListener("click", submit);
  editorList?.addEventListener("input", handleEditorInput);
  editorList?.addEventListener("click", handleEditorClick);
  resultTable?.addEventListener("click", handleResultClick);
  root.querySelectorAll("[data-export-comparison]").forEach((button) => {
    button.addEventListener("click", () => downloadComparison(button.dataset.exportComparison));
  });
  root.querySelectorAll("[data-comparison-back]").forEach((control) => {
    control.addEventListener("click", (event) => {
      event.preventDefault();
      requestMode("home");
    });
  });

  function render(state) {
    if (state?.status === "analyzing" && latestState?.status !== "analyzing") expandedCellIds.clear();
    latestState = state;
    if (!hydrated || !sameDrafts(drafts, state.roles)) {
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

  function importRoleBatch() {
    void importLatestRoleFile();
    try {
      const roles = parseRoleBatch(batchInput?.value || "");
      applyImportedRoles(roles);
    } catch (error) {
      batchStatus.textContent = error?.message || "The role batch could not be imported.";
    }
  }

  async function importRoleFile() {
    const file = batchFile?.files?.[0];
    await importLatestRoleFile(file);
  }

  function applyImportedRoles(roles) {
    drafts = roles.map((role) => ({ ...role }));
    setControllerRoles(drafts);
    renderEditors({ focusIndex: 0 });
    batchStatus.textContent = `${roles.length} ${roles.length === 1 ? "role" : "roles"} imported. Review the briefs, then compare.`;
    announce(`${roles.length} ${roles.length === 1 ? "role" : "roles"} imported.`);
  }

  function downloadComparison(format) {
    if (!latestState.result) return;
    try {
      const content = serializeComparisonExport(latestState.result, format);
      const extension = format === "markdown" ? "md" : "json";
      const type = format === "markdown" ? "text/markdown;charset=utf-8" : "application/json;charset=utf-8";
      const url = URL.createObjectURL(new Blob([content], { type }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `john-viklund-role-comparison.${extension}`;
      link.click();
      URL.revokeObjectURL(url);
      announce(`Comparison exported as ${format === "markdown" ? "Markdown" : "JSON"}.`);
    } catch {
      announce("The comparison export could not be created.");
    }
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
    const outcome = await controller.submitComparison(validation.roles, { source: "manual" });
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
    void importLatestRoleFile();
    controller.clearComparison();
    if (batchInput) batchInput.value = "";
    if (batchFile) batchFile.value = "";
    if (batchStatus) batchStatus.textContent = "";
    drafts = [emptyRole(), emptyRole()];
    hydrated = true;
    renderEditors({ focusIndex: 0 });
    announce("Comparison cleared. Two blank role briefs are ready.");
  }

  function renderChrome() {
    const analyzing = latestModel.status === "analyzing";
    const presentation = buildComparisonStatusPresentation(latestModel);
    submitButton.disabled = analyzing;
    submitButton.textContent = analyzing ? "Reading the briefs…" : "Compare the evidence";
    cancelButton.hidden = !analyzing;
    clearButton.hidden = !latestState.roles?.length && !latestModel.hasResult;
    storageNote.hidden = latestModel.storageAvailable;
    errorBox.hidden = !latestModel.error;
    errorCopy.textContent = latestModel.error?.message || "";
    retryButton.hidden = analyzing;
    if (stateIndicator) stateIndicator.textContent = presentation.indicator;
    errorLabel.textContent = presentation.errorLabel;
    errorTitle.textContent = presentation.errorTitle;
    status.textContent = analyzing ? "Comparing role requirements with John's published evidence." : "";
  }

  function renderResult() {
    resultRegion.hidden = !latestModel.hasResult;
    if (!latestModel.hasResult) {
      resultTable.replaceChildren();
      unmappedRegion?.replaceChildren();
      evidenceItems?.replaceChildren();
      if (unmappedRegion) unmappedRegion.hidden = true;
      if (evidenceLibrary) evidenceLibrary.hidden = true;
      return;
    }
    resultRegion.classList.toggle("is-stale", latestModel.isStale);
    resultNotice.textContent = latestModel.resultNotice;
    resultNotice.classList.toggle("stale-result-notice", latestModel.isStale);
    resultTable.replaceChildren(createTable(latestModel));
    renderUnmappedRequirements(latestModel);
    renderEvidenceLibrary(latestModel);
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
      const headingContent = document.createElement("div");
      headingContent.className = "matrix-role-heading";
      const ordinal = document.createElement("span");
      ordinal.className = "matrix-role-number";
      ordinal.textContent = `ROLE ${String(role.position).padStart(2, "0")}`;
      const title = document.createElement("strong");
      title.textContent = role.title;
      const company = document.createElement("span");
      company.className = "matrix-role-company";
      company.textContent = role.company || "Company not supplied";
      headingContent.append(ordinal, title, company, createOutcomeLedger(role));
      heading.append(headingContent);
      headingRow.append(heading);
    });
    thead.append(headingRow);

    const tbody = document.createElement("tbody");
    model.rows.forEach((row) => {
      const tableRow = document.createElement("tr");
      const rowHeading = document.createElement("th");
      rowHeading.scope = "row";
      rowHeading.className = "requirement-column";
      const theme = document.createElement("div");
      theme.className = "theme-cell-shell";
      const number = document.createElement("span");
      number.className = "matrix-row-number";
      number.textContent = String(row.position).padStart(2, "0");
      const label = document.createElement("span");
      label.textContent = row.label;
      const allExpanded = row.cells.every((cell) => isCellExpanded(cell, model.selection));
      const inspectAll = document.createElement("button");
      inspectAll.type = "button";
      inspectAll.className = "theme-detail-toggle";
      inspectAll.dataset.themeToggle = row.id;
      inspectAll.setAttribute("aria-expanded", String(allExpanded));
      inspectAll.setAttribute("aria-controls", row.cells.map((cell) => `${cell.id}-details`).join(" "));
      inspectAll.setAttribute("aria-label", `${allExpanded ? "Close" : "Inspect"} evidence for all roles in ${row.label}`);
      inspectAll.textContent = allExpanded ? "Close evidence" : "Inspect evidence";
      theme.append(number, label, inspectAll);
      rowHeading.append(theme);
      tableRow.append(rowHeading);
      row.cells.forEach((cell, index) => tableRow.append(createCell(
        row,
        model.roles[index],
        cell,
        isCellExpanded(cell, model.selection),
      )));
      tbody.append(tableRow);
    });
    table.append(caption, thead, tbody);
    return table;
  }

  function createCell(row, role, cell, expanded) {
    const td = document.createElement("td");
    td.dataset.coverage = cell.coverage;
    const shell = document.createElement("div");
    shell.className = "comparison-cell-shell";
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
    button.textContent = expanded ? "Close evidence" : "Inspect evidence";
    const panel = createCellPanel(cell);
    panel.hidden = !expanded;
    shell.append(badge, summary, panel, button);
    td.append(shell);
    return td;
  }

  function createOutcomeLedger(role) {
    const ledger = document.createElement("div");
    ledger.className = "role-outcome-ledger";
    ledger.setAttribute("role", "group");
    ledger.setAttribute("aria-label", `Theme outcomes for ${role.title}`);
    const title = document.createElement("span");
    title.className = "role-outcome-title";
    title.textContent = `${role.assessedCount} of ${role.requirementTotal} requirements assessed`;
    const list = document.createElement("dl");
    role.outcomeCounts.forEach((outcome) => {
      const item = document.createElement("div");
      item.className = "role-outcome-item";
      item.dataset.coverage = outcome.coverage;
      const label = document.createElement("dt");
      label.textContent = outcome.label;
      const count = document.createElement("dd");
      count.textContent = `${outcome.count} / ${role.requirementTotal}`;
      item.append(label, count);
      list.append(item);
    });
    ledger.append(title, list);
    return ledger;
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
    cell.evidence.forEach((evidence) => panel.append(createEvidenceReference(evidence)));
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

  function createEvidenceReference(evidence) {
    const reference = document.createElement("p");
    reference.className = "comparison-evidence-reference";
    const reason = document.createElement("span");
    reason.textContent = `${evidence.reasonLabel}: `;
    const link = createLink(`${evidence.title} · ${evidence.id}`, `#${evidenceDomId(evidence.id)}`);
    reference.append(reason, link);
    return reference;
  }

  function createEvidence(evidence) {
    const article = document.createElement("article");
    article.className = "comparison-evidence";
    article.id = evidenceDomId(evidence.id);
    const heading = document.createElement("h4");
    heading.textContent = evidence.title;
    const evidenceId = document.createElement("p");
    evidenceId.className = "evidence-id";
    evidenceId.textContent = evidence.id;
    const contribution = document.createElement("p");
    contribution.className = "evidence-contribution";
    contribution.textContent = evidence.contribution;
    article.append(heading, evidenceId);
    if (evidence.projectStatus) {
      const projectStatus = document.createElement("p");
      projectStatus.className = "evidence-status";
      projectStatus.textContent = `Project status: ${evidence.projectStatus}`;
      article.append(projectStatus);
    }
    article.append(contribution);
    if (evidence.sourceUrl) {
      const link = createLink(`${evidence.sourceLabel} ↗`, evidence.sourceUrl);
      article.append(link);
    }
    return article;
  }

  function renderUnmappedRequirements(model) {
    const roles = model.roles.filter(({ unmappedRequirements }) => unmappedRequirements.length);
    unmappedRegion.replaceChildren();
    unmappedRegion.hidden = !roles.length;
    if (!roles.length) return;
    const heading = document.createElement("h3");
    heading.textContent = "Requirements not assessed";
    const note = document.createElement("p");
    note.textContent = "These extracted requirements are included in the denominator but were not assigned an evidence outcome. They need manual review or a new comparison.";
    unmappedRegion.append(heading, note);
    roles.forEach((role) => {
      const section = document.createElement("section");
      const title = document.createElement("h4");
      title.textContent = role.title;
      const list = document.createElement("ul");
      role.unmappedRequirements.forEach((requirement) => {
        const item = document.createElement("li");
        item.textContent = requirement;
        list.append(item);
      });
      section.append(title, list);
      unmappedRegion.append(section);
    });
  }

  function renderEvidenceLibrary(model) {
    evidenceItems.replaceChildren();
    evidenceLibrary.hidden = !model.evidenceLibrary.length;
    model.evidenceLibrary.forEach((evidence) => evidenceItems.append(createEvidence(evidence)));
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
    const themeToggle = event.target.closest?.("[data-theme-toggle]");
    if (themeToggle) {
      toggleThemeDetails(themeToggle);
      return;
    }
    const toggle = event.target.closest?.("[data-cell-toggle]");
    if (!toggle) return;
    const expanded = toggle.getAttribute("aria-expanded") === "true";
    if (expanded) {
      expandedCellIds.delete(toggle.dataset.cellToggle);
      if (latestModel.selection.cellId === toggle.dataset.cellToggle) {
        controller.selectComparisonCell({ rowId: "", roleId: "", cellId: "" });
      } else {
        renderResult();
      }
      refocus(`[data-cell-toggle="${toggle.dataset.cellToggle}"]`);
      return;
    }
    const row = latestModel.rows.find(({ cells }) => cells.some(({ id }) => id === toggle.dataset.cellToggle));
    const cell = row?.cells.find(({ id }) => id === toggle.dataset.cellToggle);
    const role = latestModel.roles.find(({ id }) => id === cell?.roleId);
    if (row && role && cell) {
      expandedCellIds.add(cell.id);
      controller.selectComparisonCell({ rowId: row.id, roleId: role.id, cellId: cell.id });
      root.querySelector(`#${cell.id}-details`)?.focus({ preventScroll: true });
      announce(describeComparisonSelection(row, role));
    }
  }

  function toggleThemeDetails(toggle) {
    const row = latestModel.rows.find(({ id }) => id === toggle.dataset.themeToggle);
    if (!row) return;
    const expanded = toggle.getAttribute("aria-expanded") === "true";
    row.cells.forEach((cell) => {
      if (expanded) expandedCellIds.delete(cell.id);
      else expandedCellIds.add(cell.id);
    });
    const selectionInRow = row.cells.some(({ id }) => id === latestModel.selection.cellId);
    if (expanded && selectionInRow) {
      controller.selectComparisonCell({ rowId: "", roleId: "", cellId: "" });
    } else {
      renderResult();
    }
    refocus(`[data-theme-toggle="${row.id}"]`);
    announce(`${expanded ? "Closed" : "Opened"} evidence for all roles in ${row.label}.`);
  }

  function isCellExpanded(cell, selection) {
    return expandedCellIds.has(cell.id) || selection?.cellId === cell.id;
  }

  function refocus(selector) {
    requestAnimationFrame(() => root.querySelector(selector)?.focus({ preventScroll: true }));
  }

  function announce(message) {
    status.textContent = "";
    requestAnimationFrame(() => { status.textContent = message; });
  }

  renderEditors();
  renderChrome();
  return {
    render,
    getDrafts: () => drafts.map((role) => ({ ...role })),
    focusComparisonResult,
    focusComparisonCell,
  };

  function focusComparisonResult() {
    resultCaption?.focus({ preventScroll: true });
  }

  function focusComparisonCell(selection) {
    const panel = selection?.cellId
      ? root.querySelector(`#${selection.cellId}-details`)
      : null;
    panel?.focus({ preventScroll: true });
    panel?.scrollIntoView?.({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }

  function setControllerRoles(roles) {
    return controller.setRoles(roles);
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

function evidenceDomId(value) {
  return `comparison-evidence-${String(value).replace(/[^a-z0-9_-]/gi, "-")}`;
}
