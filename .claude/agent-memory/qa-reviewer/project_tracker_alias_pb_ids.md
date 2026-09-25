---
name: project-tracker-alias-pb-ids
description: price_history.json has alias entries (different names, same PB product ID) — name-only dedupe in homepage/rail code is a recurring bug source
metadata:
  type: project
---

The tracker (`src/data/price_history.json`, bundles+plugins merged) contains alias entries: different display names that share one PB product ID (e.g. "Arturia Pigments" / "Pigments 7", "Waves Platinum Bundle" / "Platinum"). As of 2026-09-25 there were 18 such shared IDs, including search-URL entries.

**Why:** Dedupe by lowercased name lets two sponsored cards point at the same PB page. PR-17 (topdeals-exposure-redesign) added ID-based exclusion for topDeals->fallback/Biggest, but fallbackLiveDrops->fallbackWatchDrops was still name-only (`usedFallbackNames`).

**How to apply:** When reviewing any homepage/rail/fallback card selection, check that exclusion between every pair of card pools uses `pbProductId()`, not just the name. Re-check the alias count with a quick node script (pbProductId over all entries) because the data changes. Note: the Windows copy of price_history.json may be stale compared with the Mac copy.
