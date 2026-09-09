# Branding assets — header logo

The application header (`src/client/components/AppShell.tsx`) renders **one** mark
in its top-left lockup, loaded by absolute URL from this directory:

| File               | Served at                | Slot                                    |
| ------------------ | ------------------------ | --------------------------------------- |
| `agency-logo.svg`  | `/branding/agency-logo.svg` | The single mark, left of the wordmark |

Beside it, the header renders the wordmark as **text** — "U.S. Customs and Border
Protection" over "Cargo Directorate". The mark therefore carries `alt=""`: it is
decorative in the accessibility tree because the adjacent text already names the
organisation, and giving the image alt text would announce it twice. If you
replace it with artwork conveying something that text does not say, give it a real
`alt` in `AppShell.tsx`.

## The current file is an INTERIM STAND-IN

`agency-logo.svg` is a plain, self-labelling placeholder ("LOGO / pending"). It is
not branding. It exists so the header renders a valid image rather than a
broken-image icon while the real artwork is outstanding.

## Replacing it

Drop the artwork in this directory as **`agency-logo.svg`**. No code change and no
reference update is required.

- **Format:** SVG is strongly preferred — the header scales the mark, and SVG
  stays crisp at any display density. PNG works, but the file extension
  determines the served `Content-Type`, so a PNG must be named `agency-logo.png`
  and `AGENCY_LOGO_SRC` in `AppShell.tsx` updated to match. That constant is the
  only place the filename appears.
- **Size / aspect ratio:** nothing to configure. The header sets a fixed height
  (`--logo-height`, `3rem`) with `width: auto`, so a square seal and a wide
  horizontal lockup both render 3rem tall, undistorted. Change `--logo-height` in
  `src/client/styles/app.css` to resize — it is the single source of that value.
- **Padding:** ship the artwork trimmed to its own edges; the lockup supplies its
  own spacing.
- **Background:** the mark sits on a white header surface. Use a transparent
  background — artwork with a white knockout will disappear into it.

## Why this directory

It is Vite's `publicDir`, so its contents are copied verbatim into `dist/client/`
at build time and are never hashed, renamed, or inlined. Swapping a file here is a
file replacement, not a rebuild dependency.

## Note on official insignia

The DHS and CBP seals are protected insignia (18 U.S.C. § 701). Obtain the artwork
from, and use it with the authorisation of, the agency.
