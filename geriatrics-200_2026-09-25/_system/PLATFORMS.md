# Platform constraints used for this collection

Checked 25 September 2026. The official help pages (help.x.com, linkedin.com/help, docs.bsky.app, help.instagram.com, developers.facebook.com) were blocked by this environment's network policy, so the checks used the platforms' own source files on GitHub where available. Figures marked UNCONFIRMED came only from search-result summaries of the official pages and should be rechecked against the live pages.

| | X | LinkedIn | Bluesky | Threads |
|---|---|---|---|---|
| Text | 280 weighted characters for standard accounts; URLs count as 23 (confirmed, xdevplatform/docs counting-characters.mdx). Premium long posts up to 25,000 (UNCONFIRMED). Alasdair has Premium; SocialBee accepted a 598-character X post on his account on 13 September 2026 (his ruling, socialbee-plain-english-audit skill) | 3,000 characters (UNCONFIRMED) | 300 graphemes and 3,000 bytes (confirmed, atproto lexicon app.bsky.feed.post) | 500 characters (UNCONFIRMED) |
| Images | Up to 4 per post; JPG, PNG, GIF, WEBP; 5 MB or less (confirmed, xdevplatform/docs media best practices) | Multi-image 2 to 20; document posts (PDF) up to 300 pages (UNCONFIRMED) | 4 in the standard image embed; newer gallery embed up to 10 in the app; 2,000,000 bytes per image; app resizes to at most 4,000 px on the long side (confirmed, atproto lexicons and social-app constants) | Carousel of 2 to 20 items (confirmed, Meta's fbsamples/threads_api); 8 MB per image (UNCONFIRMED) |
| Alt text | Up to 1,000 characters (confirmed, X data dictionary) | Supported; length limit not confirmed | Required field; app cap 2,000 characters (confirmed) | Supported (alt_text field); limit not confirmed |
| Tags | Hashtag advice not confirmed | No official rule found | Up to 8 extra tags, 64 graphemes each (confirmed) | One topic tag per post, 1 to 50 characters, no "." or "&" (sample app confirmed; one-per-post rule UNCONFIRMED) |

## Rules adopted so every post works on all four platforms

- X caption: normally 400 to 700 characters; up to about 1,400 when the content needs it. Always shorter than the LinkedIn version. Relies on Premium long posts, which Alasdair has.
- LinkedIn caption: 900 to 2,200 characters (well under the 3,000 figure).
- Bluesky caption: 300 graphemes or fewer, counted including spaces, line breaks and any hashtag. Hard limit.
- Threads caption: 500 characters or fewer. Hard limit.
- Hashtags: X 0 to 1, LinkedIn 0 to 3, Bluesky 0 to 1, Threads 0 or 1 topic tag (no "." or "&"). Most posts need none.
- Images: master PNG 2160 by 2700 px (4:5, rendered at 2x from a 1080 by 1350 layout), each file under 1.9 MB so that it fits Bluesky's 2,000,000-byte limit and X's 5 MB limit. Where a PNG exceeds that, a high-quality JPEG export is supplied.
- Multi-image posts (carousels): 2 to 4 images, so the same set posts on X and in Bluesky's standard embed. LinkedIn and Threads take the same images as a multi-image post.
- Alt text: one per image, 400 characters or fewer, describing the finding, numbers, comparison and any limitation shown. This fits every confirmed limit.
- Source links: each post carries a `source_reply` with public links, for use as a reply or first comment. No claim is made about how any platform ranks posts with or without links.
