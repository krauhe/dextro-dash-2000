<!-- doc-version: 2026-09-06-v1 -->

# Regulatory design boundaries — EU MDR and US FDA

Reviewed: 2026-09-06. Scope: DEXTRO DASH 2000, including its public game, documentation, level tools and promotional material.

These are conservative project requirements, not legal advice, a regulatory determination or a guarantee of exclusion. Their purpose is to keep the actual product non-medical, not to disguise medical functionality. If a proposed function has a medical intended purpose, stop and assess the appropriate regulatory route instead of changing its label.

## 1. Intended purpose

DEXTRO DASH 2000 is an arcade game in which players control the fictional character DEX through platform levels. A simulated physiological system creates gameplay consequences. Any educational value concerns general phenomena observed in fiction, not the assessment or management of a real person's condition.

The game is not intended to diagnose, monitor, predict, prevent or treat a person's condition, determine treatment, or control medical equipment. It accepts no personal treatment parameters or measured glucose data. This statement must remain consistent with implementation and public claims.

## 2. Regulatory findings

### 2.1 European Union

The relevant regulation is **MDR**, Regulation (EU) 2017/745. Article 2(1) concerns medical intended purposes; Article 2(12) includes information supplied in instructions and promotional statements when defining intended purpose. MDCG 2019-11 Rev.1 explains software qualification, including individual-patient benefit and medical purpose. Its generic-information examples support a distinction from individual decision support; they do not automatically exempt every educational simulation. [EU1, sections 2 and 3.2](https://health.ec.europa.eu/document/download/b45335c5-1679-4c71-a91c-fc7a4d37f12b_en?filename=mdcg_2019_11_en.pdf).

Qualification comes before classification. Annex VIII Rule 11 addresses diagnostic/therapeutic decision-support software, generally class IIa with higher classes depending on potential consequences. It is not a rule making every non-medical program class I. Accessories also require consideration. A fictional visual style, hidden algorithm or disclaimer does not settle these questions. [EU1, sections 3–4](https://health.ec.europa.eu/document/download/b45335c5-1679-4c71-a91c-fc7a4d37f12b_en?filename=mdcg_2019_11_en.pdf).

### 2.2 United States

FDA applies device-software policy across platforms, including browsers. It distinguishes non-device functions from device functions subject to enforcement discretion and those receiving active oversight. These categories are not interchangeable. Appendix A includes educational functions and simulation games without clinical assessment; a game used as treatment is not necessarily equivalent. Real insulin-pump control is an explicit oversight example. [US1, sections IV–V and Appendix A](https://www.fda.gov/media/80958/download).

The January 29, 2026 CDS guidance describes the four statutory non-device CDS criteria under FD&C Act section 520(o)(1)(E), including recommendations to healthcare professionals and independent review of their basis. It is not a general exemption for patient-facing treatment advice. Publishing source code does not by itself establish that exclusion. [US2, sections II–IV](https://www.fda.gov/media/109618/download).

**Project position:** do not rely on enforcement discretion, a “wellness” label, open-source licensing or an undisclosed controller as an exemption. Preserve the non-medical purpose in both function and claims. Obtain qualified assessment if uncertain.

## 3. Mandatory project boundaries

These are deliberately conservative engineering choices, not a claim that every listed restriction is individually required by law.

1. **Never recommend dosing to the player.** No recommended insulin amount, timing, interval, number of button presses or sequence. This also prohibits “DEX needs…”, optimal-dose ghosts, suggested corrections and post-level “you should have dosed…” feedback. The restriction applies even when framed as advice for DEX.
2. **No implicit dosing coach.** Do not flash Z, activate an insulin arrow or send a treatment prompt because BG/IOB/COB crossed a threshold. BG warnings report DEX's state only. Do not generate suggested carbohydrate amounts or meal/exercise plans as a substitute for insulin recommendations.
3. **Fixed fictional subjects only.** No public entry, import or calibration of weight, insulin sensitivity, carbohydrate ratio, basal schedule, personal glucose, medical history or treatment plan. This includes URL parameters, public debug panels, save imports and localStorage. Choosing a pre-authored character must not become “find the one that matches your body”.
4. **No real medical integration.** No CGM/pump/pen/health-record connections, notification relays, real glucose alarms, device settings or control commands. The drawn CGM and pump belong only to DEX.
5. **No personal predictions or clinical exports.** No predicted real-world BG, treatment comparisons, dose calculators, clinician reports, prescription output or transferable care plan. Fictional scores/maps are acceptable; patient-like exports are not part of this product.
6. **Keep the controller internal to gameplay.** Do not expose a user-facing recommendation API or make its parameters adjustable to fit a person. It may apply actions to DEX; never describe it as validated automated insulin delivery. Its source remains open: obscurity is not a safety measure.
7. **No treatment-outcome claims.** Do not claim improved HbA1c, prevention of hypoglycaemia, safe insulin selection, clinical equivalence or replacement of diabetes care. “Explore DEX's simulated responses” is appropriate; “learn the right dose for yourself” is not. Review screenshots, captions, store descriptions and social posts too.
8. **Preserve accurate science without overstating applicability.** Ordinary food macronutrients and a physiology engine can remain. Do not deliberately falsify physiology to appear non-medical. Accelerated time and fixed game doses must never be converted into real-world instructions. Model tests demonstrate their stated scope, not clinical validation.
9. **No clinical competency scoring.** Rewards concern game performance. Do not certify readiness to self-manage diabetes, rate a player's treatment competence or prescribe mandatory clinical training based on play.
10. **No personalised AI advice.** A future assistant must not accept the player's health data or answer what treatment to take. Adding an AI coach, clinician workflow or therapeutic-use partnership requires a new scope assessment before implementation.

## 4. Text and UI boundary examples

| Permitted description of the game | Prohibited recommendation or claim |
| --- | --- |
| “Press Z to use a stored charge for DEX.” — static equipment tutorial | “DEX's BG is high: press Z twice now.” |
| “2/3 charges” — inventory | “Recommended: 2 charges.” |
| “DEX used 1 U” — past simulated action | “DEX needs 1 U to reach the target.” |
| “DEX's glucose is low.” — state warning | “Use this amount of sugar, then wait this long.” |
| “Candy changes DEX's simulated glucose.” | “This teaches you to correct your own glucose safely.” |

A factual dose display is not automatically a recommendation. Keep it clearly attached to an already executed fictional action, not a future instruction or a clinical example calculation. Do not remove every number merely to obscure functionality.

Suggested short notice: “DEX is fictional. Glucose values and equipment actions are simulated game events, not instructions for your diabetes care.” It should be accessible from the game's information/credits; this document does not add a new popup or claim that a notice alone is sufficient.

## 5. Feature and release gate

Before approving a new feature or public claim, record:

1. Does it use a real person's information, or allow the fixed character to be fitted to a person?
2. Does it suggest an amount, timing or sequence, including indirectly through UI cues?
3. Does it monitor, predict, diagnose, treat or control something outside the fictional game?
4. Does any public wording imply clinical benefit, dosing competence or medical validation?
5. Can an import/export/debug path turn it into a usable personal decision tool?

Any “yes” or uncertainty blocks implementation/release under this scope until reviewed with the project owner and, where appropriate, a qualified EU/US regulatory specialist. Owner approval does not override legal obligations or silently remove the no-dosing rule.

For a release, inspect all player strings and contextual triggers, not only keyword matches. Inspect public runtime inputs, exports and upstream engine changes. Record reviewer, date, findings and test evidence. Recheck current authoritative guidance before a material scope change or a new market release. Do not claim exemption, FDA clearance/approval or medical CE status without an applicable determination/authorization.

## 6. Current implementation notes — not a compliance audit

1. Existing pump hints describe equipment use, not a BG-conditioned recommended dose. Inventory and past-action labels are distinguishable from advice. Retain this distinction.
2. README previously stated categorically that this was “not a medical device”. That wording is replaced with intended-use language; no formal classification is asserted.
3. The public game exposes debugging helpers, while the repository contains a configurable engine and detailed model parameters. Do not add personal-data paths. Review the developer/public boundary before expanding tools; open source alone is not a problem or an exemption.
4. No runtime, controller, model, UI alarm or gameplay change was made for this documentation task. This document is not evidence that every future or current path has passed a complete regulatory audit. Non-device status would not remove other applicable consumer, privacy or child-protection obligations.

## 7. Sources and verification

1. **EU1:** MDCG 2019-11 Rev.1, June 2025, *Guidance on Qualification and Classification of Software*, especially sections 2, 3.2 and 4.2.1. [Official PDF](https://health.ec.europa.eu/document/download/b45335c5-1679-4c71-a91c-fc7a4d37f12b_en?filename=mdcg_2019_11_en.pdf). Non-binding interpretation of MDR/IVDR, not the regulation itself.
2. **US1:** FDA, *Policy for Device Software Functions and Mobile Medical Applications*, September 28, 2022. [Official PDF](https://www.fda.gov/media/80958/download). The currently served file includes a QMSR notice concerning February 2, 2026; that cover notice does not turn it into a newly issued 2026 software-policy guidance.
3. **US2:** FDA, *Clinical Decision Support Software*, January 29, 2026, superseding January 6, 2026. [Official PDF](https://www.fda.gov/media/109618/download). FDA guidance contains non-binding recommendations; cited statutory provisions have a different legal status.

All three linked PDFs were fetched from the local PC on 2026-09-06, returned HTTP 200, and their extracted title/date text matched these citations. EUR-Lex's MDR PDF endpoint returned HTTP 202 with an empty body; direct local verification of the regulation text was therefore unsuccessful. The EU discussion above relies on the verified MDCG guidance's identification and explanation of MDR provisions. This limitation must be resolved against current law for a formal legal opinion.
