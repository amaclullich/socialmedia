export const meta = {
  name: 'geri200-produce-text',
  description: 'Per category: research and verify evidence, write posts from the evidence only, adversarial fact-check, fix, cold plain-English read, fix',
  phases: [
    { title: 'Research', detail: 'find and open sources, record supporting passages' },
    { title: 'Write', detail: 'posts from the evidence library only' },
    { title: 'Fact-check', detail: 'independent, re-opens sources' },
    { title: 'Fix', detail: 'apply blockers and checker hits' },
    { title: 'Cold read', detail: 'Plain Reading Scale, text only' },
    { title: 'Fix 2', detail: 'apply cold-read fixes, final checker pass' },
  ],
}

const ROOT = '/home/user/socialmedia/geriatrics-200_2026-09-25'
const TODAY = '2026-09-25'
const cats = args.categories // [{id, name, allocation, batches: [[cand_id...], ...]}]

const RSUM = { type: 'object', properties: { batch: { type: 'string' }, file: { type: 'string' }, n_sources: { type: 'integer' }, n_claims: { type: 'integer' }, ready: { type: 'array', items: { type: 'string' } }, revise: { type: 'array', items: { type: 'string' } }, drop: { type: 'array', items: { type: 'string' } }, access_problems: { type: 'string' } }, required: ['batch', 'file', 'n_sources', 'n_claims', 'ready', 'drop'] }
const WSUM = { type: 'object', properties: { category: { type: 'string' }, file: { type: 'string' }, n_posts: { type: 'integer' }, used_cands: { type: 'array', items: { type: 'string' } }, short_of_allocation_by: { type: 'integer' }, notes: { type: 'string' } }, required: ['category', 'file', 'n_posts', 'used_cands'] }
const CSUM = { type: 'object', properties: { category: { type: 'string' }, file: { type: 'string' }, n_blockers: { type: 'integer' }, n_major: { type: 'integer' }, n_minor: { type: 'integer' }, posts_to_drop: { type: 'array', items: { type: 'string' } }, notes: { type: 'string' } }, required: ['category', 'file', 'n_blockers', 'n_major', 'n_minor'] }
const FSUM = { type: 'object', properties: { category: { type: 'string' }, n_posts: { type: 'integer' }, n_changes: { type: 'integer' }, dropped: { type: 'array', items: { type: 'string' } }, unresolved: { type: 'array', items: { type: 'string' } }, checker_clean: { type: 'boolean' }, notes: { type: 'string' } }, required: ['category', 'n_posts', 'n_changes', 'checker_clean'] }
const RDSUM = { type: 'object', properties: { category: { type: 'string' }, file: { type: 'string' }, n_variants: { type: 'integer' }, n_fail: { type: 'integer' }, n_fix: { type: 'integer' }, controls_failed: { type: 'boolean' } }, required: ['category', 'file', 'n_variants', 'n_fail', 'n_fix', 'controls_failed'] }

const READ_FIRST = `${ROOT}/_system/STYLE.md, ${ROOT}/_system/PLATFORMS.md and ${ROOT}/_system/CATEGORIES.md`
function selNotes(c) {
  const g = c.writer_guidance ? JSON.stringify(c.writer_guidance) : 'none'
  const f = c.fallbacks ? JSON.stringify(c.fallbacks) : 'none'
  return `Selection for this category: selected ${JSON.stringify(c.selected || [])}; reserves ${JSON.stringify(c.reserves || [])}; fallbacks (reserve to use if a selected candidate fails) ${f}. Editor's guidance, which you must follow: ${g}. Editor's reasons: ${c.reasons || 'none'}`
}

