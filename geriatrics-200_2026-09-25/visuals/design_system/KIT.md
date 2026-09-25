# Illustration kit (kit.js)

Drawn people, props and rooms for the Geriatrics 200 cards. Everything is SVG made in code: no image generation, no network, no fonts inside the art. The reference sheet is `tests/KIT_sheet.html` (render it with `node render.js tests/KIT_sheet.html`; PNGs land in `../png/KIT_sheet_N.png`).

```html
<link rel="stylesheet" href="../base.css">
<script src="../kit.js"></script>   <!-- exposes window.Kit -->
```

## 1. Conventions

- **Style.** Flat colour with one even outline, `#1F2A30`, `Kit.LW` scene units wide (default 3). The outline stays the same width whatever the scale of a figure or prop, so a scene looks like one drawing. Change `Kit.LW` before drawing if a whole scene is very large or very small.
- **Units.** Scale 1 = a standing adult about 400 units tall (1 unit is about 4.4 mm). Furniture uses the same units, so a person at scale 1.2 sits on a chair at scale 1.2.
- **Placement.** People and furniture are placed by a **floor point** `(x, y)`: `y` is the floor line, `x` is the body centre when standing and the **hip** when seated. Small objects (cup, jug, pill box) are placed by the **surface point** they stand on (for example the top of a table, see `Kit.anchor`).
- **Facing.** Everything faces right by default. `facing: 'left'` mirrors it. Side-view poses show the side of the body nearest the viewer as the "near" side (near arm, near leg); the far limbs are drawn a shade darker behind.
- **Output.** Every function returns an SVG markup string. Wrap strings with `Kit.scene(w, h, [...])`, or mount them with `Kit.draw(target, w, h, [...], opts)`.
- **No text in the art, ever.** All words go in HTML: `.cap`, `.callout`, headings. The kit has no text element and never will.

## 2. Quick start

A drawn illustration inside `.scene` (base.css sizes `svg.art` to fill it):

```html
<div class="scene" id="s1"></div>
<script>
const W = 1000, H = 900, S = 1.4, g = 830;                  // viewBox, people scale, ground line
Kit.draw('#s1', W, H, [
  Kit.room('home_living', { w: W, h: H, ground: g, scale: S }),
  Kit.window({ x: 560, y: g - 70 * S - 300, scale: 1.2, curtains: 'mustard' }),
  Kit.person({ pose: 'seated_side', seat: 'armchair', x: 300, y: g, scale: S,
               age: 'older', sex: 'f', skin: 'brown', hair: 'white', hairStyle: 'coily',
               top: 'plum', bottom: 'stone', extras: ['glasses', 'cardigan'] }),
  Kit.person({ pose: 'seated_talking', x: 700, y: g, scale: S, facing: 'left',
               age: 'older', skin: 'fair', hair: 'grey', hairStyle: 'balding', top: 'sage' }),
  Kit.plant({ x: 930, y: g - 6, scale: 1.2 }),
], { cls: 'art' });
</script>
```

An annotated scene: put `.callout` boxes in the `.scene`, draw, then add numbered pins at viewBox points. `Kit.pins` converts viewBox units to CSS pixels using the rendered SVG, so pins stay on target with `preserveAspectRatio` slice.

```js
const bt = Kit.anchor('bedside_table', { x: 780, y: 800, scale: 1.3 });
Kit.draw('#sceneB', 1000, 860, [ /* room, bed, table, objects */ ], { cls: 'art' });
Kit.pins('#sceneB', [{ n: 1, x: bt.top.x + 60, y: bt.top.y - 90 }]);
```

A comic panel (`.strip.p3` > `.panelbox` > `.art`): draw into each `.art` with a wide viewBox such as 1000 x 240, and put the ground line below the frame (for example `ground: 410` at scale 0.98) so people are cropped at the waist. Captions go in `.cap`. Do not draw speech bubbles in the art.

## 3. Kit.person(opts)

