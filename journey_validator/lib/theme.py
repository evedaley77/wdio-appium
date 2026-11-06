"""Signal Station look and feel (CNN Nova dark theme).

Colors are matched to the Signal Station Instrumentation page; keep them in
sync with .streamlit/config.toml.
"""

import re
from html import escape

import streamlit as st

from lib import config

PALETTE = {
    "red": "#E5484D",
    "red_text": "#F0565C",
    "red_tint": "#3A1D1F",
    "topbar": "#08080A",
    "page": "#0F1014",
    "sidebar": "#121317",
    "surface": "#16171B",
    "header_row": "#1F2025",
    "border": "#24252B",
    "text": "#E6E7EA",
    "muted": "#A1A3AA",
    "subtle": "#7D7F87",
}

BADGE_TONES = {
    "gray": ("#24252B", "#B5B7BE"),
    "amber": ("#3A2A12", "#E8B04B"),
    "blue": ("#1D2F5C", "#9DB8F5"),
    "green": ("#12301F", "#5BD08A"),
    "red": ("#3A1416", "#F0767A"),
    "purple": ("#2A1F45", "#B9A2F5"),
}

STATUS_TONES = {"To Do": "gray", "In-Progress": "amber", "Done": "green"}
TEST_TYPE_TONES = {"Regression": "blue", "Functional": "purple"}

LOGO_SVG = (
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" '
    'stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">'
    '<polyline points="2 12 6 12 9 4 13 20 16 12 22 12"/></svg>'
)

