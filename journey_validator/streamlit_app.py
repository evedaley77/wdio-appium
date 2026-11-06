from html import escape
from urllib.parse import quote

import pandas as pd
import streamlit as st

from lib import config, data, theme
from lib.qmetry_import import COLUMN_MAP, parse

theme.apply("Test Cases", active="cases")
st.session_state.setdefault("editor_version", 0)

if st.session_state.pop("import_message", None):
    st.toast(st.session_state.pop("import_detail", "Import complete."))


@st.dialog("Upload QMetry test cases", width="large")
def upload_dialog():
    st.caption("CSV or XLSX export from the QMetry test plan, one row per test step.")
    uploaded = st.file_uploader("QMetry export", type=["csv", "xlsx", "xls"], label_visibility="collapsed")
    if uploaded is None:
        with st.expander("Recognized column headers"):
            for field, aliases in COLUMN_MAP.items():
                st.markdown(f"**{field}**: {', '.join(aliases)}")
        st.caption(f"Storage: {data.get_store().name}")
        return

    try:
        parsed = parse(uploaded.name, uploaded.getvalue())
    except Exception as exc:
        st.error(f"Could not read {uploaded.name}: {exc}")
        return

    c1, c2, c3 = st.columns(3)
    c1.metric("Test cases", len(parsed.cases))
    c2.metric("Steps", len(parsed.steps))
    c3.metric("Cycles", len(parsed.cycles))
    for warning in parsed.warnings:
        st.warning(warning)
    st.dataframe(parsed.cases, hide_index=True, use_container_width=True, height=240)
    st.caption("Column mapping: " + ", ".join(f"{h} → {f}" for f, h in parsed.mapped.items()))
    if parsed.unmapped:
        st.caption("Ignored columns: " + ", ".join(map(str, parsed.unmapped)))
    st.caption(
        "Existing Status, Pass/Fail, and Automation Script values are kept. "
        "Steps for these test cases are replaced."
    )
    if st.button(f"Import {len(parsed.cases)} test cases", type="primary", use_container_width=True):
        data.save_import(parsed)
        st.session_state.editor_version += 1
        st.session_state.import_message = True
        st.session_state.import_detail = f"Imported {len(parsed.cases)} test cases and {len(parsed.steps)} steps."
        st.rerun()


def platform_filter():
    theme.label("Platform")
    if hasattr(st, "pills"):
        return st.pills(
            "Platform", config.PLATFORM_OPTIONS, selection_mode="multi", label_visibility="collapsed"
        ) or []
    return st.multiselect("Platform", config.PLATFORM_OPTIONS, label_visibility="collapsed")


def cycle_filter(cycles):
    theme.label("Test Cycles")
    options = [config.ALL_CYCLES, *cycles["CYCLE_KEY"]]
    names = dict(zip(cycles["CYCLE_KEY"], cycles["CYCLE_NAME"]))
    choice = st.selectbox(
        "Test Cycles", options, format_func=lambda key: names.get(key, key), label_visibility="collapsed"
    )
    return None if choice == config.ALL_CYCLES else choice


def apply_filters(cases, platforms, cycle_key):
    if platforms:
        wanted = set(platforms)
        cases = cases[
            cases["PLATFORM"].fillna("").map(lambda p: bool(wanted & {x.strip() for x in p.split(",")}))
        ]
    if cycle_key:
        cases = cases[cases["TC_KEY"].isin(data.load_cycle_tc_keys(cycle_key))]
    return cases


def steps_url(tc_key):
    return f"{config.STEPS_PAGE_URL}?tc_key={quote(tc_key)}"


def render_view(cases):
    rows = [
        [
            f'<a href="{escape(steps_url(r.TC_KEY))}" target="_blank">{escape(r.TC_KEY)}</a>',
            theme.text(r.DESCRIPTION),
            theme.text(r.APP_ID),
            theme.text(r.PRIORITY),
            theme.badge(r.STATUS, theme.STATUS_TONES.get(r.STATUS, "gray")),
            theme.badge(r.TEST_TYPE, theme.TEST_TYPE_TONES.get(r.TEST_TYPE, "gray")),
            theme.text(r.PLATFORM),
            theme.text(r.AUTOMATION_SCRIPT, "jv-mono"),
            theme.pass_fail(r.PASS_FAIL),
        ]
        for r in cases.itertuples()
    ]
    theme.table(
        [
            "TC_Key #",
            "Description",
            "App ID",
            "Priority",
            "Status",
            "Test Type",
            "Platform",
            "Automation Script",
            "Pass/Fail",
        ],
        rows,
        centered={3, 8},
    )


def _normalized(df):
    values = df[config.EDITABLE_COLUMNS]
    return values.astype(object).where(pd.notna(values), None).replace({"": None})