| option | values | default |
|---|---|---|
| `pose` | see section 4 | `'standing'` |
| `x`, `y` | floor point (hip x when seated) | 0, 0 |
| `scale` | number | 1 |
| `facing` | `'right'`, `'left'` | `'right'` |
| `view` | `'side'`, `'front'` (front works for `standing`; `seated_front` is always front) | `'side'` |
| `age` | `'older'`, `'adult'`, `'young'` (older: slightly rounded upper back, head a little forward, never exaggerated) | `'adult'` |
| `sex` | `'f'`, `'m'` or omit (sets default hair style and a slight chest and hip shape) | none |
| `build` | `'slim'`, `'medium'`, `'broad'` | `'medium'` |
| `skin` | a `Kit.SKIN` name or hex | `'medium'` |
| `hair` | a `Kit.HAIR` name, a `Kit.C` name (for a headscarf) or hex | grey if older, else dark |
| `hairStyle` | `short`, `pixie`, `cropped`, `balding`, `bun`, `ponytail`, `long`, `bob`, `wavy`, `curly`, `coily`, `headscarf` | `bob` if sex f, else `short` |
| `top`, `bottom` | `Kit.C` name or hex | teal, slate |
| `topStyle` | `'plain'`, `'tunic'`, `'polo'`, `'shirt'` | plain (tunic with extra `uniform`) |
| `sleeves` | `'long'`, `'short'` | short for tunic, polo, shirt |
| `trim` | piping colour on tunics and polo collars | white |
| `bottomStyle` | `'trousers'`, `'skirt'` (with `legs` colour for tights, `skirtLength: 'midi'`) | trousers |
| `shoes`, `shoeStyle` | colour; `'shoe'` or `'slipper'` | brown or dark |
| `extras` | array of `glasses`, `hearing_aid`, `cardigan` (+ `cardigan` colour), `uniform`, `lanyard` (plain, no text), `apron`, `beard` (+ `beardColour`) | none |
| `role` | staff preset, section 5 (sets top, bottom, style, trim, lanyard; your own options still win) | none |
| `tilt` | head angle in degrees, + looks down, - looks up | 0 |
| `lean` | extra torso lean in degrees, + forward | 0 |
| `hands` | `{ near: {x, y}, far: {x, y} }` scene points the hands reach for (arms solve to reach them); or a string for some poses: `'lap'`, `'rims'`, `'crossed'`, `'reach'` | pose default |
| `hold` | object in the near hand: `cup`, `glass`, `phone`, `notepad`, `bag`, `pill_organiser`, `tablet_box` | none |
| `seat` | for seated poses: `chair`, `armchair`, `sofa`, `stool`, `commode`, `none` (+ `seatHeight`) | chair (armchair for rising) |
| `seatColour` | colour of the drawn seat | prop default |
| `bed`, `bedHeight`, `backrest`, `rails`, `blanket`, `bedColour` | for bed poses: `'hospital'`, `'domestic'`, `'none'`; backrest angle in degrees; rails `'down'`, `'up'`, `'none'`; blanket colour or `false` | hospital, 60, down |
| `frame`, `frameColour` | walking frame type `'standard'`, `'wheeled'`, `'rollator'`; colour for frame or wheelchair | standard |
| `stride` | 0 to 1, walking step length | 0.42 older, 0.6 adult |
| `shadow` | `false` removes the floor shadow | shown |

Faces are always blank. There is no option for eyes, mouths or expressions: posture and head angle (`tilt`, `lean`) carry the feeling.

## 4. Poses (copy and paste)

All examples use `y` = floor line. Seated poses draw their own seat unless `seat: 'none'`.

