export const meta = {
  name: 'geri200-select',
  description: 'Editorial selection of 200 posts plus reserves from the scored candidates, then an independent check and a fix pass',
  phases: [{ title: 'Edit', detail: 'balance, clusters, cross-category overlap' }, { title: 'Check', detail: 'independent constraint and duplicate check' }, { title: 'Apply', detail: 'apply checker fixes' }],
}
const ROOT = '/home/user/socialmedia/geriatrics-200_2026-09-25'
const SEL = `${ROOT}/_working/selection`
const OUT = { type: 'object', properties: { file: { type: 'string' }, total: { type: 'integer' }, per_category: { type: 'object' }, audience: { type: 'object' }, n_swaps: { type: 'integer' }, notes: { type: 'string' } }, required: ['file', 'total', 'per_category', 'audience'] }
const CHK = { type: 'object', properties: { file: { type: 'string' }, n_issues: { type: 'integer' }, blocking: { type: 'integer' }, notes: { type: 'string' } }, required: ['file', 'n_issues', 'blocking'] }

const RULES = `Constraints:
1. Exactly 200 selected posts in total. C01 is already in production and is FIXED: allocation 11, and its shortlist is exactly C01-18, C01-27, C01-24, C01-14, C01-28, C01-23, C01-02, C01-03, C01-25, C01-05, C01-19, C01-08, C01-13, C01-31, C01-06 (the first 11 are "selected", the last 4 "reserves"). The other 19 categories share 189.
2. Each category 6 to 14 posts, allocated by the number of genuinely strong, distinct candidates (quality of ideas and evidence), not evenly.
3. Within a category, take at most two candidates from any cluster the judge identified as overlapping; never two candidates that would make the same argument.
4. Across categories, no two selected candidates may make the same core argument (for example a hearing-aid point in both C09 and C14, or a medicines point in C01 and C06). Keep the stronger or better-placed one and move the other out.
5. Exclude anything flagged EXCLUDED in the digest (delirium topic, duplicates of the earlier collection). Delirium is never the topic.
6. Collection balance for primary audience: practitioners about 35 to 45 percent, public about 30 to 40 percent, both about 20 to 30 percent. Within each category at least a quarter of selected posts should be public-primary unless the category is inherently professional (then say so).
7. Every series (Reading the evidence, Ask this, Small detail real effect, Weighing it up, What gets counted, Teaching round, Who gets left out, Care that works) has at least 14 selected posts across the collection. At least a third of all selected posts teach, explain, support a decision or show good care rather than criticise; criticism at most about a fifth.
8. Prefer candidates whose key claims are likely supportable from papers indexed in PubMed or documents that can be opened. Official UK web pages (NICE, ONS, NHS, gov.uk) cannot be opened from this environment, so a candidate that depends only on such a page is a poor choice unless the same fact is in a published paper.
9. Reserves: for each category, max(3, ceil(allocation / 4)) reserves in preference order, chosen so a reserve could replace a selected post that fails verification (not a near duplicate of a selected post).
10. Research batches: the shortlist (selected then reserves) split into groups of at most 5, keeping candidates that share likely sources in the same batch where possible.`

const results = []
phase('Edit')
const ed = await agent(`You are the senior editor choosing 200 posts, plus reserves, for a collection of geriatric medicine social media posts for Professor Alasdair MacLullich. Read ${ROOT}/_system/STYLE.md and ${ROOT}/_system/CATEGORIES.md, then read ${SEL}/DIGEST_FOR_EDITOR.md in full (one line per candidate with blind judge scores, notes, audience, series, post type, evidence risk; [SEL] and [RES] mark a purely mechanical first pass by score that ignored clusters, balance and cross-category overlap). You may open ${ROOT}/_working/candidates/<category>.json and ${SEL}/<category>_scores.json for detail. Do not use the origin field (random or non-random) in any decision.

${RULES}

Work category by category, then across the whole collection, then re-check every constraint and adjust. Write ${SEL}/SELECTION_FINAL.json:
{"total": 200, "categories": [{"id": "C01", "name": "...", "allocation": n, "selected": ["..."], "reserves": ["..."], "batches": [["..."]], "reasons": "one or two sentences on the allocation and any swaps from the mechanical pass"}], "audience_counts": {...}, "series_counts": {...}, "post_type_counts": {...}, "cross_category_moves": ["..."], "notes": "..."}
Compute the counts with a python3 script from the candidate files rather than by hand, and confirm the total is 200 and each category is between 6 and 14. Your final answer is the summary object.`, { label: 'editor', phase: 'Edit', schema: OUT })
results.push(ed)

phase('Check')
const ck = await agent(`You independently check a selection of 200 social media post concepts on geriatric medicine. You did not make it. Read ${SEL}/SELECTION_FINAL.json, ${SEL}/DIGEST_FOR_EDITOR.md and ${ROOT}/_working/earlier_collection/DIGEST.md; open candidate files in ${ROOT}/_working/candidates/ as needed.

${RULES}

Check every constraint with a python3 script where it can be counted. Then read every selected candidate's title and core insight across all categories and list any pair that would make the same core argument, any selected candidate that repeats an earlier-collection post (E###), any whose topic is delirium, and any whose key claim looks unsupportable. For each issue give a specific fix (which candidate to swap in from that category's list, or which to move). Write ${SEL}/SELECTION_CHECK.json: {"constraint_results": [{"rule": n, "ok": true, "detail": "..."}], "issues": [{"severity": "blocking|advisory", "cands": ["..."], "problem": "...", "fix": "..."}]}. Your final answer is the summary object.`, { label: 'checker', phase: 'Check', schema: CHK })
results.push(ck)

phase('Apply')
const ap = await agent(`Apply the independent checker's fixes to the post selection. Read ${SEL}/SELECTION_FINAL.json and ${SEL}/SELECTION_CHECK.json (and ${SEL}/DIGEST_FOR_EDITOR.md for alternatives). Apply every blocking issue and every advisory issue you agree with (say why for any you reject). Keep C01 exactly as fixed. Keep the total at 200, categories within 6 to 14, reserves and batches rebuilt to match. Recompute all counts with python3. Write the result back to ${SEL}/SELECTION_FINAL.json with an added "check_applied": [{"issue": "...", "action": "..."}]. Your final answer is the summary object.`, { label: 'apply', phase: 'Apply', schema: OUT })
results.push(ap)
return results
