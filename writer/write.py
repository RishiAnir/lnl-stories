"""Story writer for lnl-stories. Run daily by .github/workflows/write.yml (needs NVIDIA_API_KEY).

What it does, in order, at most one thing per run:
  1. Writes the next missing part brief of a series, keeping briefs at most AHEAD parts
     ahead of the renders: series/<s>/briefs/partN.json (data) + partN.md (for the animator).
  2. When every series is fully briefed and few parts are left to post, starts a new series:
     series/<new>/BIBLE.md + series.json, and appends it to posting/config.json series_order.
Every brief is checked against the series rules; on failure the model gets the problems and
tries again (up to 3 attempts). Nothing is written if all attempts fail.

Usage: python writer/write.py [--series S --part N] [--new-series] [--dry-run]
"""
import argparse, json, os, re, sys, time, urllib.request, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS = ['mistralai/mistral-large-4-1t-a52b', 'nvidia/nemotron-3-ultra-550b-a55b']
AHEAD = 2           # briefs written beyond the last rendered part
WORDS = (175, 225)  # spoken words per part (about 70 to 85 s at the voice's speed)


def rd(*p):
    return open(os.path.join(ROOT, *p), encoding='utf-8').read()


def chat(messages, max_tokens=8000):
    """OpenAI-style chat on NVIDIA's API, streamed so long generations don't hit the idle timeout."""
    key = os.environ['NVIDIA_API_KEY']
    last = None
    for model in MODELS:
        for attempt in range(2):
            try:
                req = urllib.request.Request('https://integrate.api.nvidia.com/v1/chat/completions', method='POST',
                                             data=json.dumps({'model': model, 'messages': messages, 'max_tokens': max_tokens,
                                                              'temperature': 0.8, 'top_p': 0.95, 'stream': True}).encode(),
                                             headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {key}',
                                                      'Accept': 'text/event-stream'})
                parts = []
                with urllib.request.urlopen(req, timeout=180) as r:
                    for raw in r:
                        line = raw.decode('utf-8', 'replace').strip()
                        if not line.startswith('data:'):
                            continue
                        data = line[5:].strip()
                        if data == '[DONE]':
                            break
                        delta = json.loads(data)['choices'][0].get('delta', {})
                        parts.append(delta.get('content') or '')
                out = ''.join(parts)
                if not out.strip():
                    raise ValueError('empty reply')
                print(f'  model: {model} ({len(out)} chars)')
                return out
            except Exception as e:
                last = e
                print(f'  {model} attempt {attempt + 1} failed: {type(e).__name__}: {e}')
                time.sleep(10)
    sys.exit(f'every model failed: {last}')


def extract_json(text):
    m = re.search(r'```(?:json)?\s*(\{.*\})\s*```', text, re.S)
    s = m.group(1) if m else text[text.find('{'):text.rfind('}') + 1]
    return json.loads(s)


# ---------- part briefs ----------

BRIEF_SCHEMA = '''Return ONLY a JSON object, in a ```json block, with exactly these keys:
{
  "part": <number>,
  "title": "<2-4 word part title>",
  "days": "<when it happens, e.g. Days 1 to 3>",
  "summary": "<3-5 sentences: what happens, the problem, the fix, the cliffhanger>",
  "new_assets": [{"type": "character|set|card|lighting", "name": "<code name>", "description": "<what it looks like>"}],
  "numbers_on_screen": ["<each data number shown on screen, at most 2>"],
  "lines": [{"id": "l01", "scene": true, "spoken": "<what the voice reads>", "caption": "<1 to 8 words shown on screen, one or two **keyword** in double asterisks>"}],
  "shots": [{"n": 1, "line": "l01", "set": "<set name>", "lighting": "FULL|GEN|DARK|other", "frame": "<what is in frame>", "action": "<the one movement in the shot>", "card": "<UI card shown, or empty>", "sound": "<effect, or empty>"}],
  "end_card": {"title": "PART <next>", "hook": "<short question or line under it>"},
  "continuity_out": "<state of the story at the end: day and time, who knows what, supplies, injuries, anything later parts must keep>"
}'''

