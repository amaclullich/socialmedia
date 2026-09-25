export const meta = {
  name: 'geri200-produce-visuals',
  description: 'Per category: build each post visual in HTML/SVG, render, read back; independent visual QA; fix and re-render',
  phases: [
    { title: 'Make', detail: 'author HTML/SVG, render, inspect, read back' },
    { title: 'Visual QA', detail: 'independent inspection of every PNG' },
    { title: 'Visual fix', detail: 'apply QA fixes, re-render, re-inspect' },
  ],
}

const ROOT = '/home/user/socialmedia/geriatrics-200_2026-09-25'
const DS = `${ROOT}/visuals/design_system`
const cats = args.categories // [{id, name, halves: [[tmp_id...],[tmp_id...]]}]

const MSUM = { type: 'object', properties: { category: { type: 'string' }, part: { type: 'string' }, rendered: { type: 'array', items: { type: 'string' } }, not_done: { type: 'array', items: { type: 'string' } }, formats: { type: 'object' }, notes: { type: 'string' } }, required: ['category', 'rendered', 'not_done'] }
const QSUM = { type: 'object', properties: { category: { type: 'string' }, file: { type: 'string' }, n_checked: { type: 'integer' }, n_pass: { type: 'integer' }, n_fix: { type: 'integer' }, notes: { type: 'string' } }, required: ['category', 'file', 'n_checked', 'n_pass', 'n_fix'] }
const VFSUM = { type: 'object', properties: { category: { type: 'string' }, n_fixed: { type: 'integer' }, unresolved: { type: 'array', items: { type: 'string' } }, all_complete: { type: 'boolean' }, notes: { type: 'string' } }, required: ['category', 'n_fixed', 'all_complete'] }

function makePrompt(c, ids, part) {
  return `You are the designer producing finished social media visuals for Professor Alasdair MacLullich's geriatric medicine posts. Category ${c.id} ${c.name}, posts ${ids.join(', ')}.

Read first, in full: ${DS}/DESIGN.md, ${DS}/KIT.md, ${DS}/base.css, ${DS}/chart.js (skim), the example pages in ${DS}/tests/ (T001.html and KIT_sheet.html), ${ROOT}/_system/STYLE.md sections 9 and 13, and the posts in ${ROOT}/posts/${c.id}_posts.json (only the ids listed above). For any chart, open the evidence claims it uses in ${ROOT}/evidence/batches/${c.id}-B*.json and use only those numbers.

For each post:
1. Build ${ROOT}/visuals/src/<tmp_id>.html (tmp_id such as ${c.id}-P01) following the visual_brief: the format, all the text in visual_text (you may tighten wording for legibility only if meaning, numbers and qualifications are unchanged; then update visual_text to match exactly), the data, and the drawing. Use base.css components, chart.js for charts and kit.js for any drawing. Make each visual genuinely explain or show something; avoid decoration. Keep text restrained and legible at phone size. Carousels have 2 to 4 cards.
2. Render: cd ${DS} && node render.js ../src/<tmp_id>.html. Fix every problem in the report.
3. Inspect: make a downscaled copy (python3 PIL, 540 px wide) and open it with the Read tool, and open the full-size PNG too. Check: layout, legibility at 540 px, contrast, the drawing (credible bodies, correct equipment use, nothing broken or floating, respectful and varied), and that meaning is never carried by colour alone.
4. Read back: compare ${ROOT}/visuals/png/text/<tmp_id>.txt with visual_text word for word; check chart marks against the data (count filled icons, check bar order and labels, denominators and time periods). Fix and re-render until everything matches.
5. Write alt text (one per card, 400 characters or fewer) that matches the finished card, and put it in the post's alt_text list.

Do NOT edit the posts JSON file (another designer is working on other posts in this category). Instead, for each post write ${ROOT}/posts/visual_updates/<tmp_id>.json containing: {"tmp_id": "...", "visual_files": [PNG file names in order], "visual_source": "visuals/src/<tmp_id>.html", "visual_format": "final format", "visual_text": [exact strings on the visual, in order], "alt_text": [one per card], "design_instructions": "short production note: format, layout, colours, drawing contents, data source claim ids, enough to rebuild it", "visual_status": "rendered"}. Confirm each file parses with python3.

Your final answer is the summary object only (part: "${part}").`
}