```js
Kit.person({ pose: 'standing', x: 200, y: 800, age: 'older', sex: 'f', skin: 'fair', hair: 'white', hairStyle: 'pixie', top: 'plum', extras: ['glasses'] })
Kit.person({ pose: 'standing', view: 'front', x: 200, y: 800, age: 'older', build: 'broad', skin: 'dark', hair: 'grey' })
Kit.person({ pose: 'walking', x: 200, y: 800, skin: 'brown', hair: 'black', hairStyle: 'cropped', top: 'mustard' })
Kit.person({ pose: 'stick', x: 200, y: 800, age: 'older', hair: 'grey', hairStyle: 'balding', stickType: 'crook' })   // crook, derby, offset; stick in the near hand, tip on the floor ahead
Kit.person({ pose: 'walking_frame', x: 200, y: 800, age: 'older', frame: 'standard' })   // standard, wheeled, rollator; stands inside the frame, hands on the grips
Kit.person({ pose: 'seated_side', seat: 'chair', x: 200, y: 800, age: 'older' })          // hands on lap
Kit.person({ pose: 'seated_side', seat: 'armchair', x: 200, y: 800, age: 'older' })       // forearms on the chair arms; hands: 'lap' to change
Kit.person({ pose: 'seated_front', seat: 'armchair', x: 200, y: 800, age: 'older', extras: ['cardigan'] })
Kit.person({ pose: 'seated_talking', x: 200, y: 800, facing: 'left' })                    // leaning in, near hand gesturing
Kit.person({ pose: 'rising', x: 200, y: 800, age: 'older' })                              // armchair, pushing up on the arms
Kit.person({ pose: 'rising', seat: 'chair', hands: 'crossed', x: 200, y: 800 })           // no arms on the chair: arms crossed
Kit.person({ pose: 'kneeling', role: 'physio', x: 600, y: 800, facing: 'left' })          // one knee down, head at a seated person's eye level; knee: 'far' swaps legs; reach: false rests the near hand
Kit.person({ pose: 'reaching_up', x: 200, y: 800, age: 'older', tiptoe: true })           // near hand above head; hands: {near: point} to aim it
Kit.person({ pose: 'on_floor', x: 200, y: 800, age: 'older' })                            // half sitting after a fall, propped on one hand
Kit.person({ pose: 'on_floor', variant: 'lying', x: 200, y: 800 })                        // on the back, one knee bent
Kit.person({ pose: 'lying_bed', x: 400, y: 800, bed: 'hospital' })                        // x = centre of the bed; draws bed, pillow, blanket
Kit.person({ pose: 'lying_bed', bed: 'domestic', blanket: 'sage', x: 400, y: 800 })
Kit.person({ pose: 'sitting_up_bed', backrest: 60, rails: 'down', x: 400, y: 800 })       // hands: 'reach' stretches the near arm forward
Kit.person({ pose: 'wheelchair', hands: 'lap', x: 200, y: 800 })                          // feet on the footplates; hands: 'rims' to self-propel
Kit.person({ pose: 'pushing', x: 90, y: 800, role: 'care_worker', hands: { near: Kit.anchor('wheelchair', { x: 250, y: 800 }).handles } })
Kit.linkArms({ age: 'older', hair: 'white' }, { pose: 'stick', x: 300, y: 800, age: 'older', sex: 'f' })   // arm in arm: first = far partner, second = near partner
Kit.person({ pose: 'arm_in_arm', x: 300, y: 800 })                                        // near partner only, far arm bent to link (prefer Kit.linkArms)
```

Sitting on a sofa or a bed edge: draw the furniture, then the person with `seat: 'none'` and the seat height, at the same floor point.

```js
Kit.sofa({ x: 400, y: 800, seats: 2 }),
Kit.person({ pose: 'seated_front', seat: 'none', seatHeight: Kit.dims.sofaSeat, x: 345, y: 800 }),
Kit.person({ pose: 'seated_front', seat: 'none', seatHeight: Kit.dims.sofaSeat, x: 455, y: 800 })
```

### Helpers for people

- `Kit.linkArms(far, near)` draws two walkers arm in arm. The far partner is placed 84 units ahead unless you give `x`. The near partner may use `pose: 'stick'` (stick in the outer hand).
- `Kit.joint(opts, name)` returns the scene point of `head`, `shoulder`, `hip`, `nearHand`, `farHand`, `nearElbow` or `nearKnee` for a person you are about to draw, so another person's `hands` can reach it (scene A aims the physiotherapist's hand at the older woman's knee this way).
- `hands: { near: {x, y} }` works on any side-view pose. Points out of reach leave the arm straight towards the point, so check the render.

## 5. Staff presets (`role`)

No text, badges with writing or logos on any of them. The lanyard card is blank.

| role | look |
|---|---|
| `nurse` | navy tunic, white piping, navy trousers, lanyard |
| `hca` | pale blue tunic, navy piping, navy trousers, lanyard |
| `hca_lilac` | lilac tunic, plum piping |
| `doctor` | pale blue short-sleeved shirt, no white coat, slate trousers, lanyard |
| `physio` | teal polo shirt, navy trousers, white trainers |
| `care_worker` | plum tunic, white piping, charcoal trousers, lanyard (add `extras: ['apron']` for personal care) |
| `pharmacist` | white tunic, teal piping, charcoal trousers |
| `ot` | green tunic, white piping |
| `paramedic` | green polo and trousers |

```js
Kit.person({ pose: 'standing', role: 'nurse', skin: 'brown', hair: 'black', hairStyle: 'bun', sex: 'f' })
```