RULES = f'''Writing rules (the checker enforces the hard ones):
- Second person: the viewer is "you". Plain, concrete narration. Every line moves the story; survival detail appears only inside an event someone is doing, never as a lecture.
- Two to four real events in the part, each with a clear problem and a clever, believable fix. Follow the outline for this part.
- HARD: the Spoken text has no digits and no abbreviations. Write every number and time as it is said ("two in the morning", "twenty-two", "a foot and a half", "three days"). Never "AM", "PM", "ft", "lb", "%".
- HARD: total Spoken words between {WORDS[0]} and {WORDS[1]}. 14 to 20 lines. Each Spoken line is one to three short sentences.
- HARD: every Caption has one or two **keywords** in double asterisks and at most 8 words. Captions may use digits.
- HARD: at most two data numbers on screen in the whole part (list them in numbers_on_screen). Show amounts as pictures instead (a wall of pallets, a frosted thermometer, a sagging roof). Times appear on a wall clock or phone lock screen inside a shot, not on cards. No stat cards.
- HARD: 16 to 26 shots, each tied to a line id, using an existing set or one listed in new_assets. A shot lasts 2 to 5 seconds. No two shots in a row with the same set and the same framing.
- The first line hooks immediately from where the last part ended (no recap intro). The last line is the cliffhanger, and the end card names the next part.
- "scene": true on a line that starts a new location or time jump.'''


def prior_lines(series, part):
    out = []
    for n in range(1, part):
        bj = os.path.join(ROOT, 'series', series, 'briefs', f'part{n}.json')
        lj = os.path.join(ROOT, 'series', series, f'part{n}', 'lines.json')
        if os.path.exists(bj):
            b = json.load(open(bj))
            lines, cont = b['lines'], b.get('continuity_out', '')
        elif os.path.exists(lj):
            lines, cont = json.load(open(lj))['lines'], ''
        else:
            continue
        out.append(f'Part {n} narration:\n' + '\n'.join(L['spoken'] for L in lines) + (f'\nState at the end of part {n}: {cont}' if cont else ''))
    p1 = os.path.join(ROOT, 'series', series, 'briefs', 'part1.md')
    if os.path.exists(p1):
        out.insert(0, rd('series', series, 'briefs', 'part1.md'))
    return '\n\n'.join(out)


def check_brief(b, series, part, total_parts):
    probs = []
    lines = b.get('lines') or []
    ids = {L.get('id') for L in lines}
    words = sum(len(L.get('spoken', '').split()) for L in lines)
    if not WORDS[0] <= words <= WORDS[1]:
        probs.append(f'Spoken words total {words}; must be {WORDS[0]} to {WORDS[1]}.')
    if not 14 <= len(lines) <= 20:
        probs.append(f'{len(lines)} lines; must be 14 to 20.')
    for L in lines:
        sp, cap = L.get('spoken', ''), L.get('caption', '')
        if re.search(r'\d', sp):
            probs.append(f'{L.get("id")}: Spoken has digits ("{sp}"). Write numbers as words.')
        if re.search(r'\b(AM|PM|A\.M\.|P\.M\.|ft|lb|lbs|sq|mph|ID)\b|%', sp):
            probs.append(f'{L.get("id")}: Spoken has an abbreviation ("{sp}"). Write it as it is said.')
        if '**' not in cap or cap.count('**') % 2:
            probs.append(f'{L.get("id")}: Caption needs one or two **keywords** ("{cap}").')
        if len(cap.replace('*', '').split()) > 8:
            probs.append(f'{L.get("id")}: Caption is over 8 words ("{cap}").')
    if len(b.get('numbers_on_screen') or []) > 2:
        probs.append(f'numbers_on_screen has {len(b["numbers_on_screen"])}; at most 2.')
    shots = b.get('shots') or []
    if not 16 <= len(shots) <= 26:
        probs.append(f'{len(shots)} shots; must be 16 to 26.')
    for s in shots:
        if s.get('line') not in ids:
            probs.append(f'shot {s.get("n")} points at line "{s.get("line")}", which does not exist.')
    for a, c in zip(shots, shots[1:]):
        if a.get('set') == c.get('set') and a.get('frame') == c.get('frame'):
            probs.append(f'shots {a.get("n")} and {c.get("n")} repeat the same set and framing.')
    want = 'THE END' if part == total_parts else f'PART {part + 1}'
    if (b.get('end_card') or {}).get('title', '').upper() != want:
        probs.append(f'end_card title must be "{want}".')
    if not re.search(r'\byou\b', ' '.join(L.get('spoken', '') for L in lines), re.I):
        probs.append('Narration must be in second person ("you").')
    return probs


