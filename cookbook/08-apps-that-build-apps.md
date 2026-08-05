# 8. Apps that build apps

<!-- tp-doc
lifecycle: live
audited: 2026-07-21
register: none
-->

A mini-app can write a project, package it, sign it with this device's publisher identity,
publish it, and install other people's. That is DevStudio's entire trick, and it is available
to any app that asks for it.

These are the most consequential capabilities in the platform, and the chapter spends its
first page on why before it shows any code.

## Why these grants are different

| Capability | What the app can do |
|---|---|
| `apps:package` | Turn workspace files into a signed `.tpkg` **using this device's publisher identity** |
| `apps:publish` | Announce that package so others can install it |
| `apps:install` | Ask the host to install a package by identifier |
| `apps:preview` | Run a project in the host's dev-preview slot |

The one to think hardest about is `apps:package`. A signature says "this device's publisher
vouches for these bytes" — and an app with this grant can put that signature on bytes the
user has never read. Everything else in the platform is protected by the capability grant;
your publisher reputation is protected by nothing except this dialog.

So every one of these calls raises a **host confirmation**: a modal drawn by host chrome,
outside the mini-app surface, that the app cannot render over, dismiss, style, or
acknowledge. It is auto-denied after 60 seconds of no answer. `apps.install` additionally
raises a full capability review for the app being installed.

![Package, publish, and install as a chain of apps:* calls, each gated by a host confirmation](/cookbook/images/concept-apps-build-loop.svg)

**Diagram 8.0 — The `apps:*` build loop.** Packaging, publishing, and installing are separate
`apps:*` calls, and each one stops for a host confirmation drawn outside the app's frame that
the app cannot dismiss, style, or make silent — auto-denied after 60 seconds. Installing
additionally raises a full capability review for the app being installed.

![A host confirmation for a packaging request](/cookbook/images/08-host-confirmation.png)

**Screenshot 8.1 — A confirmation the app cannot touch.** The desktop host at 1280×800 with
Sticker mill running in the mini-app surface, dimmed behind a modal that is unmistakably host
chrome — different background, host-styled buttons, positioned outside the app's frame. The
modal reads "Sticker mill wants to package an app" with the project name and a line "It will
be signed with your publisher identity", and **Allow once** / **Deny** buttons. A small
countdown in the corner reads "58".

There is no standing grant that makes these silent. There is no "remember this choice". If
your app's design needs the confirmation to go away, your app's design is wrong.

> **⏳ Not yet available — key rotation, revocation, and multi-maintainer apps.** Your
> publisher key is forever. Lose it and the app can never be updated; leak it and there is no
> revocation path. Use `tp identity export` or `tp identity recovery show` before publishing;
> backup and recovery preserve the key but do not rotate or revoke it. See
> [docs/package-format.md](../docs/package-format.md) §1 and
> [STATUS-SOFTWARE.md](../STATUS-SOFTWARE.md).