P = PALETTE
CSS = f"""
<style>
.stApp {{ background: {P["page"]}; }}
header[data-testid="stHeader"] {{ background: transparent; }}
.block-container {{ padding-top: 5.25rem; padding-left: 2.5rem; padding-right: 2.5rem; max-width: 1440px; }}

.jv-topbar {{
  position: fixed; top: 0; left: 0; right: 0; height: 56px; z-index: 1000000;
  background: {P["topbar"]}; border-bottom: 1px solid {P["header_row"]};
  display: flex; align-items: center; gap: 10px; padding: 0 18px;
}}
.jv-logo {{
  width: 28px; height: 28px; border-radius: 6px; background: {P["red"]};
  display: flex; align-items: center; justify-content: center;
}}
.jv-brand-title {{ color: #fff; font-weight: 700; font-size: 15px; line-height: 1.15; }}
.jv-brand-sub {{ color: {P["subtle"]}; font-size: 9.5px; letter-spacing: .2em; text-transform: uppercase; }}

section[data-testid="stSidebar"] {{ background: {P["sidebar"]}; border-right: 1px solid {P["header_row"]}; }}
section[data-testid="stSidebar"] > div {{ padding-top: 56px; }}
[data-testid="stSidebarHeader"] {{ height: 0.5rem; min-height: 0; padding: 0; }}
[data-testid="stSidebarUserContent"] {{ padding-top: 0.75rem; }}
.jv-nav-section {{
  color: {P["subtle"]}; font-size: 10.5px; font-weight: 600; letter-spacing: .16em;
  text-transform: uppercase; margin: 0.9rem 0 0.4rem 0.15rem;
}}
.jv-nav-item, .jv-nav-item:visited {{
  display: block; padding: 7px 10px; border-radius: 6px; margin: 2px 0;
  color: #D4D5D9 !important; font-size: 13.5px; text-decoration: none !important;
}}
.jv-nav-item:hover {{ background: {P["surface"]}; }}
.jv-nav-active {{ background: {P["red_tint"]}; color: {P["red_text"]} !important; border: 1px solid #5A2327; }}
.jv-nav-divider {{ border-top: 1px solid {P["header_row"]}; margin: 0.9rem 0; }}
section[data-testid="stSidebar"] [data-testid="stPageLink-NavLink"] {{ padding: 7px 10px; border-radius: 6px; margin: 2px 0; }}
section[data-testid="stSidebar"] [data-testid="stPageLink-NavLink"] p,
section[data-testid="stSidebar"] [data-testid="stPageLink-NavLink"] span {{ color: #D4D5D9; font-size: 13.5px; }}

.jv-page-title {{ color: #fff; font-size: 22px; font-weight: 700; margin: 0; line-height: 1.3; }}
.jv-title-bar {{ width: 36px; height: 3px; border-radius: 2px; background: {P["red"]}; margin: 10px 0 14px; }}
.jv-desc {{ color: {P["muted"]}; font-size: 13.5px; line-height: 1.6; max-width: 660px; margin-bottom: 0.5rem; }}
.jv-desc code {{ background: transparent; color: #C9CBD1; padding: 0; font-size: 12.5px; }}
.jv-desc em {{ color: #C9CBD1; }}
.jv-label {{
  color: {P["subtle"]}; font-size: 10.5px; font-weight: 600; letter-spacing: .14em;
  text-transform: uppercase; margin-bottom: 0.3rem;
}}
.jv-summary {{ color: {P["muted"]}; font-size: 12.5px; padding-top: 0.45rem; }}
.jv-summary b {{ color: {P["text"]}; font-weight: 600; }}

[data-testid="stBaseButton-primary"], button[kind="primary"] {{
  background: {P["red"]}; border: 1px solid {P["red"]}; color: #fff; font-size: 13px; font-weight: 600;
}}
[data-testid="stBaseButton-primary"]:hover, button[kind="primary"]:hover {{ background: #D93D42; border-color: #D93D42; color: #fff; }}
[data-testid="stBaseButton-secondary"], button[kind="secondary"], [data-testid="stLinkButton"] a {{
  background: {P["surface"]}; border: 1px solid #2E2F36; color: {P["text"]}; font-size: 13px;
}}
[data-testid="stBaseButton-secondary"]:hover, button[kind="secondary"]:hover, [data-testid="stLinkButton"] a:hover {{
  border-color: {P["red"]}; color: {P["red_text"]};
}}

.jv-table-wrap {{ border: 1px solid {P["header_row"]}; border-radius: 8px; overflow: hidden; background: {P["surface"]}; margin-top: 0.25rem; }}
table.jv-table {{ width: 100%; border-collapse: collapse; font-size: 13px; margin: 0; display: table; }}
table.jv-table th {{
  background: {P["header_row"]} !important; color: {P["muted"]} !important; border: none !important;
  font-size: 10.5px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase;
  text-align: left; padding: 12px 14px; white-space: nowrap;
}}
table.jv-table td {{
  border: none !important; border-top: 1px solid {P["border"]} !important;
  color: {P["text"]}; padding: 11px 14px; vertical-align: middle;
}}
table.jv-table tr:hover td {{ background: #1A1B20; }}
table.jv-table a {{ color: {P["red_text"]} !important; text-decoration: underline; font-weight: 600; white-space: nowrap; }}
table.jv-table .jv-center {{ text-align: center; }}
.jv-muted {{ color: {P["subtle"]}; }}
.jv-li {{ padding-left: 0.9em; text-indent: -0.7em; color: #C9CBD1; }}
.jv-li::before {{ content: "•"; color: {P["subtle"]}; margin-right: 0.4em; }}
table.jv-table td a {{ white-space: normal; }}
.jv-mono {{ font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; color: #B5B7BE; }}
.jv-badge {{ display: inline-block; padding: 2px 7px; border-radius: 4px; font-size: 11.5px; font-weight: 500; white-space: nowrap; }}
.jv-check {{
  display: inline-flex; width: 16px; height: 16px; border-radius: 50%; background: #22A559;
  color: #0F1014; font-size: 11px; font-weight: 800; align-items: center; justify-content: center;
}}
.jv-x {{ background: #E5484D; color: #fff; }}

.jv-detail-grid {{
  display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 0;
  border: 1px solid {P["header_row"]}; border-radius: 8px; background: {P["surface"]}; margin: 0.5rem 0 1.25rem;
}}
.jv-detail {{ padding: 12px 14px; border-right: 1px solid {P["border"]}; }}
.jv-detail:last-child {{ border-right: none; }}
.jv-detail .jv-value {{ color: {P["text"]}; font-size: 13px; margin-top: 4px; }}

[data-testid="stDataFrame"], [data-testid="stDataEditor"] {{ border: 1px solid {P["header_row"]}; border-radius: 8px; overflow: hidden; }}
</style>
"""


def apply(page_title, active):
    st.set_page_config(page_title=f"{page_title} · {config.APP_TITLE}", layout="wide")
    st.markdown(CSS, unsafe_allow_html=True)
    st.markdown(
        '<div class="jv-topbar">'
        f'<div class="jv-logo">{LOGO_SVG}</div>'
        "<div>"
        f'<div class="jv-brand-title">CNN Nova {config.APP_TITLE}</div>'
        '<div class="jv-brand-sub">Data Standards &amp; Collection</div>'
        "</div></div>",
        unsafe_allow_html=True,
    )
    _sidebar(active)