def brief_md(b, series, meta):
    L = [f'# {meta["title"]}, Part {b["part"]}: {b["title"]}', f'_{b["days"]}_', '',
         'Animator: follow `STYLE_LOCK.md` and reuse `assets/`. Build this part in `partN/` the same way as `part1/` '
         '(lines.json with chunks of 3 to 4 lines, film.js, mix.py, build.sh). Add any new assets below to the shared assets files and to STYLE_LOCK.md.',
         '', '## Summary', b['summary'], '']
    if b.get('new_assets'):
        L += ['## New assets'] + [f'- **{a["name"]}** ({a["type"]}): {a["description"]}' for a in b['new_assets']] + ['']
    L += ['## Numbers on screen', ', '.join(b.get('numbers_on_screen') or []) or 'none', '',
          '## Script', '| # | Spoken (voice reads this) | Caption |', '|---|---|---|']
    L += [f'| {x["id"]}{" (scene)" if x.get("scene") else ""} | {x["spoken"]} | {x["caption"]} |' for x in b['lines']]
    L += ['', '## Shot list', '| # | Line | Set / lighting | Frame | Action | Card | Sound |', '|---|---|---|---|---|---|---|']
    L += [f'| {s["n"]} | {s["line"]} | {s["set"]} / {s["lighting"]} | {s["frame"]} | {s["action"]} | {s.get("card", "")} | {s.get("sound", "")} |' for s in b['shots']]
    L += ['', '## End card', f'**{b["end_card"]["title"]}**: {b["end_card"]["hook"]}', '',
          '## Continuity at the end of this part', b.get('continuity_out', '')]
    return '\n'.join(L) + '\n'


def write_part(series, part, dry):
    meta = json.load(open(os.path.join(ROOT, 'series', series, 'series.json')))
    bible = rd('series', series, 'BIBLE.md')
    style = rd('series', series, 'STYLE_LOCK.md') if os.path.exists(os.path.join(ROOT, 'series', series, 'STYLE_LOCK.md')) else ''
    sys_msg = ('You write serialized animated survival stories for a TikTok channel ("Stories from the Library"). '
               'Each story is five parts of about 75 seconds, narrated in second person over flat vector cartoon shots.\n\n'
               + RULES + '\n\n' + BRIEF_SCHEMA)
    user = (f'STORY BIBLE\n{bible}\n\nSTYLE LOCK (what the animator can draw; reuse these sets and characters)\n{style[:9000]}\n\n'
            f'WHAT HAPPENED SO FAR\n{prior_lines(series, part)}\n\n'
            f'Write Part {part} of {meta["parts"]} of "{meta["title"]}", following the outline for Part {part}.')
    msgs = [{'role': 'system', 'content': sys_msg}, {'role': 'user', 'content': user}]
    for attempt in range(1, 4):
        print(f'writing {series} part {part}, attempt {attempt}')
        text = chat(msgs)
        try:
            b = extract_json(text)
            probs = check_brief(b, series, part, meta['parts'])
        except Exception as e:
            b, probs = None, [f'Your reply was not valid JSON ({e}). Return only the JSON object in a ```json block.']
        if not probs:
            if dry:
                print(json.dumps(b, indent=2)[:3000]); return True
            d = os.path.join(ROOT, 'series', series, 'briefs')
            os.makedirs(d, exist_ok=True)
            json.dump(b, open(os.path.join(d, f'part{part}.json'), 'w'), indent=2, ensure_ascii=False)
            open(os.path.join(d, f'part{part}.md'), 'w', encoding='utf-8').write(brief_md(b, series, meta))
            print(f'wrote series/{series}/briefs/part{part}.md')
            return True
        print('  problems:\n   - ' + '\n   - '.join(probs))
        msgs += [{'role': 'assistant', 'content': text},
                 {'role': 'user', 'content': 'The checker found these problems. Fix all of them and return the full corrected JSON:\n- ' + '\n- '.join(probs)}]
    print('giving up after 3 attempts; nothing written')
    return False