![The chapter's three apps](/cookbook/images/08-chapter-opener.png)

**Screenshot 8.2 — Chapter opener.** Three host captures: Sticker mill showing a blue colour
swatch reading "Hello" and a QR-coded 256t identifier beneath it; Form forge showing a
designed six-field list awaiting review; App relay showing three heard app announces with
**Install…** buttons and a trusted-publishers line.

| Recipe | Capabilities | Directory |
|---|---|---|
| [Sticker mill](#sticker-mill) | `workspace`, `apps:package`, `apps:preview`, `apps:publish` | [apps/sticker-mill](apps/sticker-mill/README.md) |
| [Form forge](#form-forge) | `workspace`, `apps:package`, `apps:preview`, `ai:chat` | [apps/form-forge](apps/form-forge/README.md) |
| [App relay](#app-relay) | `announce:subscribe`, `apps:install`, `storage:kv` | [apps/app-relay](apps/app-relay/README.md) |

---

## Sticker mill

> **Capabilities:** `workspace`, `apps:package`, `apps:preview`, `apps:publish`

Generates a one-screen mini-app from a template and publishes it. The complete `apps:*` loop
in a file you can read in five minutes.

![Sticker mill with a packaged identifier](/cookbook/images/08-sticker-mill.png)

**Screenshot 8.3 — Sticker mill.** The mini-app surface: a text input containing "Hello", a
colour input containing "#3355ff", a live swatch below them rendering white bold text on that
blue background, a row of three buttons (**Preview**, **Package**, **Publish**), a divider, a
QR code, the full 94-character identifier in small type, and a status line reading "Published.
Anyone who heard the announce can install it."

### The interesting part

Generating source is string templating, and the only thing that makes it safe is
`JSON.stringify` on every interpolation:

```javascript
props: { value: ${JSON.stringify(label)} },
style: { fontSize: 40, fontWeight: "bold", color: "#ffffff" }
```

`JSON.stringify` on a string produces a correctly quoted and escaped JavaScript string
literal. Concatenating the raw value instead means a label containing a quote produces a
syntax error, and a label containing `"; /* anything */` produces whatever the user typed —
inside a bundle this device is about to sign.

The generated app declares **no capabilities**:

```javascript
capabilities: [],
```

That is a deliberate choice worth copying. When you generate an app, generate the smallest
grant it can possibly need. Whoever installs it sees that list, and "this sticker needs
storage and messaging" is a question you do not want to have to answer.

The three actions differ only in which confirmation they raise, and all three share the same
structure:

```javascript
busy = true;
status = "Waiting for host confirmation…";
await render();
try {
  lastPackage = await apps.packageProject(PROJECT, generatedManifest());
  status = `Packaged ${lastPackage.size} bytes`;
} catch (error) {
  status = `Packaging declined or failed: ${error?.message ?? "denied"}`;
} finally {
  busy = false;
}
```

Render *before* awaiting. The confirmation may sit on screen for up to a minute, and when the
user dismisses it they will look at your app to see what happened — so the app should already
be saying "waiting", not still showing the state from before they tapped.

A denial is not an error condition. The user said no, which is a completely normal outcome;
the app reports it plainly and stays usable.

> **⚠️ Works, with limits — one preview slot.** `apps.preview` replaces whatever was
> previewing. You cannot compare two generated apps side by side.

Full source: [apps/sticker-mill/bundle.js](apps/sticker-mill/bundle.js).

### Make it yours

- **More templates.** A countdown, a QR badge, a name tag. The generator function is the only
  thing that changes.
- **Version properly.** Every package currently claims `1.0.0`. Semver must increase
  monotonically for updates to install — see
  [Chapter 10 of the authoring guide](../authors/10-updates-and-trust.md).
- **Show the generated source.** A `code-editor` widget in read-only mode, before packaging.
  If your app signs things, letting the user read what is being signed is the least it can do.

---

## Form forge

> **Capabilities:** `workspace`, `apps:package`, `apps:preview`, `ai:chat`

Describe a form in a sentence; get a working, packaged mini-app that collects it. Both of the
previous chapters' lessons, combined, at the exact point where combining them is dangerous.

![Form forge with a designed field list](/cookbook/images/08-form-forge.png)

**Screenshot 8.4 — Form forge.** The mini-app surface: a brief input containing "a trailhead
sign-in sheet", a **Design it** button, a divider, a list of six designed fields rendered as
"Name (text)", "Party size (number)", "Overnight? (switch)" and so on, a row of **Preview** /
**Package** buttons, and a status line reading "Designed 6 fields. Review them before
packaging."

### The interesting part

**The model never writes JavaScript.** It writes a field list; local code writes the
JavaScript.

```javascript
{
  role: "system",
  content:
    `Return a JSON array of at most ${MAX_FIELDS} form fields. Each element has ` +
    `"label" (string) and "type" (one of ${TYPES.join(", ")}). No prose.`
}
```

and every element is validated against a fixed vocabulary before it goes anywhere near the
generator:

```javascript
for (const item of candidate) {
  if (typeof item?.label !== "string" || item.label.length === 0 || item.label.length > 60) return null;
  if (!TYPES.includes(item?.type)) return null;
  const name = item.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24);
  if (name.length === 0) return null;
  clean.push({ name, label: item.label, type: item.type });
}
```

Consider the alternative for a moment. An app with `ai:chat` and `apps:package` that asked a
model for a bundle and packaged the reply would be a pipeline that signs remotely-generated
code with the user's publisher identity, on a device where nobody reads it. The confirmation
dialog would still fire — but it would be asking the user to vouch for code that no human has
seen.

The rule this recipe exists to state: **a model may choose from your vocabulary; it may not
extend it.** Field types come from `TYPES`. Names are derived by your regex. The code is
your template. What the model contributes is judgement about which fields a trailhead sign-in
sheet needs, which is the part it is actually good at.

The generated app asks for `storage:kv` — genuinely needed, since a form that forgets what
you typed is not a form — and nothing else.

Full source: [apps/form-forge/bundle.js](apps/form-forge/bundle.js).

### Make it yours

- **Let the user edit the field list.** They should be able to fix the model's guesses before
  anything is signed.
- **Add a field type.** `TYPES` plus a branch in the generator. Notice how the vocabulary is
  the only place types exist.
- **Generate a submit path.** Add `lxmf:send` to the generated manifest and send completed
  forms to a coordinator address. Now think carefully: you are generating an app that
  requests messaging, and whoever installs it will see that.

---

## App relay

> **Capabilities:** `announce:subscribe`, `apps:install`, `storage:kv`

Watches for app announces from publishers you have chosen to trust, and offers them for
install. What curation looks like when there is no registry to curate.

![App relay with heard app announces](/cookbook/images/08-app-relay.png)

**Screenshot 8.5 — App relay.** The mini-app surface: a "Trust a publisher address" input
with a **Trust** button, a small grey line reading "Trusting 2 publisher(s)", a divider, and
three heard apps. Each is three lines: the app name, a small grey "from 9c31f7a2e4b0… ·
4f2ac1e93b77…", and an **Install…** button. The status line reads "Waiting for the host's
capability review…".

### The interesting part

The trust list is the entire product, and its default is honest about being bad:

```javascript
trusted.length === 0
  ? "Trusting nobody — showing everything heard. This is not a safe default."
  : `Trusting ${trusted.length} publisher(s)`
```

There is no registry, no store, no search, and no moderation. Nobody reviews anyone's code.
The only filter that can exist is one a person built by deciding, address by address, whose
apps they will look at — and an app that presents unfiltered announce traffic as a browsable
catalogue is dressing up "install whatever a stranger shouted" as a store.

What this app cannot do is more important than what it can:

```javascript
try {
  await apps.install(t256);
  status = "Installed";
} catch (error) {
  // Denied at the confirmation, denied at the capability review, or the bytes
  // could not be resolved because no locator announce was heard.
  status = `Not installed: ${error?.message ?? "denied"}`;
}
```

`apps.install` raises a host confirmation **and** the full capability review for the app being
installed. The relay cannot pre-approve anything, cannot suppress the review, cannot see what
the user chose beyond success or failure, and cannot install silently. Trusting a publisher in
this app means "show me their announces" — it does not and cannot mean "install their things
without asking".

That is the correct division. Curation is an app's job; consent is the host's.

Full source: [apps/app-relay/bundle.js](apps/app-relay/bundle.js).

### Make it yours

- **Show the requested capabilities before installing.** The announce could carry them. A user
  deciding whether to even start the install is better served than one deciding inside the
  review dialog.
- **Persist what you heard.** Currently in-memory; the app forgets everything when closed.
- **Share your trust list.** `share.put` it, and let someone bootstrap from yours. This is
  what a "curator" looks like on a platform with no authority.
- **Track updates.** Same publisher, same app name, higher version — that is an update
  notification, which the platform does not push to you.

---

## What this chapter was actually about

You can build an app store, an app generator, and a publishing pipeline as mini-apps. What
you cannot build — at any point, by any route — is a way to package, publish, or install
without the user seeing a dialog they had to answer.

That constraint is what makes the rest of it safe. When you design in this space, design as
though the confirmation is the feature, because it is.

---

Next: [Apps for a bad link](09-apps-for-a-bad-link.md) — designing backwards from hundreds of
bits per second.
