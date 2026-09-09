# Branding assets — header logo lockup

The application header (`src/client/components/AppShell.tsx`) renders two marks in
its top-left lockup, loaded by absolute URL from this directory:

| File                      | Served at                        | Slot in the lockup |
| ------------------------- | -------------------------------- | ------------------ |
| `dhs-cbp.svg`             | `/branding/dhs-cbp.svg`          | Primary — DHS / U.S. Customs and Border Protection |
| `cargo-directorate.svg`   | `/branding/cargo-directorate.svg`| Secondary — CBP Cargo Directorate |

## Both files are currently PLACEHOLDERS

They are generic institutional marks authored for this repository. They do **not**
reproduce the official DHS or CBP seals, which are protected insignia (18 U.S.C.
§ 701) and must be obtained from, and used with the authorisation of, the agency.

## Replacing them with the real artwork

Drop the authorised files in this directory **using the exact filenames above**.
No code change and no reference update is required.

- **Format:** SVG is strongly preferred (the header scales the mark and SVG stays
  crisp on any display). PNG works if you also keep the filename — change the
  extension in `LOGOS` in `AppShell.tsx` if you do.
- **Aspect ratio:** the lockup sizes each mark to a fixed height
  (`--logo-height`, 3rem) with `width: auto`, so any aspect ratio renders without
  distortion. Roughly square marks suit the layout best.
- **Padding:** ship the artwork trimmed to its own edges; the lockup supplies its
  own spacing.
- **Contrast:** the marks sit on a white header surface. Artwork with a white
  knockout background will disappear — use a transparent background.

This directory is Vite's `publicDir`, so its contents are copied verbatim into
`dist/client/` at build time and are never hashed, renamed, or inlined. Swapping a
file here is a file replacement, not a rebuild dependency.

## Accessibility

The marks are decorative in the accessibility tree: the header's accessible name
comes from the adjacent agency wordmark text ("U.S. Customs and Border
Protection / Cargo Directorate"), so the images carry `alt=""` and are not
announced twice. If you replace a mark with one carrying information not present
in that text, give it a real `alt` in `AppShell.tsx`.
