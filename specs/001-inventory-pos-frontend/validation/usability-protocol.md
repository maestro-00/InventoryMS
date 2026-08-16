# Usability validation protocol

Created: 2026-08-13 (T063)
Applies to: `001-inventory-pos-frontend`

This is the method referenced by every usability validation record in this feature. Each
user story records its results in `validation/usability-<story>.md` using the structure
below. The protocol exists so results are comparable between stories and between runs.

## Purpose

Confirm that a representative operator can complete a story's primary journey
unassisted, on the devices they actually use, within the time and error budgets the
specification claims. Functional tests prove the software works; this protocol asks
whether a person can work it.

## Participants

- 5 participants per story, recruited to match the story's primary role (for US1: an
  owner or manager of a small Ghanaian retail business who has not used this product).
- Screening: owns or manages the business, handles pricing or stock decisions, has not
  seen this build before, uses a smartphone daily.
- Exclusions: anyone who contributed to the specification, implementation, or review.
- Compensation and consent are arranged before the session; recordings require written
  consent and are deleted after the findings are written up.

## Environment

- Participant's own phone where possible; otherwise a 320 px-wide and a 1440 px-wide
  browser on the facilitator's hardware.
- A seeded test tenant per participant, never shared and never production data.
- A live InventoryX instance. If only a mocked backend is available, the record must say
  so and the run does not count as release evidence.
- Network conditions representative of the deployment target, including one deliberately
  degraded segment where the story covers offline or retry behaviour.

## Roles

- **Facilitator**: reads the tasks, keeps the participant talking, never demonstrates the
  interface or explains what a control does.
- **Observer/notetaker**: records timings, errors, assists, and verbatim quotes. Does not
  speak to the participant.

## Session structure (45 minutes)

1. Consent, purpose, and the "we are testing the software, not you" framing (5 min).
2. Background: current tools, biggest daily frustration (5 min).
3. Task scenarios, read one at a time from the story's record, thinking aloud (25 min).
4. Debrief: perceived difficulty, single-change request, willingness to adopt (10 min).

## Task scenarios

Each story record lists its own tasks. A task must be phrased as a business outcome
("record what you have on the shelf so the till knows"), never as an interface
instruction ("tap Opening stock, then Save"). Every task states its own success
condition, checked from the data the backend holds afterwards rather than from what the
screen appears to say.

## Measures

| Measure      | Definition                                                                 |
| ------------ | -------------------------------------------------------------------------- |
| Task success | Unassisted (no facilitator input), assisted (one hint), or failed          |
| Time on task | From the end of the task reading to the success condition being met        |
| Errors       | Any action the participant had to undo or repeat to progress               |
| Assists      | Count of facilitator hints                                                 |
| Severity     | 1 cosmetic, 2 minor, 3 serious (task completed with difficulty), 4 blocker |
| Confidence   | Post-task: "how sure are you that this saved correctly?" (1–5)             |

## Exit criteria

A story passes usability validation when, across the 5 participants:

- every task reaches at least 80% unassisted success;
- no severity-4 finding remains open;
- every severity-3 finding has an owner and a task number;
- median time on task is within the story's stated budget;
- median confidence is 4 or higher on any task that writes money or stock.

## Reporting

The story record contains: run date, protocol version, participants (role and count, no
identifying detail), environment including whether the backend was live, the task table
with per-task measures, findings ordered by severity with owners, and an explicit
statement of exit-criteria pass or fail.

## Substitute walkthrough when participants are unavailable

A structured self-run walkthrough may stand in when recruitment has not happened yet. It
is a design review, not usability evidence, and it must:

- follow the same tasks and success conditions as the participant protocol;
- report only what was observed by the walker, with no participant counts, success
  percentages, times, or confidence scores presented as measured on users;
- state prominently that no human participants took part and that the full protocol must
  be re-run before release.