function researchPrompt(c, batch, bi) {
  const bid = `${c.id}-B${bi + 1}`
  return `You are the evidence researcher for a collection of social media posts on geriatric medicine for Professor Alasdair MacLullich. You find and verify facts. You do NOT write posts. Batch ${bid}, category ${c.id} ${c.name}. Today is ${TODAY}.

Read first: ${READ_FIRST} (section 9 of STYLE.md is the evidence standard you must apply). Then read the candidate concepts ${batch.join(', ')} in ${ROOT}/_working/candidates/${c.id}.json, and the judge's notes on them in ${ROOT}/_working/selection/${c.id}_scores.json (accuracy_concern and sharpen fields).
${selNotes(c)}
Before searching, look in ${ROOT}/evidence/batches/ for evidence files other batches have already written; reuse any source there that fits (re-open it yourself to confirm the passage you need).

For each candidate:
1. Decide the essential claims the post would depend on (start from claims_needing_evidence; sharpen, split or drop claims; add any the angle needs). Also list every number the candidate wants to use.
2. Find the best source for each claim. Tools (load them with ToolSearch):
   - PubMed MCP (mcp__PubMed__search_articles, get_article_metadata for abstracts, convert_article_ids, get_full_text_article for PMC full text, find_related_articles). Primary tool for clinical claims.
   - Undermind (mcp__Undermind__search_papers; call get_orientation first) and Consensus (mcp__Consensus__search, at most 3 calls at a time) and Scite (mcp__Scite__search_literature, which also shows editorial notices) to discover papers. Always confirm what you use on PubMed or in full text.
   - Google Drive (mcp__Google_Drive__search_files, read_file_content) can open PDFs of guidelines and reports already saved in Alasdair's Drive (for example CPOC-BGS frailty guideline 2021, BGS blueprint, RCEM reports). Read-only: never create, edit or move Drive files.
   - WebSearch can locate official documents, but official web pages cannot be opened from this environment (WebFetch is blocked). A search-engine extract alone is recorded as access "search_extract" and is not enough for an essential claim.
   Prefer: systematic reviews and meta-analyses, large trials, large cohorts, national audits and official statistics, major guidelines (NICE, SIGN, BGS, WHO, specialist societies). Prefer recent evidence for current practice; use older high-quality work where it remains the right source.
3. Open the source and read the relevant part. Copy the supporting passage VERBATIM (abstract or full-text sentence or table result). Check population, setting, intervention or exposure, comparator, outcome and timeframe. Check whether the finding is association or causation, relative or absolute, screening or diagnosis, subgroup or whole study, adjusted or crude. Check for important conflicting evidence or uncertainty that could change the conclusion. Check the PubMed record or Scite for a correction or retraction and record the check.
4. Write the safe wording: the most accurate plain-English statement the post may make, with the qualifications it must carry. If the candidate's intended claim is stronger than the evidence, say so and give the wording the evidence does support. Never invent numbers, quotations or references. PMIDs, DOIs and URLs come only from tool output.
5. Set the candidate status: "ready" (all essential claims supported), "revise" (supportable with a changed angle or wording; give the revised angle), or "drop" (an essential claim is unsupported; say which).

Work economically; usage is limited. Aim for 2 to 4 sources per candidate. Read the abstract first and open full text only when a figure or passage you need is not in the abstract (no more than about 5 full texts in the whole batch unless essential). Stop searching once a strong source supports the claim as worded. Scite may be at its monthly usage limit: if so, check for corrections and retractions in PubMed (search the PMID with retracted publication[pt] and look for a linked erratum) and record that. Never open confidential documents found in Drive (case files, witness statements, care records); use only published guidelines, reports and papers.

Write JSON to ${ROOT}/evidence/batches/${bid}.json:
{"batch": "${bid}", "category": "${c.id}", "date_checked": "${TODAY}",
 "sources": [{"key": "PMID:12345678" or "DOI:10..." or "DRIVE:<file id>" or "URL:<url>", "citation": "Vancouver-style citation", "pmid": "...", "pmcid": "... or null", "doi": "... or null", "public_url": "https://doi.org/... or https://pubmed.ncbi.nlm.nih.gov/<pmid>/", "design": "...", "population_setting": "...", "year": 2024, "access": "full_text|abstract|official_document|search_extract", "tool_used": "...", "correction_check": "...", "quality_note": "..."}],
 "claims": [{"claim_id": "<cand_id>-a", "cand_id": "...", "claim": "...", "source_keys": ["..."], "supporting_passage": "verbatim text", "location": "e.g. Abstract, Results", "pico_timeframe": "population / exposure / comparator / outcome / timeframe as studied", "claim_type": "empirical|guideline recommendation|service or policy fact|definition", "verdict": "supported|supported_with_qualification|partly_supported|not_supported|not_found", "safe_wording": "...", "qualifications": "...", "conflicting_or_uncertain": "...", "numbers": [{"value": "...", "meaning": "denominator, timeframe, absolute or relative"}]}],
 "candidates": [{"cand_id": "...", "status": "ready|revise|drop", "reason": "...", "revised_angle": "... or null", "essential_claim_ids": ["..."]}]}
Confirm the file parses with python3. Your final answer is the summary object only.`
}

