from html import escape

import streamlit as st

from lib import config, data, theme

theme.apply("Test Steps", active="steps")

cases = data.load_test_cases()
if cases.empty:
    theme.page_heading("Test Steps", "No test cases yet. Upload a QMetry export on the Test Cases page.")
    st.stop()

keys = list(cases["TC_KEY"])
descriptions = dict(zip(cases["TC_KEY"], cases["DESCRIPTION"]))
requested = st.query_params.get("tc_key")
selected = requested if requested in keys else keys[0]

actions = theme.page_heading(
    f"{selected}: {descriptions.get(selected) or ''}",
    "Test steps for this user journey as defined in the QMetry test plan "
    f"<em>{escape(config.TEST_PLAN_NAME)}</em>. Steps are stored in the "
    "<code>jv_test_steps</code> table in Snowflake and refreshed on each QMetry upload.",
)
with actions:
    tc_key = st.selectbox(
        "Test case",
        keys,
        index=keys.index(selected),
        format_func=lambda k: f"{k} — {descriptions.get(k) or ''}",
        label_visibility="collapsed",
    )
    qmetry_url = (
        config.QMETRY_TEST_CASE_URL.format(tc_key=tc_key)
        if config.QMETRY_TEST_CASE_URL
        else config.QMETRY_TEST_PLAN_URL
    )
    st.link_button("Open in QMetry", qmetry_url, use_container_width=True)

if requested and requested not in keys:
    st.warning(f"Test case {requested} was not found.")
if tc_key != selected or requested != tc_key:
    st.query_params["tc_key"] = tc_key
    if tc_key != selected:
        st.rerun()

case = data.load_test_case(tc_key)
details = [
    ("App ID", theme.text(case.get("APP_ID"))),
    ("Priority", theme.text(case.get("PRIORITY"))),
    ("Status", theme.badge(case.get("STATUS"), theme.STATUS_TONES.get(case.get("STATUS"), "gray"))),
    ("Test Type", theme.badge(case.get("TEST_TYPE"), theme.TEST_TYPE_TONES.get(case.get("TEST_TYPE"), "gray"))),
    ("Platform", theme.text(case.get("PLATFORM"))),
    ("Pass/Fail", theme.pass_fail(case.get("PASS_FAIL"))),
]
st.markdown(
    '<div class="jv-detail-grid">'
    + "".join(
        f'<div class="jv-detail"><div class="jv-label">{label}</div><div class="jv-value">{value}</div></div>'
        for label, value in details
    )
    + "</div>",
    unsafe_allow_html=True,
)
if case.get("AUTOMATION_SCRIPT"):
    theme.label("Automation Script")
    st.code(case["AUTOMATION_SCRIPT"], language=None)

steps = data.load_steps(tc_key)
if steps.empty:
    st.info("This test case has no steps in the last QMetry upload.")
else:
    theme.table(
        ["Step #", "Step Summary", "Test Data", "Expected Results"],
        [
            [
                str(int(s.STEP_NO)),
                theme.rich(s.STEP_SUMMARY),
                theme.rich(s.TEST_DATA),
                theme.rich(s.EXPECTED_RESULT),
            ]
            for s in steps.itertuples()
        ],
        centered={0},
    )
