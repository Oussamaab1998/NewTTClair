# Pilot information note: AI provider (DRAFT for the product owner's review)

Status: **draft, not reviewed by a lawyer.** It states only facts checked on the cited pages on 2026-10-17 and what the app does as built; it makes no legal claim. Items marked **OPEN** need legal advice or a decision before any student text is sent to a provider (CLAUDE.md rule 8).

## Current setting (product owner, 2026-10-17)
The LLM is **on whenever a key is present** in the test build (`.env.llm.local`) and the app runs rules-only, silently, without one. There is no gate in code. The verified facts and OPEN items below are for the product owner's decision and for informing parents and teachers; they do not block the build.

**Backlog (not built, removed from the Phase 4 scope by the product owner):**
- a first-run notice to students that some answers come from an AI service;
- a flag that restricts LLM use to internal test builds;
- a filter on student-typed text before it is sent (personal data, unsafe content).
Note: OpenAI's and Anthropic's guidance for products used by minors (below) lists disclosure and content filtering among the expected safeguards.

## What the app sends to the provider (OpenAI) when the LLM is on
- **The exercise content** (statement, question, results the exam gives, and the answers of steps already done; not the current or later steps' answers): our own material.
- **The student's progress on the current exercise, as ids and numbers** (including skill statuses derived from earlier sessions on this device): step ids, skill ids, number of tries, hints used, the option chosen or the number typed, misconception ids, and the state of the on-screen component (e.g. which outcomes were tapped). The planner input has no student id, session id, name or contact field; a unit test enforces that free text appears in only one field (`src/planner/situation.test.ts`).
- **The student's own typed question** (tutor drawer, long-press "ask"), as written. This is the only free text sent. Students may type anything, including personal details; the app cannot guarantee they will not.

## What the app does not send
- No name, phone number, email, school, account id or device identifier (the app has no accounts; the local id is pseudonymous and is not sent).
- No report text (reports stay on the device until exported by the team).
- No API key is ever logged or stored outside the build configuration (tested).

## What OpenAI states about API data (verified 2026-10-17)
Source: "Data controls in the OpenAI platform", https://developers.openai.com/api/docs/guides/your-data (no last-updated date on the page).
- Training: "data sent to the OpenAI API is not used to train or improve OpenAI models" (unless the organization opts in to sharing; we have not).
- Abuse monitoring: "By default, abuse monitoring logs are generated for all API feature usage and retained for up to 30 days", "unless longer retention is required by law". These logs "can contain prompts and responses". **This applies whatever the app sets for `store`.**
- Zero Data Retention / Modified Abuse Monitoring (which exclude customer content from those logs) are "subject to prior approval by OpenAI and acceptance of additional requirements". **We do not have either.**
- Data residency (storage / processing region) is a project setting; regional processing is listed for the United States, Europe (EEA + Switzerland) and the UAE. **Our project has no residency setting configured (OPEN: where processing happens is not verified).**

Source: Responses API reference, https://developers.openai.com/api/reference/resources/responses/methods/create
- `store`: "Defaults to true when omitted. If set to true, response data will be stored for at least 30 days". **The app always sends `store: false`.**
- What `store: false` guarantees beyond that is **not fully described** on the data-controls page: it describes `store: false` only for background requests ("the response is deleted after the temporary polling period"), and its endpoint table lists application-state retention for `/v1/responses` as "None, see below for exceptions". We therefore do not claim that nothing is kept: at minimum the abuse-monitoring retention above still applies.

## OpenAI's guidance for products used by minors (verified 2026-10-17)
Source: "Under-18 guidance", https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance
- "You should not use OpenAI services to process any personal data of children under 13 or the applicable age of digital consent without first implementing zero data retention in our API." **OPEN:** the age of digital consent that applies in Tunisia is not verified; the pilot students' ages must be checked against it. If any student is below it, the LLM must stay off for them unless Zero Data Retention is approved.
- "You are solely responsible for ensuring that you and your users use OpenAI services in compliance with applicable law."
- Listed safety measures "may include": age-appropriate disclosures about AI tools, age-appropriate content filters, monitoring and reporting with escalation paths for high-risk interactions, age assurance where required. **OPEN:** which of these the pilot needs (we have: a Report button on every AI block, AI labels on AI blocks, engine checks of math claims; we do not have: content filtering of student input, an escalation path, a first-run notice).
- OpenAI "reserves the right to audit organizations for compliance with this policy."

## For comparison: Anthropic (a possible second provider; verified 2026-10-17, not used yet)
Sources: "API and data retention", https://platform.claude.com/docs/en/manage-claude/api-and-data-retention ; "How long do you store my organization's data?", https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data (updated July 1, 2026); "Responsible Use of Anthropic's Models: Guidelines for Organizations Serving Minors", https://support.claude.com/en/articles/9307344-responsible-use-of-anthropic-s-models-guidelines-for-organizations-serving-minors (updated March 16, 2026).
- Default API retention: "we automatically delete inputs and outputs on our backend within 30 days of receipt or generation", except: flagged usage-policy violations ("We retain inputs and outputs for up to 2 years and trust and safety classification scores for up to 7 years"), "as required by law", longer-retention features under the customer's control (e.g. Files API), or a zero data retention agreement.
- Training: "Retained data is never used for model training without your express permission."
- Zero data retention: "Anthropic does not store customer prompts or responses at rest after the API response is returned"; requested through the sales team, "enabled per organization". Even then, "Anthropic may retain data where required by law or where it has been flagged", "for up to 2 years".
- Minors: safeguards expected when minors "directly interact with products that incorporate our API(s)": "Age verification systems", "Content moderation and filtering", "Monitoring and reporting mechanisms", "Educational resources and guidance for minors"; "Organizations must disclose to their users that they are interacting with an AI system rather than a human"; compliance with child-safety and privacy law "should be clearly stated on the organization's website"; "Anthropic will periodically audit organizations". The page states no age limit and no approval step.
- Not checked: Anthropic's usage policy text in force after 2026-11-12 (a new version is published with that effective date).

## Suggested text for parents and teachers (to be reviewed and translated; not legal wording)
> During this test, the app can send the questions your child types, together with their progress on the current exercise (as numbers, not names), to an AI service (OpenAI) to help choose the next explanation. The AI service states that this data is not used to train its models, and that it may keep it for up to 30 days for abuse monitoring, or longer if the law requires. The app does not send names or contact details, but it cannot stop a student from typing personal information in a question; please ask students not to. You can ask us to turn the AI off for your child; the app then works without it.

## OPEN items (legal advice / decisions)
1. Tunisian rules for processing minors' data with a foreign processor (consent, who must consent, notification to the national authority, cross-border transfer). Not checked.
2. Applicable age of digital consent in Tunisia vs the pilot students' ages (OpenAI under-18 guidance above).
3. Whether to request Zero Data Retention or Modified Abuse Monitoring, and/or a data-residency region.
4. Content filtering and escalation path for student-typed text.
5. Retention of reports, saved questions and events on the device and after export (who holds the exported files, for how long). Current setting, to confirm: events older than 90 days are deleted on the device; at most about 2,000 events are kept.
