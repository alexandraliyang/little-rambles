# Environment Capability Matrix — what runs where
Updated 2026-07-29: PWA build now exists (`web/`), so the middle column becomes testable for the first time. Created 2026-07-27 after defect #2 (pin blocked by artifact sandbox). QA rule: any feature touching a device API is checked against this table BEFORE build, and the row is verified, not assumed.

| Capability | Chat artifact (now, D1) | PWA (Phase 2) | Native (Phase 5) |
| **React as a global** | ✅ provided by sandbox | ❌ **must be imported — defect #3** | ❌ must be imported |
|---|---|---|---|
| File/photo picker (incl. take-photo on mobile) | ✅ works (v0.5 proved it) | ✅ | ✅ |
| Persistent storage | ✅ (window.storage, 5MB/key) | ✅ (real DB) | ✅ |
| Open external links (Maps) | ✅ | ✅ | ✅ |
| **Geolocation (foreground)** | ❌ **sandbox-blocked — defect #2** | ✅ with permission | ✅ |
| **External images (hotlinked photos)** | ❌ **VERIFIED blocked — founder QA-19, 2026-07-27** (all 9 Unsplash banners fell back to illustrations; fallback worked, zero broken UI) | ✅ | ✅ |
| Push notifications | ❌ | ⚠️ Android yes; iOS limited | ✅ |
| Share-target (receive from Maps) | ❌ | ⚠️ Android only | ✅ |
| Background location / visit detection | ❌ | ❌ | ✅ opt-in (ADR-0011 rung 4) |
| Photo-library scan by time window | ❌ | ❌ | ✅ opt-in |
Lesson recorded: syntax-pass ≠ environment-pass. The artifact is a design/logic testbed; device-API features are built now but VERIFIED at their first capable rung.


## Release gate added 2026-07-29
Every web bundle is smoke-tested headlessly (jsdom) in two configs — IndexedDB available and absent — and must render past the boot screen. Sandbox-provided globals (React, window.storage) are the top cause of works-here-breaks-there defects.
