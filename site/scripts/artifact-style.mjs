// The shared look of Naive's artifact pages: a light and a dark palette, IBM Plex, one column.
export const fonts = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500&family=IBM+Plex+Sans:wght@400;500;600&display=swap">';
export const style = `
:root{--bg:#f7f8fa;--fg:#16181d;--muted:#5b6170;--line:#dde0e6;--surface:#ffffff;--accent:#2f4fd8;
--sans:"IBM Plex Sans",system-ui,-apple-system,"Segoe UI",sans-serif;--mono:"IBM Plex Mono",ui-monospace,Menlo,monospace}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#111318;--fg:#e8eaef;--muted:#9aa1b0;--line:#2a2e37;--surface:#181b22;--accent:#8ea2ff;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#111318;--fg:#e8eaef;--muted:#9aa1b0;--line:#2a2e37;--surface:#181b22;--accent:#8ea2ff;color-scheme:dark}
body{background:var(--bg);color:var(--fg);font:17px/1.6 var(--sans);padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
.wrap{max-width:46rem;margin:0 auto;padding-block:1.5rem 4rem}
nav{display:flex;flex-wrap:wrap;gap:.25rem 1.25rem;padding-block:.5rem 2rem;border-bottom:1px solid var(--line);font-size:.95rem}
nav a{color:var(--muted);text-decoration:none}nav a:first-child{color:var(--fg);font-weight:600;margin-right:auto}
nav a[aria-current]{color:var(--accent)}nav a:focus-visible,a:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
h1{font-size:2.4rem;line-height:1.15;margin:2.5rem 0 .75rem;text-wrap:balance;letter-spacing:-.01em}
h2{font-size:1.35rem;margin:3rem 0 .5rem;text-wrap:balance}
.lede{font-size:1.3rem;color:var(--muted);margin:0}
p,li{max-width:65ch}a{color:var(--accent)}
.draft{display:inline-block;font:500 .7rem/1 var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--muted);border:1px solid var(--line);border-radius:3px;padding:.2rem .35rem;vertical-align:.15em}
.phases{list-style:none;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(8.5rem,1fr));gap:.75rem}
.phases li{background:var(--surface);border:1px solid var(--line);border-radius:6px;padding:.8rem;min-width:0}
.phases b{display:block}.phases small{display:block;color:var(--muted);font-size:.8rem;margin-top:.4rem}
.phases .n{font:500 .75rem var(--mono);color:var(--muted)}
.table{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:.95rem}
th,td{text-align:left;padding:.55rem .6rem;border-bottom:1px solid var(--line);vertical-align:top}th{color:var(--muted);font-weight:500}
code{font:.9em var(--mono)}
.cta{display:flex;flex-wrap:wrap;gap:.75rem;margin-top:2.5rem}
.cta a{background:var(--accent);color:var(--bg);text-decoration:none;padding:.55rem 1rem;border-radius:6px;font-weight:500}
footer{margin-top:4rem;color:var(--muted);font-size:.85rem;border-top:1px solid var(--line);padding-top:1rem}
@media (max-width:30rem){h1{font-size:1.9rem}}`;
