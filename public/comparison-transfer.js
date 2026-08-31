import { COMPARISON_CONTRACT } from "./comparison-contract.js";

const COVERAGE_ORDER = Object.freeze(["documented", "transferable", "not_documented"]);

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

export function parseRoleBatch(value, { filename = "" } = {}) {
  if (typeof value !== "string" || !value.trim()) throw new TypeError("Paste role JSON or Markdown first.");
  const source = value.replace(/\r\n?/g, "\n").trim();
  const jsonExpected = /\.json$/i.test(filename) || /^[\[{]/.test(source);
  if (jsonExpected) {
    let parsed;
    try {
      parsed = JSON.parse(source);
    } catch {
      throw new TypeError("The role JSON is invalid.");
    }
    const roles = Array.isArray(parsed) ? parsed : parsed?.roles;
    if (!Array.isArray(parsed) && (!isPlainObject(parsed) || Object.keys(parsed).some((key) => key !== "roles"))) {
      throw new TypeError("Role JSON must be an array or an object containing only roles.");
    }
    return validateImportedRoles(roles);
  }
  return validateImportedRoles(parseMarkdownRoles(source));
}

export function serializeComparisonExport(result, format) {
  if (!result || !Array.isArray(result.roles) || !Array.isArray(result.rows)) {
    throw new TypeError("A completed comparison is required for export.");
  }
  const unmappedByRoleId = new Map(
    (result.unmappedRequirements || []).map(({ roleId, requirements }) => [roleId, [...requirements]]),
  );
  const roles = result.roles.map((role, roleIndex) => {
    const unmappedRequirements = unmappedByRoleId.get(role.id) || [];
    const summary = summarizeRoleRequirements(result.rows, roleIndex, unmappedRequirements);
    return {
      id: role.id,
      position: role.position,
      title: role.title,
      company: role.company,
      requirementSummary: {
        assessed: summary.assessedCount,
        total: summary.requirementTotal,
        documented: summary.coverageCounts.documented,
        transferable: summary.coverageCounts.transferable,
        notDocumented: summary.coverageCounts.not_documented,
        notAssessed: unmappedRequirements.length,
      },
      unmappedRequirements,
    };
  });
  const exported = {
    schemaVersion: result.schemaVersion,
    catalogDigest: result.catalogDigest,
    roles,
    rows: result.rows.map((row) => ({
      id: row.id,
      position: row.position,
      label: row.label,
      cells: row.cells.map((cell) => ({
        id: cell.id,
        roleId: cell.roleId,
        requirement: cell.requirement,
        coverage: cell.coverage,
        evidence: cell.evidence.map(({ evidenceId, reasonCode }) => ({ evidenceId, reasonCode })),
        questions: [...cell.questions],
      })),
    })),
  };
  if (format === "json") return `${JSON.stringify(exported, null, 2)}\n`;
  if (format === "markdown") return comparisonExportMarkdown(exported);
  throw new TypeError("Comparison export format must be markdown or json.");
}

export function summarizeRoleRequirements(rows, roleIndex, unmappedRequirements) {
  const coverageCounts = Object.fromEntries(COVERAGE_ORDER.map((coverage) => [coverage, 0]));
  let assessedCount = 0;
  rows.forEach(({ cells }) => {
    const coverage = cells[roleIndex]?.coverage;
    if (coverage === "not_listed") return;
    assessedCount += 1;
    if (coverage in coverageCounts) coverageCounts[coverage] += 1;
  });
  return {
    assessedCount,
    requirementTotal: assessedCount + unmappedRequirements.length,
    coverageCounts,
  };
}

export function createLatestFileImport({
  maxBytes,
  readFile = (file) => file.text(),
  applySource,
  reportError,
  clearSelection,
} = {}) {
  if (typeof applySource !== "function") throw new TypeError("Latest file import requires applySource.");
  let generation = 0;

  return async function importLatestFile(file) {
    const ownGeneration = ++generation;
    if (!file) return { status: "empty" };

    try {
      if (Number.isFinite(maxBytes) && file.size > maxBytes) {
        throw new TypeError("Keep the import file under 100 KB.");
      }
      const source = await readFile(file);
      if (ownGeneration !== generation) return { status: "superseded" };
      applySource({ file, source });
      return { status: "ready" };
    } catch (error) {
      if (ownGeneration !== generation) return { status: "superseded" };
      reportError?.(error);
      return { status: "error", error };
    } finally {
      if (ownGeneration === generation) clearSelection?.(file);
    }
  };
}

function validateImportedRoles(value) {
  if (!Array.isArray(value)) throw new TypeError("The batch must contain a roles array.");
  value.forEach((role, index) => {
    if (!isPlainObject(role)) throw new TypeError(`Role ${index + 1} must be an object.`);
    const allowed = new Set(["title", "company", "description"]);
    if (Object.keys(role).some((key) => !allowed.has(key))) {
      throw new TypeError(`Role ${index + 1} contains unsupported fields.`);
    }
  });
  const validation = validateRoleDrafts(value);
  if (!validation.valid) {
    const fieldMessage = validation.fieldErrors.flatMap((errors) => Object.values(errors)).find(Boolean);
    throw new TypeError(validation.formError || fieldMessage || "The role batch is invalid.");
  }
  return validation.roles;
}

function parseMarkdownRoles(source) {
  const roleHeadings = [...source.matchAll(/^##[ \t]+Role\s*:\s*(.+?)\s*$/gim)].map((match) => ({
    label: cleanMarkdownLabel(match[1]),
    start: match.index,
    contentStart: match.index + match[0].length,
  }));
  if (!roleHeadings.length) {
    throw new TypeError("Markdown batches need an explicit `## Role: <title>` heading for each role.");
  }
  return roleHeadings.map((heading, index) => {
    const next = roleHeadings[index + 1];
    const body = source.slice(heading.contentStart, next?.start ?? source.length).trim();
    const lines = body.split("\n");
    let company = "";
    let descriptionMarker = -1;
    let inlineDescription = "";
    lines.forEach((line, lineIndex) => {
      const metadata = line.match(/^\s*(?:\*\*)?(company|description)\s*:\s*(?:\*\*)?\s*(.*?)\s*$/i);
      if (!metadata) return;
      if (metadata[1].toLowerCase() === "company") company = cleanMarkdownLabel(metadata[2]);
      else {
        descriptionMarker = lineIndex;
        inlineDescription = metadata[2].trim();
      }
    });
    const descriptionLines = descriptionMarker >= 0
      ? [inlineDescription, ...lines.slice(descriptionMarker + 1)]
      : lines.filter((line) => !/^\s*(?:\*\*)?company(?:\*\*)?\s*:/i.test(line));
    return {
      title: heading.label,
      company,
      description: descriptionLines.join("\n").trim(),
    };
  });
}

function comparisonExportMarkdown(result) {
  const lines = [
    "# Role comparison",
    "",
    `Schema: ${result.schemaVersion}`,
    `Evidence catalog: ${result.catalogDigest}`,
    "",
  ];
  result.roles.forEach((role) => {
    const summary = role.requirementSummary;
    lines.push(
      `## ${escapeMarkdownText(role.title)}${role.company ? ` — ${escapeMarkdownText(role.company)}` : ""}`,
      "",
      `Requirements assessed: ${summary.assessed} of ${summary.total}`,
      `Coverage: ${summary.documented} documented; ${summary.transferable} transferable; ${summary.notDocumented} not documented; ${summary.notAssessed} not assessed.`,
      "",
    );
    if (role.unmappedRequirements.length) {
      lines.push("### Not assessed", "");
      role.unmappedRequirements.forEach((requirement) => lines.push(`- ${escapeMarkdownText(requirement)}`));
      lines.push("");
    }
    result.rows.forEach((row) => {
      const cell = row.cells.find(({ roleId }) => roleId === role.id);
      if (!cell || cell.coverage === "not_listed") return;
      lines.push(
        `### ${row.position}. ${escapeMarkdownText(row.label)}`,
        "",
        `- Requirement: ${escapeMarkdownText(cell.requirement)}`,
        `- Coverage: ${cell.coverage}`,
      );
      if (cell.evidence.length) {
        lines.push(`- Evidence: ${cell.evidence.map(({ evidenceId, reasonCode }) => `${evidenceId} (${reasonCode})`).join(", ")}`);
      }
      cell.questions.forEach((question) => lines.push(`- Interview question: ${escapeMarkdownText(question)}`));
      lines.push("");
    });
  });
  return `${lines.join("\n").trim()}\n`;
}

function escapeMarkdownText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/([\\`*_{}\[\]()#+\-.!|])/g, "\\$1");
}

function cleanSingleLine(value) { return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : ""; }
function cleanMultiline(value) { return typeof value === "string" ? value.replace(/\r\n?/g, "\n").trim() : ""; }
function cleanMarkdownLabel(value) {
  return String(value || "").replace(/^\*\*|\*\*$/g, "").trim();
}
function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
