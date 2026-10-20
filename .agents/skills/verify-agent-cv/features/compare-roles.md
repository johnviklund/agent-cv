# Compare roles

A visitor opens the comparison workspace, enters one to three job roles (typed or imported from Markdown or JSON), and asks for them side by side against the owner's public evidence. Empty roles are rejected with a message beside the field.

## Sub-features
- `compare-validate` rejects a missing role title or description.
- `compare-submit` sends the roles; without a model key it shows `COMPARISON SERVICE ERROR`.
- `compare-add-remove` adds a third role and removes one.

## How to get to it (user POV)
- The `Compare up to three roles` link on the home page, or the address `/#compare`.

## Driving it with control
Preconditions: baseline.
- **Open.** `control open /#compare` → heading `Read the roles side by side.`, two role forms.
- **Validate.** `control click --role button --name "Compare the evidence"` → `control eval 'document.querySelector("[data-comparison-workspace]").innerText.includes("Enter a role title.")'` is `true`.
- **Fill and submit.** For N in 1 and 2: `control fill --role textbox --name "Role title" --nth N --value "Product Manager N"` and `control fill --role textbox --name "Role description" --nth N --value "<a sentence of 15 or more words>"`; then click `Compare the evidence` → heading `COMPARISON SERVICE ERROR` text `The comparison service is not configured yet.` (no key).
- **Add a role.** `control click --role button --name "Add another role"` → a third set of role fields appears.

## Gotchas
- Two roles are required; one filled role plus one empty role stays in validation.
- The answer table is reachable only with a model key: without one, report the error-path proof and not a comparison result.
- Session storage is unavailable in headless Chromium; the page says so and still works in memory.
