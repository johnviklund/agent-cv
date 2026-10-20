# Site pages

A visitor reads the home page, the full CV, the contact page and the privacy page, reaches the admin sign-in, and sees a friendly page for unknown paths. Every page ends with a footer linking to Agent CV.

## Sub-features
- `home` shows the hero, the question box, proof points and selected work.
- `cv` shows the full CV with a PDF link.
- `contact` shows the contact links.
- `admin` shows a token field and a `Load` button.
- `not-found` shows the 404 page.

## How to get to it (user POV)
- Type the address: `/`, `/cv/`, `/contact/`, `/privacy/`, `/admin/`, or any unknown path.
- Use the header links `Experience`, `Projects`, `About`, `Full CV`, `Contact`.

## Driving it with control
Preconditions: baseline.
- **Home.** `control open /` → heading `Ask my agent.`, button `Send question`, last link `Built with Agent CV`.
- **CV.** `control open /cv/` → title `Full CV — <owner name>`, heading `Curriculum vitae.`
- **Contact.** `control open /contact/` → heading `Contact <owner> directly.`
- **Admin.** `control open /admin/` → heading `Conversation archive.`, field `Paste token for this session`, button `Load`.
- **Not found.** `control open /nope/` then `control eval 'document.querySelector("h1").innerText'` → `This path ends here.`
- **Navigate by click.** `control click --role link --name "Full CV"` → URL ends `/cv/`.

## Gotchas
- Names include the owner's name, so match on a stable part (`Ask about`) instead of the full label.
- The admin page needs a token to show data: without one, only the sign-in form is reachable.