function qaPrompt(c) {
  return `You are an independent visual quality inspector. You did not make these visuals. Category ${c.id}. They are social media images for Professor Alasdair MacLullich's geriatric medicine posts.

Read ${ROOT}/visuals/design_system/DESIGN.md, ${ROOT}/_system/STYLE.md sections 3, 9 and 13, and ${ROOT}/posts/${c.id}_posts.json. For chart posts, read the evidence claims they cite in ${ROOT}/evidence/batches/${c.id}-B*.json.

The visual fields for each post (visual_files, visual_text, alt_text, design_instructions) are in ${ROOT}/posts/visual_updates/<tmp_id>.json; read those together with the post record. For every post with such an update file:
1. Open every PNG listed in visual_files (in ${ROOT}/visuals/png/) with the Read tool at full size, and a 540 px wide copy you make with python3 PIL.
2. Transcribe the visible text yourself and compare it with the post's visual_text and with the captions: same claim, same numbers, same qualifications, no stronger wording than the captions. Check ${ROOT}/visuals/png/text/<tmp_id>.txt as a second source.
3. Check charts against the evidence numbers: values, counts of filled marks, labels, denominators, time periods, zero baselines, legend present.
4. Check the drawing against the brief: the people, posture, equipment, setting; credible bodies (no detached or impossible limbs, no figures floating above seats or beds, hands meeting what they hold); equipment used correctly; respectful, varied depiction; no stereotyping of older people as helpless or confused; no text inside the art.
5. Check legibility at 540 px wide, contrast, nothing touching the edge or overlapping, meaning not carried by colour alone, illustrative examples labelled, alt text accurate and under 400 characters.
6. Judge whether the visual actually helps: does it contribute an observation, explanation or emotional understanding, and would it make the intended reader stop? If it is weak, say how to make it stronger within the same facts.

Write ${ROOT}/audit/visual_qa/${c.id}_visualqa.json: {"category": "${c.id}", "items": [{"tmp_id": "...", "verdict": "pass|fix", "transcribed_text_matches": true, "problems": [{"card": 1, "problem": "...", "fix": "specific instruction"}], "strength_note": "..."}]}
Your final answer is the summary object only.`
}

function vfixPrompt(c) {
  return `You fix social media visuals after an independent inspection. Category ${c.id}. Read ${ROOT}/visuals/design_system/DESIGN.md, ${ROOT}/visuals/design_system/KIT.md, ${ROOT}/audit/visual_qa/${c.id}_visualqa.json, ${ROOT}/posts/${c.id}_posts.json and the update files ${ROOT}/posts/visual_updates/${c.id}-P*.json. You are the only agent editing this category's posts file now.

For every item with verdict "fix": edit ${ROOT}/visuals/src/<tmp_id>.html, re-render (cd ${ROOT}/visuals/design_system && node render.js ../src/<tmp_id>.html), open the PNG (full size and 540 px wide) and confirm each problem is gone and nothing new is broken; read back the text file in ${ROOT}/visuals/png/text/. Update the post's update file if visual_text, alt_text, visual_files or design_instructions changed. Then merge every update file for this category into ${ROOT}/posts/${c.id}_posts.json (copy the fields visual_files, visual_source, visual_format, visual_text, alt_text, design_instructions into the matching post), and set "visual_status": "final" for every post in this category whose visual passes (including the ones that passed inspection first time), or "visual_open" with the reason in open_issues.

Remove stale PNGs if a carousel lost cards (for example <tmp_id>_4.png when only 3 cards remain). Record changes in ${ROOT}/audit/changes/${c.id}_visualfix.json. Use a python3 script to edit the posts JSON safely. Your final answer is the summary object only.`
}

const results = await pipeline(cats,
  async (c) => {
    const parts = await parallel(c.halves.map((ids, i) => () => agent(makePrompt(c, ids, `${i + 1}/${c.halves.length}`), { label: `make:${c.id}-${i + 1}`, phase: 'Make', schema: MSUM })))
    return parts.filter(Boolean)
  },
  (made, c) => agent(qaPrompt(c), { label: `vqa:${c.id}`, phase: 'Visual QA', schema: QSUM }).then(q => ({ made, qa: q })),
  (prev, c) => agent(vfixPrompt(c), { label: `vfix:${c.id}`, phase: 'Visual fix', schema: VFSUM }).then(f => ({ category: c.id, ...prev, fix: f })),
)
return results