## 6. Props (copy and paste)

Every prop takes `x`, `y`, `scale`, `facing`, and usually `colour`. Furniture: `(x, y)` is the floor point (for seats, where the seated hip goes). Small objects: `(x, y)` is the surface they stand on. Heights for surfaces are in `Kit.dims` (multiply by scale) and `Kit.anchor` does it for you:

```js
const t = Kit.anchor('table', { x: 500, y: 800, scale: 1.2 });   // t.top = {x, y}
Kit.cup({ x: t.top.x - 40, y: t.top.y, scale: 1.2 })
```

Anchors: `chair.seat`, `armchair.seat/arm/armFront`, `sofa.seat`, `stool.seat`, `bed.top/head/foot/footEnd`, `bedside_table.top/left/right`, `over_bed_table.top`, `table.top`, `desk.top`, `kitchen_counter.top`, `wheelchair.handles/seat/footplate`, `walking_frame.grip`, `shelf.top`, `window.sill`.

Seating and furniture:

```js
Kit.chair({ x, y })                                   // dining chair, side view; view: 'front'; cushion: 'sage'
Kit.armchair({ x, y, colour: 'teal' })                // high-backed winged chair with arms; view: 'front'
Kit.sofa({ x, y, seats: 3, colour: 'sage' })          // front view; view: 'side'
Kit.stool({ x, y })
Kit.table({ x, y, w: 260, height: 168 })
Kit.desk({ x, y, w: 280 })
Kit.kitchen_counter({ x, y, w: 420, sink: true, wallUnits: true })
Kit.bookshelf({ x, y, w: 200, h: 320 })               // books are plain coloured spines
Kit.commode({ x, y, colour: 'teal' })                 // chair frame, padded seat, pan below; view: 'front'
```

Beds and bedside:

```js
Kit.bed({ x, y, type: 'hospital', rails: 'up', backrest: 45, height: 140 })   // side rails, castors, adjustable lift
Kit.bed({ x, y, type: 'domestic', colour: 'pale' })
Kit.pillow({ x, y, w: 100 })                          // y = the surface it rests on
Kit.blanket({ x, y, w: 120, colour: 'sage' })         // folded stack; type: 'spread'
Kit.bedside_table({ x, y, w: 96 })                    // hospital locker with drawer and castors
Kit.over_bed_table({ x, y })                          // cantilever table on a wheeled base
Kit.call_bell({ x, y, cableTo: { x: 90, y: 30 } })    // handset with a large red button on a cable; angle: -90 lays it down; cable: false
```

Mobility aids:

```js
Kit.walking_frame({ x, y, type: 'standard' })         // standard (rubber ferrules), wheeled (front wheels), rollator (4 wheels, seat, basket)
Kit.stick({ x, y, angle: 4, type: 'crook' })          // standalone: (x, y) = rubber tip on the floor; crook, derby, offset
Kit.wheelchair({ x, y })                              // large rear wheels with hand rims, front castors, footplates, push handles
```

Tabletop and personal objects (y = surface):

```js
Kit.glasses({ x, y })                                 // folded: true
Kit.hearing_aid({ x, y, scale: 1.3 })                 // behind-the-ear aid drawn large: body, ear hook, tube, dome
Kit.pill_organiser({ x, y, rows: 1, open: [2, 3], pills: 3 })   // rows: 4 gives 28 lidded boxes; open: 'all'; pills: number, array or function(i)
Kit.medicine_bottle({ x, y })                         // plain label; type: 'box' (band colour), 'blister'
Kit.cup({ x, y, colour: 'teal' })
Kit.glass({ x, y, level: 0.6 })
Kit.water_jug({ x, y, level: 0.7, lid: 'teal' })
Kit.plate_meal({ x, y })                              // food: false for an empty plate
Kit.tray({ x, y, w: 170 })
Kit.kettle({ x, y })
Kit.phone({ x, y })                                   // blank dark screen; type: 'landline'
Kit.notepad({ x, y })                                 // blank ruled lines only
Kit.bag_of_medicines({ x, y })                        // folded paper bag, no print
Kit.shoes({ x, y })  Kit.slippers({ x, y })           // a pair on the floor
```

Home, bathroom and outside:

```js
Kit.door({ x, y, w: 190, open: false })               // panel door with lever handle; y = floor
Kit.window({ x, y: sillY, w: 240, h: 250, curtains: 'mustard' })   // y = the sill; plain sky and a green hill
Kit.stairs({ x, y, steps: 6, carpet: 'plum' })        // x = foot of the stairs, rising to the right, handrail and balusters; rail: false
Kit.rug({ x, y, w: 300, curled: true })               // curled lifts the front corner (trip hazard)
Kit.lamp({ x, y })                                    // floor lamp; type: 'table'
Kit.radiator({ x, y })
Kit.plant({ x, y })
Kit.shelf({ x, y, height: 440 })                      // wall shelf above floor point; cupboard: true
Kit.toilet_with_grab_rails({ x, y })                  // side view, wall rail and vertical rail; rails: false; raised: true
Kit.raised_toilet_seat({ x, y, arms: true })
Kit.grab_rail({ x, y, length: 130, angle: 0 })        // wall mounted; angle: -90 for vertical
Kit.front_door_step({ x, y, steps: 1, rail: true, colour: 'navy' })
Kit.curtain({ x, y, w: 200 })                         // hospital bay curtain on a ceiling track
Kit.tree({ x, y })  Kit.bench({ x, y })
Kit.shadow(x, y, halfWidth)                           // soft floor shadow for anything
```

Custom shapes in the house style: `const g = Kit.pen(Kit.LW / scale)` gives outlined primitives (`g.p(pathD, fill)`, `g.r(x, y, w, h, rx, fill)`, `g.c(cx, cy, r, fill)`, `g.l(points, width, colour)` for tubes, `g.t(pathD)` for thin interior lines). Wrap with `Kit.at(x, y, scale, markup, flip)`.

## 7. Rooms

`Kit.room(type, { w, h, ground, scale, depth })` returns wall and floor bands only. `ground` is where feet go; the wall meets the floor `depth * scale` above it (default 70), so people stand on the floor, not on the skirting line. Pass the people's `scale` so dado rails, tiles and bed-head trunking sit at real heights.

Types: `home_living` (sand wall, wooden floor), `home_bedroom` (mint wall, carpet), `kitchen` (off-white, floor tiles), `bathroom` (tiled lower wall), `hospital_bay` (pale mint, bed-head trunking, vinyl), `care_home_lounge` (dado rail, sage carpet), `gp_room` (off-white, vinyl), `outdoors_street` (sky, plain houses, hedge, pavement, kerb). Options `wall`, `floorColour`, `sky` override colours.

Walls stay plain: never text, signs, posters, clocks, calendars, or screens with content. Add a window, door, radiator or plant from the props if the room needs a cue.

## 8. Scene helpers

- `Kit.scene(w, h, children, { fit, cls, bg, style })`: wraps children in `<svg viewBox="0 0 w h">`. `fit` defaults to `'xMidYMid slice'` (fills the box and crops the edges, so keep key content away from the viewBox edges); use `'xMidYMid meet'` to show everything.
- `Kit.draw(target, w, h, children, opts)`: builds the scene and inserts it as the first child of each element matching `target`, keeping any HTML callouts already there. Returns the markup.
- `Kit.pins(host, [{ n, x, y }])`: numbered `.pin` elements at viewBox points. `Kit.toHost(host, x, y)` gives CSS pixels for placing your own callouts.
- `Kit.groundOf({ h, ground })`, `Kit.dims`, `Kit.anchor(name, opts)`, `Kit.joint(opts, name)`.
- Scene content sits in a `.bleed` group so render.js does not flag art that runs past the frame on purpose.
- Lists for tooling: `Kit.poses`, `Kit.props`, `Kit.rooms`, `Kit.ROLES`.

## 9. Palettes

Skin, `Kit.SKIN`: `light #F4D9C6`, `fair #EBC3A5`, `medium #D6A27E`, `olive #C08B63`, `tan #A66F4B`, `brown #82532F`, `dark #613C23`, `deep #462A19`.

Hair, `Kit.HAIR`: `white #F4F2ED`, `silver #D4D6D4`, `grey #A6ABAD`, `saltpepper #8F9497` (drawn with light and dark flecks), `darkgrey #6E7477`, `black #1F1C1B`, `dark #302722`, `brown #5C3C28`, `auburn #8D4B2B`, `blonde #D8B87C`, `sandy #B99A6B`.

