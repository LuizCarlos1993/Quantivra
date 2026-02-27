# UI SOURCE OF TRUTH

## Design Reference Source

The `/mockup` directory contains the validated visual reference exported from Figma Maker.

The implementation MUST:

- Match layout hierarchy
- Match spacing
- Match typography scale
- Match component proportions
- Match navigation structure

The mockup folder is visual guidance.
This document defines implementation rules.
If conflict occurs, this document overrides.

The Figma mockup is the absolute visual authority.
No layout, spacing, colors, typography, positioning or flows may change.

Rules:

- Pixel-perfect replication required.
- Same component hierarchy.
- Same screen names.
- Same navigation behavior.
- Same empty states.
- Same modals.
- Same validation messages.

If implementation requires adaptation, backend must adapt to UI.
UI must NOT adapt to backend.