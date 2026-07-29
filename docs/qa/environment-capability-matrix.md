# Environment Capability Matrix — what runs where
Created 2026-07-27 after defect #2 (pin blocked by artifact sandbox). QA rule: any feature touching a device API is checked against this table BEFORE build, and the row is verified, not assumed.

| Capability | Chat artifact (now, D1) | PWA (Phase 2) | Native (Phase 5) |
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
