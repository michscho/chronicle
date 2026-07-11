// Chronicle — time formatting and axis tick computation.
// All times are years: negative = BCE / years before present for deep time.

const fmtDE = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });

// Compact label, e.g. for axis ticks and event cards.
export function formatTime(t) {
    const abs = Math.abs(t);
    if (abs >= 1e9) return `${fmtDE.format(t / 1e9)} Mrd`;
    if (abs >= 1e6) return `${fmtDE.format(t / 1e6)} Mio`;
    if (abs >= 10000) return `${fmtDE.format(t / 1000)}k`;
    if (t < 0) return `${Math.abs(Math.round(t))} v. Chr.`;
    return `${Math.round(t)}`;
}

// Verbose label for the info panel / header.
export function formatTimeLong(t) {
    const abs = Math.abs(t);
    if (abs >= 1e9) return `vor ${fmtDE.format(abs / 1e9)} Mrd. Jahren`;
    if (abs >= 1e6) return `vor ${fmtDE.format(abs / 1e6)} Mio. Jahren`;
    if (t < -10000) return `vor ${fmtDE.format(Math.round(abs / 100) * 100)} Jahren`;
    if (t < 0) return `${Math.round(abs)} v. Chr.`;
    return `${Math.round(t)} n. Chr.`;
}

// Human name for the current zoom depth (span = visible years).
export function spanName(span) {
    if (span > 2e9) return 'Kosmisch';
    if (span > 1e8) return 'Geologisch';
    if (span > 4e6) return 'Erdgeschichte';
    if (span > 1e5) return 'Prähistorisch';
    if (span > 6000) return 'Urzeit';
    if (span > 1600) return 'Geschichte';
    if (span > 400) return 'Epochen';
    if (span > 100) return 'Jahrhundert';
    return 'Fein';
}

export function formatSpan(span) {
    const abs = Math.abs(span);
    if (abs >= 2e9) return `${fmtDE.format(abs / 1e9)} Mrd. Jahre`;
    if (abs >= 2e6) return `${fmtDE.format(abs / 1e6)} Mio. Jahre`;
    if (abs >= 10000) return `${fmtDE.format(Math.round(abs / 1000))}.000 Jahre`;
    return `${fmtDE.format(Math.round(abs))} Jahre`;
}

// Pick a tick step in the 1-2-5 progression so ticks sit ~targetPx apart.
export function tickStep(span, widthPx, targetPx = 110) {
    const raw = span / Math.max(1, widthPx / targetPx);
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    for (const m of [1, 2, 5, 10]) {
        if (mag * m >= raw) return mag * m;
    }
    return mag * 10;
}

// Generate tick times covering [start, end] at the given step.
export function ticks(start, end, step) {
    const out = [];
    const first = Math.ceil(start / step) * step;
    for (let t = first; t <= end; t += step) out.push(t);
    return out;
}

// Which importance tier is fully visible at this span, plus a fade factor
// (0..1) for the tier that is just appearing.
export const IMP_THRESHOLDS = { 2: 4000, 3: 250 }; // imp N visible below this span
export function impAlpha(imp, span) {
    if (imp <= 1) return 1;
    const limit = IMP_THRESHOLDS[imp];
    if (span <= limit) return 1;
    // fade out over one octave above the threshold
    if (span >= limit * 2) return 0;
    return 1 - (span - limit) / limit;
}