Clothing, `Kit.C`: brand `deep #0F3C4F`, `teal #15535B`, `mint #DCEBEA`, `pale #B9CDCC`, `orange #C24E12` (sparingly), `gold #D9A441`, `sand #EFE6D6`; neutrals `white #FFFFFF`, `light #D9DEDC`, `grey #5F6B76`, `slate #3B4A52`, `ink #1F2A30`, `offwhite #FBFAF6`; warm muted `mustard #C99A2E`, `plum #6B4E6E`, `sage #8FA98F`, `brick #A0522D`, `navy #243B55`; extras for uniforms and variety `paleblue #A9C4DA`, `lilac #B7A7CB`, `green #3F6553`, `cream #F3EDDF`, `oat #D9CCB4`, `denim #50708E`, `charcoal #343B40`, `rose #C98B86`, `stone #B5AB9C`.

Props, `Kit.PROP`: wood, woodDk, woodLt, metal, metalDk, steel, mattress, linen, rubber, tyre, glass, water, red (call bell button only), paper, plastic, tile. Any option also accepts a hex value.

## 10. Composition rules

1. **Faces are featureless.** No eyes, mouths, brows or noses; an ear is the only facial landmark. Show feeling through posture and head angle, never through an expression that could misfire.
2. **Vary people across a set.** Across the 200 visuals, mix sex, skin tone, body build, hair colour and style (including headscarves), disability and mobility aids, and settings (home, care home, ward, GP surgery, pharmacy, street). Staff are varied too. Do not make every older person white-haired, thin and alone.
3. **Show older people as they are.** Active and engaged (walking, talking, cooking, deciding, caring for others) as well as unwell. Illness is shown with dignity: clothed, covered, supported, never exposed.
4. **Never draw** restraint of any kind (no tied limbs, no chairs or rails used to confine, no one held down), distress for effect, nudity, or anyone as a joke. Bed rails are drawn `'down'` unless the post is about rails. The fall pose is calm and clothed.
5. **Equipment is drawn as it is used.**
   - A walking frame is used by stepping into it: feet level with the back legs, hands on both grips, body upright (the pose does this).
   - A stick is held in one hand, the handle at wrist height, the rubber tip on the floor slightly ahead and to the side; it moves with the weaker leg.
   - Wheelchair footplates are under the feet; hands on the lap or on the hand rims; a pusher's hands are on the push handles (use `Kit.anchor('wheelchair').handles`).
   - A call bell "within reach" means at the person's hand, not on a table or behind the bed.
   - Glasses and hearing aids "in use" are on the person (`extras`), not on the side.
   - People sit on seats and lie on mattresses: keep the pose's own furniture, or pass `seat: 'none'` with the right `seatHeight`, so no one floats.
6. **No text of any kind inside the art.** No labels on bottles, boxes, bags, lanyards, doors, screens, signs or clothes. All words go in HTML captions, callouts, headings and the card footer. Captions and callouts at least 24 px (render.js flags anything under 22 px).
7. **Colour is not the only carrier of meaning.** Pair any colour cue with a pin number, position or caption. Use burnt orange sparingly and never as a large clothing area next to teal text.
8. **One idea per picture.** Keep rooms plain and props few: only what the point needs.
9. **Keep content inside the frame.** With `slice` fitting, the edges of the viewBox may be cropped; keep people, pins and the object of the story at least 40 units in from the edges. Put the ground line below a comic panel to crop at the waist rather than shrinking people.

## 11. Checking a render

```
node render.js tests/KIT_sheet.html
python3 -c "from PIL import Image; im=Image.open('../png/KIT_sheet_14.png'); im.thumbnail((1200,1500)); im.save('/tmp/check.png')"
```

Look at the PNG at full size and at phone size (about 400 px wide). Check that hands meet what they hold, feet meet the floor, footplate or frame, bodies meet seats and mattresses, knees and elbows bend the right way, and nothing important is cropped. The JSON report must show no problems and no errors.

## 12. Known limits

- Side view is the main view. Front view exists for standing and seated poses only; there is no back view or three-quarter view.
- Hands are simple mitts, so fine actions (a pill between finger and thumb, buttoning a shirt) cannot be drawn; show the object near the hand and say what happens in the caption.
- Arm in arm is drawn in profile with the partners overlapping; it reads at card size but the link itself is small on a phone.
- Standing figures are fairly upright and the arm hangs in front of the torso in profile, so busy group scenes can look stiff. Vary `lean`, `tilt`, `stride` and poses.
- `on_floor` has two variants only (half sitting, lying on the back).