function writePrompt(c) {
  return `You write social media posts for Professor Alasdair MacLullich, professor of geriatric medicine at the University of Edinburgh, for X, LinkedIn, Bluesky and Threads. Category ${c.id} ${c.name}. You write ${c.allocation} posts. You may use ONLY facts recorded in the evidence files; you do not search for new facts.

Read first, in full: ${READ_FIRST}; ${ROOT}/_working/earlier_collection/DIGEST.md (do not repeat its arguments or openings); ${ROOT}/_working/candidates/${c.id}.json; ${ROOT}/_working/selection/${c.id}_scores.json; every file ${ROOT}/evidence/batches/${c.id}-B*.json.

${selNotes(c)}
Write a post for each selected candidate whose research status is "ready" or "revise" (use the revised angle for "revise"). If a selected candidate is "drop", replace it with its fallback reserve (or the best "ready" reserve that is not a near duplicate of a selected post). Never use a "drop" candidate. If fewer than ${c.allocation} candidates are usable, write as many as you can and report the shortfall; do not pad with weak or unsupported posts. Follow the editor's guidance for each candidate.

For each post:
- Every factual statement (captions, visual text, alt text) must come from a claim with verdict supported or supported_with_qualification, using its safe_wording and qualifications. Record the claim ids you used. Opinion and ethical judgement are allowed when the wording marks them as judgement ("We should...", "It is wrong to...") and they follow the values in STYLE.md section 3; never dress a judgement as a finding. No invented patients, numbers, quotations or anecdotes; no first-person clinical experience.
- The four captions carry the same central claim and the same necessary qualifications. Write each at the length the idea needs, within PLATFORMS.md: X about 400 to 700 characters (up to about 1,400 if needed, always shorter than LinkedIn); LinkedIn 900 to 2,200; Bluesky 300 characters or fewer INCLUDING spaces, line breaks and any hashtag (count them; write it from the finding, never by chopping the long version); Threads 500 or fewer. Short paragraphs separated by blank lines. Hashtags only on a final separate line, sparingly (most posts none).
- Openings: concrete, intelligible without context, varied across your set (no two posts in your set may open with the same construction). Deliver the insight inside the post. No teasers.
- Address older people directly ("you") where the audience is public and it fits. Use plain English per STYLE.md section 5; define every term at first use for public posts.
- About 1 post in 10 may carry a specific, natural invitation to follow (never a posting schedule).
- Visual brief: choose the format that best explains the idea: statement card, comparison, checklist or question card, diagram (flow, timeline, cycle, cascade), chart (bars or 10 by 10 icon array, only from verified numbers with denominator and timeframe), carousel (2 to 4 slides), drawn illustration, comic strip (3 or 4 panels, captions under panels, illustrative dialogue only, labelled as an illustration), or annotated scene (a drawn room or bedside with numbered callouts). Use a mixture across your set: at least 3 different formats, and at least 2 of your posts should be drawn illustrations, comics or annotated scenes. Specify ALL text that will appear on the visual (headline under 12 words where possible, body text sparing), the data values with their claim ids for any chart, and what any drawing must show (people, setting, equipment, posture) in credible, respectful, varied terms. No writable surfaces with text inside drawings: all words are laid out separately. Visual contrasts only where the comparison is accurate. Illustrative examples must be labelled "Illustrative example".
- Alt text: one per slide, 400 characters or fewer, carrying the finding, the numbers, the comparison and any limitation shown.
- source_reply: one short line with public links (https://doi.org/..., https://pubmed.ncbi.nlm.nih.gov/.../ or an official page) for the sources a reader would want.

Write JSON to ${ROOT}/posts/${c.id}_posts.json:
{"category": "${c.id}", "category_name": "${c.name}", "posts": [{
 "tmp_id": "${c.id}-P01", "cand_id": "...", "category": "${c.id}", "audience": "practitioners|public|both", "series": "...", "post_type": "teaching|public_explanation|evidence_interpretation|criticism|good_care|decision_support",
 "title": "short working title", "insight": "the useful insight in one or two plain sentences", "angle": "the editorial angle and the position taken",
 "position_basis": "empirical finding | clinical interpretation | ethical judgement | mixed (say which part is which)",
 "captions": {"x": "...", "linkedin": "...", "bluesky": "...", "threads": "..."},
 "source_reply": "Sources: https://...",
 "claims_used": ["..."], "sources_used": ["PMID:..."],
 "visual_brief": {"format": "...", "slides": [{"n": 1, "purpose": "...", "text": {"headline": "...", "kicker": "... or null", "body": "... or null", "items": ["..."], "labels": ["..."], "source_line": "short credit e.g. Sherrington et al., Cochrane 2019"}, "art": "what is drawn or charted, precisely", "data": [{"label": "...", "value": 0, "display": "...", "claim_id": "..."}]}], "design_notes": "..."},
 "visual_text": ["every string that will appear on the visual, in order"],
 "alt_text": ["one per slide"],
 "attention_note": "what should make the intended reader pause",
 "gain_note": "what they gain",
 "follow_note": "why they might want more from this account",
 "verification_notes": "which sources support which statements, access level, and qualifications carried",
 "status": "draft", "open_issues": []}]}

Then run python3 ${ROOT}/_system/check_posts.py ${ROOT}/posts/${c.id}_posts.json and fix every real hit (read each in context; a quotation is the only legitimate exception). Re-run until clean or only justified hits remain, and list any justified hits in open_issues. Your final answer is the summary object only.`
}

