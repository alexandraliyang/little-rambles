# PRD: v0.5 — Place names + photo journal
Date: 2026-07-27 · Target: App 0.5.0 · Label: [ASSUMPTION per ADR-0009] · Origin: Founder-identified defect — tap-to-go logs the CATEGORY, not the venue chosen inside Google; journal stores the question, not the answer. Memory value gutted; photos absent despite journal being the moat.
## What done means
- Check-in modal gains optional "Which place?" text field; journal leads with place name (category + location become subtitle).
- Check-in modal gains photo picker: up to 3 images/visit, compressed on-device (~900px JPEG), persisted per-visit, rendered as thumbnail strip in Memories; graceful failure if storage rejects (visit still saves).
- Roadmap re-frame recorded: Phase 4 venue-level pipeline is a MEMORY feature (specific venue auto-logging) as much as discovery.
## Explicitly NOT building
Video (needs Phase 2 cloud storage — logged); place autocomplete (Places API, Phase 4); mid-outing prompts (evening-only, per never-demands principle); photo lightbox/zoom.
## Principles check
Friction added only at the relaxed evening moment and only optionally; ADR-0003 intact (tap-to-go unchanged); honesty: journal shows category when no place given rather than guessing.
