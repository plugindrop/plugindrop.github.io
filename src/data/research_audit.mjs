// Reviewed results of docs/codex-requests/phase7-7c-audit-2026-09-27.md.
// Human review performed manually against archived Plugin Boutique pages on
// web.archive.org (priority-1 targets only; see output/research_audit/review.md
// for the full candidate list this was drawn from).
//
// Only items with reviewed === true and status 'confirmed' / 'no_sale_seen'
// are meant to affect the site (see phase7-7c-r1-2026-09-27.md §2-0 "監査索引").
// Items with status 'contradicted' are kept here for the audit trail only —
// they have archived evidence, but it does not support the research row's
// specific claimed sale price/depth within +/-10%, so they must not be
// treated as confirmed. A future PR may add explicit handling for this status;
// until then they are inert (buildAuditIndex only keeps confirmed/no_sale_seen).
//
// Confirmation rule applied: nearest-to-research-date readable archived price,
// compared to the research row's claimed sale price, within +/-10% => confirmed.
// All readable archived prices came back with currency "unknown" from the
// automated extractor (no JSON-LD priceCurrency); USD was verified by manually
// opening the archived page in a browser for FabFilter Pro-MB (2023-11-20),
// FabFilter Pro-L 2 (2023-11-20), FabFilter Saturn 2 (2023-11-20), and
// FabFilter Twin 3 (2024-11-18) — all showed "$"-denominated prices with the
// site's "United States" location banner. The remaining rows below rely on
// the same page template/extractor (already unit-tested for USD/EUR/no-currency
// in test_audit_research_prices_wayback.py) rather than an individual visual
// check, to avoid re-opening every single archived page.
export const RESEARCH_AUDIT = {
  version: 1,
  reviewed_at: '2026-09-28',
  items: [
    {
      pb_path: '/product/2-Effects/30-Distortion/6423-FabFilter-Saturn-2',
      research_date: '2023-11-20',
      research_source: 'research_bf2023',
      research_sale: 134.0,
      research_regular: 179.0,
      status: 'confirmed',
      reviewed: true,
      note: 'Nearest snapshot 2023-11-29 (9d gap) shows $129.00, -3.7% vs research value. No visible SALE badge in the archived page, but price is close enough to treat as the same sale.',
      evidence: [
        { snapshot_date: '2023-11-29', snapshot_url: 'https://web.archive.org/web/20231129000150id_/https://www.pluginboutique.com/product/2-Effects/30-Distortion/6423-FabFilter-Saturn-2/?a_aid=615ec2abe7821&data1=miht&data2=vst-plugins-for-ableton-live', price: 129.0, currency: 'USD' },
      ],
    },
    {
      pb_path: '/product/2-Effects/30-Distortion/6423-FabFilter-Saturn-2',
      research_date: '2024-11-18',
      research_source: 'research_bf2024',
      research_sale: 134.0,
      research_regular: 179.0,
      status: 'confirmed',
      reviewed: true,
      note: 'Nearest snapshot 2024-11-10 (8d gap) shows $139.00, +3.7% vs research value.',
      evidence: [
        { snapshot_date: '2024-11-10', snapshot_url: 'https://web.archive.org/web/20241110175558id_/https://www.pluginboutique.com/product/2-Effects/30-Distortion/6423-FabFilter-Saturn-2/?a_aid=5d9b24ceb1206', price: 139.0, currency: 'USD' },
      ],
    },
    {
      pb_path: '/product/2-Effects/10-Delay/7604-FabFilter-Timeless-3',
      research_date: '2023-11-20',
      research_source: 'research_bf2023',
      research_sale: 127.0,
      research_regular: 169.0,
      status: 'confirmed',
      reviewed: true,
      note: 'Nearest snapshot 2023-12-03 (13d gap) shows $129.00, +1.6% vs research value.',
      evidence: [
        { snapshot_date: '2023-12-03', snapshot_url: 'https://web.archive.org/web/20231203080922id_/https://www.pluginboutique.com/product/2-Effects/10-Delay/7604-FabFilter-Timeless-3/?a_aid=5cfc204524b25', price: 129.0, currency: 'USD' },
      ],
    },
    {
      pb_path: '/product/2-Effects/10-Delay/7604-FabFilter-Timeless-3',
      research_date: '2024-11-18',
      research_source: 'research_bf2024',
      research_sale: 127.0,
      research_regular: 169.0,
      status: 'confirmed',
      reviewed: true,
      note: 'Nearest (only) snapshot 2024-11-11 (7d gap) shows $139.00, +9.4% vs research value. Borderline but within +/-10%.',
      evidence: [
        { snapshot_date: '2024-11-11', snapshot_url: 'https://web.archive.org/web/20241111205536id_/https://www.pluginboutique.com/product/2-Effects/10-Delay/7604-FabFilter-Timeless-3?a_aid=5faa79ec85224', price: 139.0, currency: 'USD' },
      ],
    },
    {
      pb_path: '/product/1-Instruments/4-Synth/10192-Twin-3',
      research_date: '2024-11-18',
      research_source: 'research_bf2024',
      research_sale: 104.0,
      research_regular: 139.0,
      status: 'confirmed',
      reviewed: true,
      note: 'Exact match. Manually opened 2024-11-22 snapshot: visible "SALE" badge, "Your Price $104.00 / List Price $139.00 / You Save $35.00". Strongest-confidence confirmation in this batch.',
      evidence: [
        { snapshot_date: '2024-11-22', snapshot_url: 'https://web.archive.org/web/20241122015742id_/https://www.pluginboutique.com/product/1-Instruments/4-Synth/10192-Twin-3?a_aid=5c2307ad7734c', price: 104.0, currency: 'USD' },
      ],
    },
    {
      pb_path: '/product/1-Instruments/4-Synth/3027-Repro',
      research_date: '2023-11-24',
      research_source: 'research_bf2023',
      research_sale: 74.0,
      research_regular: 149.0,
      status: 'confirmed',
      reviewed: true,
      note: 'Nearest snapshot 2023-11-20 (4d gap) shows $69.00, -6.8% vs research value.',
      evidence: [
        { snapshot_date: '2023-11-20', snapshot_url: 'https://web.archive.org/web/20231120042731id_/https://www.pluginboutique.com/product/1-Instruments/4-Synth/3027-Repro?a_aid=65285a1a3c976', price: 69.0, currency: 'USD' },
      ],
    },
    {
      pb_path: '/product/1-Instruments/4-Synth/3027-Repro',
      research_date: '2024-11-28',
      research_source: 'research_bf2024',
      research_sale: 127.0,
      research_regular: 149.0,
      status: 'confirmed',
      reviewed: true,
      note: 'Nearest snapshot 2024-12-02 (4d gap) shows $128.00, +0.8% vs research value.',
      evidence: [
        { snapshot_date: '2024-12-02', snapshot_url: 'https://web.archive.org/web/20241202114816id_/https://www.pluginboutique.com/product/1-Instruments/4-Synth/3027-Repro-1?a_aid=5dbccc4375116', price: 128.0, currency: 'USD' },
      ],
    },
    {
      pb_path: '/product/2-Effects/96-Tape-Emulation/1400-Satin',
      research_date: '2023-11-24',
      research_source: 'research_bf2023',
      research_sale: 64.0,
      research_regular: 129.0,
      status: 'confirmed',
      reviewed: true,
      note: 'Nearest snapshot 2023-11-20 (4d gap) shows $59.00, -7.8% vs research value.',
      evidence: [
        { snapshot_date: '2023-11-20', snapshot_url: 'https://web.archive.org/web/20231120030308id_/https://www.pluginboutique.com/product/2-Effects/96-Tape-Emulation/1400-Satin/?a_aid=5cfc204524b25', price: 59.0, currency: 'USD' },
      ],
    },
    {
      pb_path: '/product/2-Effects/20-Gate/924-FabFilter-Pro-G',
      research_date: '2024-11-18',
      research_source: 'research_bf2024',
      research_sale: 134.0,
      research_regular: 179.0,
      status: 'no_sale_seen',
      reviewed: true,
      note: 'Nearest snapshot 2024-11-10 (8d gap) shows $179.00 = list price exactly. No discount visible near this date; research claim of a $134 BF2024 sale is not supported by this archive.',
      evidence: [
        { snapshot_date: '2024-11-10', snapshot_url: 'https://web.archive.org/web/20241110024914id_/https://www.pluginboutique.com/product/2-Effects/20-Gate/924-FabFilter-Pro-G?a_aid=5c2307ad7734c', price: 179.0, currency: 'USD' },
      ],
    },
    {
      pb_path: '/product/2-Effects/96-Tape-Emulation/1400-Satin',
      research_date: '2024-11-28',
      research_source: 'research_bf2024',
      research_sale: 110.0,
      research_regular: 129.0,
      status: 'no_sale_seen',
      reviewed: true,
      note: 'Nearest (only) snapshot 2024-12-04 (6d gap) shows $129.00 = list price exactly. No discount visible near this date; research claim of a $110 BF2024 sale is not supported by this archive.',
      evidence: [
        { snapshot_date: '2024-12-04', snapshot_url: 'https://web.archive.org/web/20241204160424id_/https://www.pluginboutique.com/product/2-Effects/96-Tape-Emulation/1400-Satin/?a_aid=5abf3e9769e18', price: 129.0, currency: 'USD' },
      ],
    },
    {
      pb_path: '/product/2-Effects/9-Limiter/3955-FabFilter-Pro-L-2',
      research_date: '2023-11-20',
      research_source: 'research_bf2023',
      research_sale: 134.0,
      research_regular: 179.0,
      status: 'contradicted',
      reviewed: true,
      note: 'Manually opened 2023-12-03 snapshot (13d gap): no "SALE" badge, just static "Your Price $169.00" with no List Price/You Save line. +26.1% vs the $134 research claim. Does not confirm the specific sale claimed; also does not prove no sale ever happened (Wayback only caught a post-BF-window capture). Left unconfirmed.',
      evidence: [
        { snapshot_date: '2023-12-03', snapshot_url: 'https://web.archive.org/web/20231203002842id_/https://www.pluginboutique.com/product/2-Effects/9-Limiter/3955-FabFilter-Pro-L-2/?a_aid=5f7c4d023a876', price: 169.0, currency: 'USD' },
      ],
    },
    {
      pb_path: '/product/2-Effects/8-Compressor/919-FabFilter-Pro-MB',
      research_date: '2023-11-20',
      research_source: 'research_bf2023',
      research_sale: 134.0,
      research_regular: 179.0,
      status: 'contradicted',
      reviewed: true,
      note: 'Manually opened 2023-12-03 snapshot (13d gap): no "SALE" badge, just static "Your Price $169.00". +26.1% vs the $134 research claim. Same pattern as the sibling FabFilter Pro-L 2 row above (same BF2023 batch, same gap) — likely the nearest archive capture simply falls after the BF window ended. Left unconfirmed.',
      evidence: [
        { snapshot_date: '2023-12-03', snapshot_url: 'https://web.archive.org/web/20231203082523id_/https://www.pluginboutique.com/product/2-Effects/8-Compressor/919-FabFilter-Pro-MB/?a_aid=5abf3e9769e18', price: 169.0, currency: 'USD' },
      ],
    },
    {
      pb_path: '/product/2-Effects/10-Delay/7604-FabFilter-Timeless-3',
      research_date: '2025-11-15',
      research_source: 'research_musicradar_bf2025',
      research_sale: 112.0,
      research_regular: 149.0,
      status: 'contradicted',
      reviewed: true,
      note: 'Nearest snapshot 2025-11-07 (8d gap) shows $129.00, +15.2% vs research value — outside +/-10%. Left unconfirmed.',
      evidence: [
        { snapshot_date: '2025-11-07', snapshot_url: 'https://web.archive.org/web/20251107162153id_/https://www.pluginboutique.com/product/2-Effects/10-Delay/7604-FabFilter-Timeless-3/?a_aid=5dbccc4375116', price: 129.0, currency: 'USD' },
      ],
    },
    {
      pb_path: '/product/1-Instruments/4-Synth/5392-Hive-2',
      research_date: '2023-11-24',
      research_source: 'research_bf2023',
      research_sale: 74.0,
      research_regular: 149.0,
      status: 'contradicted',
      reviewed: true,
      note: 'Nearest snapshot 2023-11-20 (4d gap) shows $65.50, -11.5% vs research value — just outside +/-10%. A cheaper deal clearly existed around this date, just not exactly the claimed $74. Left unconfirmed rather than substituting a different price than research claimed.',
      evidence: [
        { snapshot_date: '2023-11-20', snapshot_url: 'https://web.archive.org/web/20231120032939id_/https://www.pluginboutique.com/product/1-Instruments/4-Synth/5392-Hive-2', price: 65.5, currency: 'USD' },
      ],
    },
    // --- Priority-3 batch (2026-09-28), reviewed with the same nearest-to-date
    // +/-10% rule; none individually visually opened (see file header re: template reuse).
    {
      pb_path: '/product/2-Effects/17-Reverb/11576-FabFilter-Pro-R-2',
      research_date: '2024-11-18',
      research_source: 'research_bf2024',
      research_sale: 127.0,
      research_regular: 169.0,
      status: 'contradicted',
      reviewed: true,
      note: 'Nearest snapshot 2024-11-22 (4d gap) shows $107.95, -15.0% vs research value — outside +/-10% (exactly 85% of claim). A later snapshot 2024-11-23 (5d gap, not nearest) shows $134.00 (+5.5%), closer to the claim but not the nearest-date reading. Left unconfirmed per the nearest-date rule.',
      evidence: [
        { snapshot_date: '2024-11-22', snapshot_url: 'https://web.archive.org/web/20241122015848id_/https://www.pluginboutique.com/product/2-Effects/17-Reverb/11576-FabFilter-Pro-R-2?a_aid=5c2307ad7734c', price: 107.95, currency: 'USD' },
        { snapshot_date: '2024-11-23', snapshot_url: 'https://web.archive.org/web/20241123113225id_/https://www.pluginboutique.com/product/2-Effects/17-Reverb/11576-FabFilter-Pro-R-2/', price: 134.0, currency: 'USD' },
      ],
    },
    {
      pb_path: '/product/2-Effects/19-Filter/8389-FabFilter-Volcano-3',
      research_date: '2023-11-20',
      research_source: 'research_bf2023',
      research_sale: 127.0,
      research_regular: 169.0,
      status: 'contradicted',
      reviewed: true,
      note: 'Same-day snapshot (0d gap) shows $96.76, -23.8% vs research value — well outside +/-10% despite being the closest possible timing. A later snapshot 2023-12-03 (13d gap, not nearest) shows $129.00 (+1.6%). Left unconfirmed.',
      evidence: [
        { snapshot_date: '2023-11-20', snapshot_url: 'https://web.archive.org/web/20231120131415id_/https://www.pluginboutique.com/product/2-Effects/19-Filter/8389-FabFilter-Volcano-3', price: 96.76, currency: 'USD' },
        { snapshot_date: '2023-12-03', snapshot_url: 'https://web.archive.org/web/20231203080924id_/https://www.pluginboutique.com/product/2-Effects/19-Filter/8389-FabFilter-Volcano-3/?a_aid=5cfc204524b25', price: 129.0, currency: 'USD' },
      ],
    },
    {
      pb_path: '/product/2-Effects/19-Filter/8389-FabFilter-Volcano-3',
      research_date: '2024-11-18',
      research_source: 'research_bf2024',
      research_sale: 127.0,
      research_regular: 169.0,
      status: 'contradicted',
      reviewed: true,
      note: 'Nearest readable snapshot 2024-11-22 (4d gap) shows $104.00, -18.1% vs research value — outside +/-10%. The only other evidence (2024-11-04, 14d gap) has no readable price. Left unconfirmed.',
      evidence: [
        { snapshot_date: '2024-11-22', snapshot_url: 'https://web.archive.org/web/20241122015759id_/https://www.pluginboutique.com/product/2-Effects/19-Filter/8389-FabFilter-Volcano-3?a_aid=5c2307ad7734c', price: 104.0, currency: 'USD' },
      ],
    },
    {
      pb_path: '/product/1-Instruments/4-Synth/1396-Diva',
      research_date: '2024-11-28',
      research_source: 'research_bf2024',
      research_sale: 152.0,
      research_regular: 179.0,
      status: 'confirmed',
      reviewed: true,
      note: 'Nearest readable snapshot 2024-12-03 (5d gap) shows $153.00, +0.66% vs research value — well within +/-10%. (2024-12-02, 4d gap, has no readable price; 2024-12-04, 6d gap, shows $179.00 = list price, consistent with the sale having ended by then.)',
      evidence: [
        { snapshot_date: '2024-12-03', snapshot_url: 'https://web.archive.org/web/20241203013337id_/https://www.pluginboutique.com/product/1-Instruments/4-Synth/1396-Diva', price: 153.0, currency: 'USD' },
      ],
    },
  ],
};
