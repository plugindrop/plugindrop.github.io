---
name: project-ux-home-funnel-deploy-gap-2026-10-23
description: 2026-10-23 ホーム導線設計時の実測: T0〜T4はWindows innerにしか無く本番未反映、Mac innerに別4コミット(astro 6.4.8/7.4.2/revert)があり分岐、maker_quote/official/image_lgデータ未生成、entry.categoryは402件None、plugin_factsは価格ページ未配線
metadata:
  type: project
---

設計書: `E:/Claude/affiliate-bot/docs/design-ux-home-funnel-2026-10-23.md`（T8〜T14、M15〜M24）。前回設計 `design-ux-image-heavy-followup-2026-10-22.md`（T0〜T7）の続き。

事実（2026-10-23、Mac正本・本番curl・ローカルdist）:
- 「T0〜T4実装済み」はWindows inner (`astro-site/dtm`) のコミット d015a8bbd/687f4127a/3cdfb540e/80141963d の話。Mac inner HEAD f26f0f4c（deploy 10-22T15:48Z）には無く、本番は `/js/pip-preview.js` 404・`tagline--fallback` 36・`data-copy-kind` 0 の旧UX。
- Mac innerはWindowsに無い4コミット（3dc2bd87 fixtures / b20b48d2 astro 6.4.8 / 3c9d6577 astro 7.4.2 / 36d81994 revert）を1624d8fd3の上に持つ。両者分岐 → マージしてから push → `deploy_site('dtm')` が必要（T8）。
- Mac outer（HEAD edc752e6）には T3/T4 のコード（VALIDATOR_VERSION=2 等）はあるがデータ未生成: `deal_copy` maker_quote 0 / validator_version 0、`product_videos` official キー無し（`--recompute-official` 未実行）、`price_history` image_lg 0。
- `price_history` 651件中 `entry.category` None が402件 → `sameCategoryPeers` が多くの価格ページで空。分類は `categoryForProduct` を使う。
- `plugin_facts.json`（523件、formats/mac_req/win_req、出典URL+retrieved_on）は FactCard/free/index でしか使われず価格ページ未配線。
- spotlight空白の原因: `.feature-section` が `align-items:start` で左右独立高（本番はWorth a look 2×2通常カードが高く左下に約300px空白）。T2後も `.variant-spotlight .card-art` の 4:3固定で画像下に穴（1200pxで約60px）。
- 記事 FactCard の CTA が「View at Plugin Boutique →」（店名CTA、ゲート漏れ）。`DealMath` が差額$0でも出る。
- ヘッドレスChromeの `--window-size=375` はWindowsでは375幅にならずモバイル計測に使えない。DevToolsデバイスモードで測る。

**Why:** オーナーの「UX改善は本当に終わったか」への答えは「Windowsローカルのみ・本番未反映」。デプロイ前に新設計を積んでも本番数値は動かない。
**How to apply:** 「実装済み」は本番HTMLで確認したものだけを指す。ホーム/価格ページの設計依頼ではまず Mac inner HEAD と本番HTMLを突き合わせる。データ件数はMac正本で再計算する。