def render_editor(cases):
    view = cases.set_index("TC_KEY", drop=False)
    view.insert(0, "TC_LINK", [steps_url(k) for k in view["TC_KEY"]])
    view = view.drop(columns=["TC_KEY"])

    edited = st.data_editor(
        view,
        key=f"cases_editor_{st.session_state.editor_version}_{hash(tuple(view.index))}",
        hide_index=True,
        use_container_width=True,
        num_rows="fixed",
        column_order=[
            "TC_LINK",
            "DESCRIPTION",
            "APP_ID",
            "PRIORITY",
            "STATUS",
            "TEST_TYPE",
            "PLATFORM",
            "AUTOMATION_SCRIPT",
            "PASS_FAIL",
        ],
        disabled=["TC_LINK", "DESCRIPTION", "APP_ID", "PRIORITY"],
        column_config={
            "TC_LINK": st.column_config.LinkColumn(
                "TC_Key #", display_text=r"tc_key=(.*)$", help="Open test steps in a new tab"
            ),
            "DESCRIPTION": st.column_config.TextColumn("Description", width="large"),
            "APP_ID": st.column_config.TextColumn("App ID"),
            "PRIORITY": st.column_config.TextColumn("Priority", width="small"),
            "STATUS": st.column_config.SelectboxColumn("Status", options=config.STATUS_OPTIONS, required=True),
            "TEST_TYPE": st.column_config.SelectboxColumn(
                "Test Type", options=config.TEST_TYPE_OPTIONS, required=True
            ),
            "PLATFORM": st.column_config.SelectboxColumn("Platform", options=config.PLATFORM_EDIT_OPTIONS),
            "AUTOMATION_SCRIPT": st.column_config.TextColumn(
                "Automation Script", help="e.g. test/specs/android/TC001_HomepageLoad.spec.js"
            ),
            "PASS_FAIL": st.column_config.SelectboxColumn("Pass/Fail", options=config.PASS_FAIL_OPTIONS),
        },
    )

    before = _normalized(view)
    after = _normalized(edited)
    same = (before == after) | (before.isna() & after.isna())
    changed_keys = list(after.index[~same.all(axis=1)])

    left, right = st.columns([4, 1])
    left.caption(
        f"{len(changed_keys)} unsaved change(s)"
        if changed_keys
        else "Edit Status, Test Type, Platform, Automation Script, or Pass/Fail inline, then save."
    )
    if right.button("Save changes", type="primary", disabled=not changed_keys, use_container_width=True):
        data.save_case_edits(after.loc[changed_keys].rename_axis("TC_KEY").reset_index())
        st.session_state.editor_version += 1
        st.toast(f"Saved {len(changed_keys)} test case(s).")
        st.rerun()


actions = theme.page_heading(
    "Test Cases",
    "Browse and manage CNN user journey test cases from the QMetry test plan "
    f"<em>{escape(config.TEST_PLAN_NAME)}</em> — track status, test type, automation scripts, "
    "and pass/fail results, or import test cases from a QMetry export. Test cases and steps are "
    "stored in the <code>jv_test_cases</code> and <code>jv_test_steps</code> tables in Snowflake.",
)
with actions:
    b1, b2 = st.columns(2)
    b1.link_button("QMetry test plan", config.QMETRY_TEST_PLAN_URL, use_container_width=True)
    if b2.button("Upload test cases", type="primary", use_container_width=True):
        upload_dialog()

cases = data.load_test_cases()
if cases.empty:
    st.info("No test cases yet. Use Upload test cases to import a QMetry export.")
    st.stop()

f1, f2 = st.columns([3, 1.4], vertical_alignment="bottom")
with f1:
    platforms = platform_filter()
with f2:
    cycle_key = cycle_filter(data.load_cycles())

filtered = apply_filters(cases, platforms, cycle_key)

s1, s2 = st.columns([4, 1], vertical_alignment="center")
s1.markdown(
    '<div class="jv-summary">'
    f"<b>{len(filtered)}</b> test cases · "
    f"<b>{int((filtered['STATUS'] == 'Done').sum())}</b> done · "
    f"<b>{int((filtered['PASS_FAIL'] == 'Pass').sum())}</b> pass · "
    f"<b>{int((filtered['PASS_FAIL'] == 'Fail').sum())}</b> fail"
    "</div>",
    unsafe_allow_html=True,
)
edit_mode = s2.toggle(
    "Edit", help="Switch to inline editing of Status, Test Type, Platform, Automation Script, and Pass/Fail"
)

if filtered.empty:
    st.warning("No test cases match the selected filters.")
elif edit_mode:
    render_editor(filtered)
else:
    render_view(filtered)