function checkPrompt(c) {
  return `You are an adversarial fact-checker for social media posts on geriatric medicine to be published under Professor Alasdair MacLullich's name. You did not write them and you do not trust them. Category ${c.id}. Today is ${TODAY}.

Read ${ROOT}/_system/STYLE.md section 9, the posts ${ROOT}/posts/${c.id}_posts.json, and the evidence files ${ROOT}/evidence/batches/${c.id}-B*.json.

For every post, check every factual statement in all four captions, the visual text, the alt text and the source_reply:
1. Does it map to a claim record with verdict supported or supported_with_qualification? Does the wording stay within the safe_wording and carry the qualifications?
2. Compare every statement with the claim record's verbatim supporting_passage, pico_timeframe and qualifications. Then re-open the source yourself for every number and every study-specific statement that appears in a headline, on the visual, or as the main finding of a post (PubMed MCP get_article_metadata for the abstract; load with ToolSearch). Open full text (get_full_text_article) only when the number is not in the abstract. Confirm the numbers, population, setting, comparator, outcome, timeframe and direction of effect match the source. For DRIVE: sources, open them with mcp__Google_Drive__read_file_content only if the passage is disputed. Be economical: do not re-open a source twice.
3. Check explicitly for the errors that actually occur: a subgroup result written as the whole study; odds or hazard ratios written as plain risk multiples; a confidence interval crossing the null reported as a finding or as equivalence; background statements from a paper's introduction attributed to the study; population swaps (community vs hospital vs care home; dementia vs cognitive impairment; predicted vs observed); causal verbs on observational data; within-arm change reported as an excess over control; relative effect presented without the absolute; screening confused with diagnosis; an evidence gap presented as evidence of no benefit; journal name or year errors; a PMID or DOI that does not match the citation.
4. Check that the four platform versions carry the same central claim and qualifications (a short version must not become stronger or wrong through compression).
5. Check headlines and visual text as strictly as captions, and that any chart data matches the source with denominator and timeframe.
6. Check for invented patients, quotations, testimonials, or first-person clinical anecdotes; claims about Alasdair's own practice or opinions; religion; inferred positions on disputed policy; delirium as the topic.

Severity: blocker (false, unsupported or misleading; must change before publication), major (materially imprecise or missing a necessary qualification), minor (small wording). For each issue give the exact replacement wording. If a post cannot be fixed without an unsupported claim, list it in posts_to_drop with the reason.

Write JSON to ${ROOT}/audit/factcheck/${c.id}_factcheck.json:
{"category": "${c.id}", "checked": ${JSON.stringify(TODAY)}, "posts_checked": ["..."], "sources_reopened": [{"key": "...", "tool": "...", "matches_record": true}], "issues": [{"tmp_id": "...", "where": "x|linkedin|bluesky|threads|visual_text|alt_text|source_reply|all", "text": "the exact current text", "problem": "...", "source_says": "...", "severity": "blocker|major|minor", "replacement": "exact new wording"}], "posts_to_drop": [{"tmp_id": "...", "reason": "..."}]}
Confirm it parses. Your final answer is the summary object only.`
}