def _nav(label, page, key, active):
    if key == active:
        st.markdown(f'<div class="jv-nav-item jv-nav-active">{label}</div>', unsafe_allow_html=True)
    else:
        st.page_link(page, label=label)


def _sidebar(active):
    with st.sidebar:
        st.markdown('<div class="jv-nav-section">Journey Validation</div>', unsafe_allow_html=True)
        _nav("Test Cases", "streamlit_app.py", "cases", active)
        _nav("Test Steps", "pages/test_steps.py", "steps", active)
        st.markdown(
            '<div class="jv-nav-divider"></div>'
            '<div class="jv-nav-section">Related</div>'
            f'<a class="jv-nav-item" href="{config.SIGNAL_STATION_URL}" target="_blank">Signal Station ↗</a>'
            f'<a class="jv-nav-item" href="{config.QMETRY_TEST_PLAN_URL}" target="_blank">QMetry Test Plan ↗</a>',
            unsafe_allow_html=True,
        )


def page_heading(title, description_html):
    """Title with the red underline bar on the left; returns the right-hand column for actions."""
    left, right = st.columns([3, 1.4], vertical_alignment="top")
    left.markdown(
        f'<div class="jv-page-title">{escape(title)}</div><div class="jv-title-bar"></div>'
        f'<div class="jv-desc">{description_html}</div>',
        unsafe_allow_html=True,
    )
    return right


def label(text):
    st.markdown(f'<div class="jv-label">{escape(text)}</div>', unsafe_allow_html=True)


def badge(text, tone):
    if not text:
        return '<span class="jv-muted">—</span>'
    bg, fg = BADGE_TONES.get(tone, BADGE_TONES["gray"])
    return f'<span class="jv-badge" style="background:{bg};color:{fg}">{escape(str(text))}</span>'


def pass_fail(value):
    if value == "Pass":
        return '<span class="jv-check" title="Pass">✓</span>'
    if value == "Fail":
        return '<span class="jv-check jv-x" title="Fail">✕</span>'
    return '<span class="jv-muted">—</span>'


def text(value, css_class=""):
    if value is None or value != value or str(value).strip() == "":
        return '<span class="jv-muted">—</span>'
    safe = escape(str(value).strip()).replace("\n", "<br>")
    return f'<span class="{css_class}">{safe}</span>' if css_class else safe


JIRA_LINK = re.compile(r"\[([^|\]\n]+)\|([^\]\n]+)\]")


def rich(value):
    """Render QMetry/Jira wiki markup: [text|url] links, |cell| table rows, and line breaks."""
    if value is None or value != value or str(value).strip() == "":
        return '<span class="jv-muted">—</span>'
    links = []

    def stash(match):
        links.append(match.groups())
        return f"\x00{len(links) - 1}\x00"

    lines = []
    for line in JIRA_LINK.sub(stash, str(value).strip()).splitlines():
        line = line.strip()
        if not line:
            continue
        if line.startswith("|") and line.endswith("|") and len(line) > 1:
            cells = [c.strip() for c in line.strip("|").split("|") if c.strip()]
            lines.append(f'<div class="jv-li">{escape(" · ".join(cells))}</div>')
        else:
            lines.append(f"<div>{escape(line)}</div>")
    html = "".join(lines)
    for i, (label, url) in enumerate(links):
        href = url if re.match(r"https?://", url) else "#"
        html = html.replace(
            f"\x00{i}\x00", f'<a href="{escape(href)}" target="_blank">{escape(label)}</a>'
        )
    return html


def table(headers, rows, centered=()):
    """Signal Station-style table. headers: list of labels; rows: lists of HTML cell strings."""
    head = "".join(
        f'<th class="{"jv-center" if i in centered else ""}">{escape(h)}</th>' for i, h in enumerate(headers)
    )
    body = "".join(
        "<tr>"
        + "".join(f'<td class="{"jv-center" if i in centered else ""}">{c}</td>' for i, c in enumerate(r))
        + "</tr>"
        for r in rows
    )
    st.markdown(
        f'<div class="jv-table-wrap"><table class="jv-table"><thead><tr>{head}</tr></thead>'
        f"<tbody>{body}</tbody></table></div>",
        unsafe_allow_html=True,
    )