# ---------- new series ----------

def new_series(cfg, dry):
    taken = []
    for s in cfg['series_order']:
        taken.append(json.load(open(os.path.join(ROOT, 'series', s, 'series.json')))['title'])
    example = rd('series', 'bulkway', 'BIBLE.md')
    sys_msg = ('You plan serialized animated survival stories for a TikTok channel ("Stories from the Library"). '
               'Each story is five parts of about 75 seconds, second person ("you"), flat vector cartoon style.')
    user = (f'Here is an example story bible:\n\n{example}\n\n'
            f'Stories already made: {", ".join(taken)}. Plan a NEW story in a different setting.\n'
            'Requirements: an ordinary, believable situation (a normal storm, breakdown, outage, getting stranded or locked in), '
            'not a monster, zombie or apocalypse. One main location that can be drawn as 5 to 7 reusable sets. '
            'Three to five characters plus "you", each with a clear visual signature. Five parts, each with a concrete problem, '
            'a clever believable fix, and a cliffhanger; part 5 resolves it. Same section headings as the example.\n\n'
            'Return a ```json block with {"slug": "<one lowercase word>", "title": "<story title>", '
            '"hashtags": "<4 hashtags>", "bible": "<the full markdown bible>"}')
    for attempt in range(1, 4):
        print(f'planning a new series, attempt {attempt}')
        try:
            j = extract_json(chat([{'role': 'system', 'content': sys_msg}, {'role': 'user', 'content': user}]))
            slug = re.sub(r'[^a-z]', '', j['slug'].lower())
            assert slug and slug not in cfg['series_order'] and '## Outline' in j['bible'] and '## Characters' in j['bible']
        except Exception as e:
            print(f'  rejected: {e}'); continue
        if dry:
            print(j['title']); print(j['bible'][:2000]); return True
        d = os.path.join(ROOT, 'series', slug)
        os.makedirs(os.path.join(d, 'briefs'), exist_ok=True)
        open(os.path.join(d, 'BIBLE.md'), 'w', encoding='utf-8').write(j['bible'].rstrip() + '\n')
        json.dump({'title': j['title'], 'parts': 5, 'hashtags': j['hashtags']}, open(os.path.join(d, 'series.json'), 'w'), indent=2)
        cfg['series_order'].append(slug)
        json.dump(cfg, open(os.path.join(ROOT, 'posting/config.json'), 'w'), indent=2)
        print(f'new series: {slug} ({j["title"]})')
        return True
    return False


# ---------- what to do today ----------

def plan(cfg):
    posted = {(p['series'], p['part']) for p in json.load(open(os.path.join(ROOT, 'posting/state.json')))['posted']}
    unposted = 0
    for s in cfg['series_order']:
        meta = json.load(open(os.path.join(ROOT, 'series', s, 'series.json')))
        rendered = sum(os.path.exists(os.path.join(ROOT, 'renders', s, f'part{n}.mp4')) for n in range(1, meta['parts'] + 1))
        unposted += sum((s, n) not in posted for n in range(1, meta['parts'] + 1))
        for n in range(1, meta['parts'] + 1):
            done = os.path.exists(os.path.join(ROOT, 'series', s, 'briefs', f'part{n}.json')) or \
                   os.path.exists(os.path.join(ROOT, 'series', s, f'part{n}', 'lines.json'))
            if not done:
                return ('part', s, n) if n - rendered <= AHEAD else ('wait', s, n)
    return ('new',) if unposted <= 3 else ('wait',)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--series'); ap.add_argument('--part', type=int)
    ap.add_argument('--new-series', action='store_true'); ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args()
    cfg = json.load(open(os.path.join(ROOT, 'posting/config.json')))
    if a.series and a.part:
        ok = write_part(a.series, a.part, a.dry_run)
    elif a.new_series:
        ok = new_series(cfg, a.dry_run)
    else:
        step = plan(cfg)
        print('plan:', step)
        ok = True if step[0] == 'wait' else write_part(step[1], step[2], a.dry_run) if step[0] == 'part' else new_series(cfg, a.dry_run)
    sys.exit(0 if ok else 1)