function fixPrompt(c) {
  return `You apply fact-check corrections to social media posts for Professor Alasdair MacLullich. Category ${c.id}. Do not re-litigate the fact-checker's judgements: apply every blocker and major issue, and minor issues unless the replacement would introduce an error (explain any you skip).

Read ${ROOT}/_system/STYLE.md, ${ROOT}/_system/PLATFORMS.md, ${ROOT}/posts/${c.id}_posts.json and ${ROOT}/audit/factcheck/${c.id}_factcheck.json. You may consult ${ROOT}/evidence/batches/${c.id}-B*.json for wording.

1. Apply each replacement in every place it applies (all four captions, visual_brief text, visual_text, alt_text, source_reply). Keep the four versions consistent. Keep Bluesky within 300 characters and Threads within 500 after changes.
2. For posts in posts_to_drop: if a supported alternative exists in the evidence files (a "ready" or "revise" candidate not yet used in this category), replace the post with a new one built only from supported claims, keeping the same tmp_id and noting "replaced" in open_issues; otherwise remove the post and report it as dropped.
3. Run python3 ${ROOT}/_system/check_posts.py ${ROOT}/posts/${c.id}_posts.json and fix every real hit. Re-run until clean except justified hits (record them in open_issues).
4. Record every change in ${ROOT}/audit/changes/${c.id}_fix1.json as [{"tmp_id": "...", "where": "...", "old": "...", "new": "...", "reason": "..."}].
Write the updated posts back to ${ROOT}/posts/${c.id}_posts.json (valid JSON, same schema). Your final answer is the summary object only.`
}

function coldReadPrompt(c) {
  return `You are a cold reader testing whether social media posts are understood at first reading by a tired, worried relative reading on a phone with no medical training (and, for practitioner posts, by a busy clinician). You must judge ONLY the text. Do not open any evidence file, paper or other source, and do not look anything up.

Run this command, then read ONLY the file it writes:
python3 -c "import json;d=json.load(open('${ROOT}/posts/${c.id}_posts.json'));out=[];[out.append({'tmp_id':p['tmp_id'],'audience':p['audience'],'platform':k,'text':v}) for p in d['posts'] for k,v in p['captions'].items()];out.append({'tmp_id':'CONTROL-1','audience':'public','platform':'x','text':'The trial showed noninferiority was not demonstrated for the primary endpoint (HR 1.08, 95% CI 0.91 to 1.27) in the frail subgroup.\\n\\nThis should inform practice.'});out.append({'tmp_id':'CONTROL-2','audience':'public','platform':'bluesky','text':'Median LOS 11.5 against 20. The estimated effect is about 3 hours.'});json.dump(out,open('/tmp/cold_${c.id}.json','w'),indent=1);print(len(out))"

The two CONTROL items are known failures; if you pass either, your reading is not strict enough: start again.

Score every variant on the Plain Reading Scale, each item 2, 1 or 0:
1 One sentence: after one reading, the main point can be said in one plain sentence (2 first time, 1 after re-reading, 0 no). From the text alone you must be able to say who was studied or who it is about, what was compared or what is being claimed, and what to do or think; if not, score 0.
2 Terms: every technical term or abbreviation that carries meaning has a plain equivalent beside it or is replaced (practitioner posts may keep terms every clinician knows).
3 Numbers: every number has a meaning (comparison, denominator, time period, or plain reading of the scale) and is attached to the noun it counts.
4 The other way: any result that went the wrong way is stated as plainly as the headline (2 if nothing went the other way).
5 Close: the last sentence says something concrete the reader could act on or disagree with (for variants under 300 characters, 2 if it simply stops after the point).
6 Sentence load: no sentence carries more than one technical idea or runs past about 35 words (25 for public posts) or needs reading twice.
7 Two figures, one effect: two numbers describing the same effect are reconciled in plain words, or only one is given (2 or 0).
Total 0 to 14. Any item at 0: fail that element. 9 or below: rewrite. 10 to 12: fix items scored 1. 13 or 14: pass.
Also flag: metaphors or figurative verbs, negation-then-correction shapes, setup questions answered by the post, empty closes, repeated openings within the set, anything that reads as patronising or as false reassurance.
Every score below 2 must quote the offending phrase and give a concrete fix (replacement wording) that keeps the meaning and does not add any new fact.

Write JSON to ${ROOT}/audit/coldread/${c.id}_coldread.json: {"category": "${c.id}", "controls": [{"tmp_id": "CONTROL-1", "total": n}, {"tmp_id": "CONTROL-2", "total": n}], "variants": [{"tmp_id": "...", "platform": "...", "scores": {"1": n, "2": n, "3": n, "4": n, "5": n, "6": n, "7": n}, "total": n, "verdict": "pass|fix|rewrite", "problems": [{"item": "3", "quote": "...", "fix": "..."}], "flags": ["..."]}]}
Your final answer is the summary object only.`
}

function fix2Prompt(c) {
  return `You apply plain-English fixes to social media posts for Professor Alasdair MacLullich. Category ${c.id}.

Read ${ROOT}/_system/STYLE.md, ${ROOT}/posts/${c.id}_posts.json, ${ROOT}/audit/coldread/${c.id}_coldread.json and the evidence files ${ROOT}/evidence/batches/${c.id}-B*.json (so that no fix changes a fact or drops a qualification).

1. Apply every fix for variants scored "fix" or "rewrite", and for every item scored 0 or 1. Rewrite a variant from its finding when it scored 9 or below. Keep facts, numbers, negations, hedges that mark real uncertainty, and the link-versus-cause distinction exactly as supported by the evidence. Keep the four versions consistent. Keep Bluesky within 300 characters and Threads within 500.
2. If a fix would change a factual statement, check it against the evidence claim's safe_wording first.
3. Run python3 ${ROOT}/_system/check_posts.py ${ROOT}/posts/${c.id}_posts.json and fix every real hit until clean except justified hits (record them in open_issues).
4. Set each post's status to "text_final" when it has no unresolved issue; otherwise "text_open" with the issue in open_issues.
5. Record every change in ${ROOT}/audit/changes/${c.id}_fix2.json as [{"tmp_id": "...", "where": "...", "old": "...", "new": "...", "reason": "..."}].
Write the updated posts back (valid JSON, same schema). Your final answer is the summary object only.`
}

const results = await pipeline(cats,
  async (c) => {
    const rs = await parallel(c.batches.map((b, bi) => () => agent(researchPrompt(c, b, bi), { label: `research:${c.id}-B${bi + 1}`, phase: 'Research', schema: RSUM })))
    return rs.filter(Boolean)
  },
  (research, c) => agent(writePrompt(c), { label: `write:${c.id}`, phase: 'Write', schema: WSUM }).then(w => ({ research, write: w })),
  (prev, c) => agent(checkPrompt(c), { label: `factcheck:${c.id}`, phase: 'Fact-check', schema: CSUM }).then(fc => ({ ...prev, factcheck: fc })),
  (prev, c) => agent(fixPrompt(c), { label: `fix:${c.id}`, phase: 'Fix', schema: FSUM }).then(f => ({ ...prev, fix1: f })),
  (prev, c) => agent(coldReadPrompt(c), { label: `coldread:${c.id}`, phase: 'Cold read', schema: RDSUM, model: 'sonnet' }).then(r => ({ ...prev, coldread: r })),
  (prev, c) => agent(fix2Prompt(c), { label: `fix2:${c.id}`, phase: 'Fix 2', schema: FSUM, model: 'sonnet' }).then(f => ({ category: c.id, ...prev, fix2: f })),
)
return results
