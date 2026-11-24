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
WORDS = (300, 480)  # spoken words per part (about 2 to 3 minutes with the quiet beats)


def rd(*p):
    return open(os.path.join(ROOT, *p), encoding='utf-8').read()


def chat(messages, max_tokens=16000):
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
                parts, thinking = [], [0]
                t_end = time.time() + 600   # one reply may take at most 10 minutes, then try the next model
                with urllib.request.urlopen(req, timeout=180) as r:
                    for raw in r:
                        if time.time() > t_end:
                            raise TimeoutError('reply took over 10 minutes')
                        line = raw.decode('utf-8', 'replace').strip()
                        if not line.startswith('data:'):
                            continue
                        data = line[5:].strip()
                        if data == '[DONE]':
                            break
                        ch = json.loads(data).get('choices') or [{}]
                        delta = ch[0].get('delta', {})
                        parts.append(delta.get('content') or '')
                        if delta.get('reasoning_content') or delta.get('reasoning'):
                            thinking[0] += 1
                out = ''.join(parts)
                if not out.strip():
                    raise ValueError(f'empty reply ({thinking[0]} reasoning chunks; it may have used every token thinking)')
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
  "recap": "<1 or 2 sentences, 10 to 24 words, read before line one: Part 1 sets up the premise, later parts sum up the story so far>",
  "summary": "<3-5 sentences: what happens, the problem, the fix, the cliffhanger>",
  "new_assets": [{"type": "character|set|card|lighting", "name": "<code name>", "description": "<what it looks like>"}],
  "numbers_on_screen": ["<each data number shown on screen, at most 2>"],
  "lines": [{"id": "l01", "scene": true, "spoken": "<what the voice reads>", "caption": "<1 to 8 words shown on screen, one or two **keyword** in double asterisks>", "hold": <optional seconds of silence after this line, 0 to 7, for a moment that needs to breathe>}],
  "shots": [{"n": 1, "line": "l01", "set": "<set name>", "lighting": "FULL|GEN|DARK|other", "frame": "<what is in frame>", "action": "<the one movement in the shot>", "card": "<UI card shown, or empty>", "sound": "<effect, or empty>"}],
  "end_card": {"title": "PART <next>", "hook": "<short question or line under it>"},
  "continuity_out": "<state of the story at the end: day and time, who knows what, supplies, injuries, anything later parts must keep>"
}'''

RULES = f'''How these stories hold viewers (study this; the checker enforces the HARD rules):
- THE FIRST LINE PULLS YOU IN. Part 1 may open quiet and ordinary with one eerie line of foreshadowing ("If only you knew how wrong you'd be."), then turn. Part 2 onward opens in the middle of the danger the last part ended on. Under 20 words.
- LET IT BREATHE, THEN HIT. Rishi wants pacing like a real short film: every line still shows something (an action, dialogue, a reveal, a reaction, a small observed detail), but give the big moments room. Use "hold" (3 to 7 seconds of silence after a line) for the character taking in a new place, a stare held too long, the beat before and after a reveal. Two to five holds per part.
- MAKE INTRODUCTIONS COUNT. When a new character appears, spend two or three lines on them: what you notice first, what they do, how they react to you. Never name a character before they introduce themselves or someone names them in the story; until then they are "the old woman", "the man in the red tracksuit". Don't bounce from one thing to the next.
- ESCALATE. A new reveal, threat or turn at least every three lines. Midway through, a twist that changes what the viewer thought was going on.
- PEOPLE TALK. Characters speak and text in short quoted lines ("Don't move." / "Who unlocked this?"). At least four lines contain quoted speech or a text message. Let dialogue carry the story instead of the narrator summarizing it. When two people speak in one line, name each speaker ("Marcus says", "Dana snaps"), because the listener can't see who is talking.
- KEEP THE MYSTERY FAIR. Spread suspicion across at least two people and don't hand the viewer the answer before the outline reveals it.
- CLEAN GRAMMAR. Present tense for what is happening, past tense for what already happened.
- SHORT AND SENSORY. Short sentences. Concrete physical details you can see, hear or feel (the hum stops, cold air on your neck, a key turning). No dramatic one-word lines that say nothing.
- A CLOCK IS RUNNING. Show time passing in the world (a phone lock screen, a wall clock, a day counter on a calendar) so there's urgency.
- OPEN WITH A HOOK, NOT A RECAP. "recap" is one short sentence (10 to 20 words) in second person that sums up the situation a new viewer drops into, not a list of what happened: "You're aboard a mysterious train you can't leave, and someone is calling you." Part 1: the premise. Don't repeat line one.
- PICK UP EXACTLY WHERE THE LAST PART ENDED. Line one continues the previous part's final moment as it happened (if the call was answered, it is still going), never a different version of it.
- REACT LIKE A REAL PERSON. After anything frightening or strange, "you" reacts the way a real person would: asks what that was, demands an answer, argues, shakes. Never move straight on to the next event as if nothing happened.
- END ON A TWIST AND A QUESTION. The last two lines reveal something new and leave a question the viewer needs answered. The end card names the next part, and its hook is the question this part's last lines leave (after a call from "Mom": "Is it really Mom?"), never a mystery this part didn't raise.
- NO FILLER ADVERBS. Cut "slowly", "carefully", "suddenly", "quietly" and the like; show it with the action.
- Second person: the viewer is "you". Survival detail appears only inside something a character is doing.
- HARD: the Spoken text has no digits and no abbreviations. Write every number and time as it is said ("two in the morning", "twenty-two", "a foot and a half", "three days"). Never "AM", "PM", "ft", "lb", "%".
- HARD: total Spoken words between {WORDS[0]} and {WORDS[1]}. 24 to 55 lines. Each Spoken line is one to three short sentences.
- HARD: the first line is under 20 words.
- HARD: at least four lines contain quoted dialogue or a text message (use straight double quotes in Spoken).
- HARD: every Caption is 1 to 6 words copied from its own Spoken line (the exact words, not a summary like "Dana distrusts stranger"), with one or two **keywords** in double asterisks. Digits are allowed in captions.
- HARD: at most two data numbers on screen in the whole part (list them in numbers_on_screen). Show amounts as pictures, not stat cards. Times appear on a clock or phone inside a shot.
- HARD: 24 to 60 shots, each tied to a line id, using an existing set or one listed in new_assets. A shot lasts 2 to 7 seconds. No two shots in a row with the same set and the same framing.
- "scene": true on a line that starts a new location or time jump.'''


EDITOR = """You are the story editor. Rewrite the brief below to make it gripping, then return the full corrected JSON (same keys).
Check every line against this list and fix what fails:
1. Line one pulls the viewer in (for Part 2 onward: the most shocking fact, said plainly, under 20 words); characters are not named before they introduce themselves; new characters get a real introduction; big moments get a hold. Bad: "At a quarter to five you walk toward aisle twenty-two with Dana and Marcus." Good: "The man in aisle twenty-two is eating dog food straight out of the bag."
2. Dialogue sounds like real, scared, tired people. Short, specific, a little rude. Bad: "We can't trust a stowaway." Good: "He's been in here all night. Watching us."
3. Show the events, don't summarize them. Never skip a key event with "two days later". If time jumps, land on something happening ("Day three. The lights die mid-sentence.").
4. Every line adds something new: an action, a line of speech, a reveal, or a reaction. Cut or merge lines that repeat.
5. The ending is a twist plus a question, and it does not give the answer away. Don't show the obvious suspect doing the obvious thing in the last line.
6. Plain grammar. Narration is present tense ("Dana lifts the can"); things that happened earlier are past tense ("He was inside before she locked up"). Read every Spoken line aloud in your head: no broken word order, no stage directions inside Spoken.
8. When two people speak in one line, name who says each part: "He's been in here all night," Marcus says. "He's starving," Dana snaps. A listener only hears the voice, so an unnamed back-and-forth is confusing.
9. Keep the mystery fair: spread suspicion across at least two characters, and don't show a clue that answers the big question before the outline reveals it (for example, a suspect already holding the missing item).
7. Captions are 1 to 6 words copied from their own Spoken line, with one or two **keywords**.
10. After anything frightening, "you" reacts like a real person (asks what that was, argues, shakes) before the story moves on.
11. The end card hook is the question the last lines leave, nothing else. The recap is one short hook sentence about the situation (not a list of events) and doesn't repeat line one.
12. Cut filler adverbs (slowly, carefully, suddenly, quietly).
Keep all the HARD rules. Keep the shots matched to the lines (renumber shots and line ids if you add or cut lines)."""


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


def bible_text(series):
    p = os.path.join(ROOT, 'series', series, 'BIBLE.md')
    return open(p, encoding='utf-8').read() if os.path.exists(p) else ''


def check_brief(b, series, part, total_parts):
    probs = []
    lines = b.get('lines') or []
    ids = {L.get('id') for L in lines}
    words = sum(len(L.get('spoken', '').split()) for L in lines)
    if not WORDS[0] <= words <= WORDS[1]:
        probs.append(f'Spoken words total {words}; must be {WORDS[0]} to {WORDS[1]}.')
    if not 24 <= len(lines) <= 55:
        probs.append(f'{len(lines)} lines; must be 24 to 55.')
    rc = (b.get('recap') or '').split()
    if not 10 <= len(rc) <= 26:
        probs.append(f'recap is {len(rc)} words; must be one or two sentences, 10 to 24 words.')
    if lines and len(lines[0].get('spoken', '').split()) >= 20:
        probs.append('The first line (the hook) must be under 20 words.')
    talk = sum(1 for L in lines if re.search(r'"[^"]{2,}"', L.get('spoken', '')))
    names = set(re.findall(r'^- \*\*([A-Z][a-z]+)\*\*', bible_text(series), re.M)) - {'You'}
    for L in lines:
        sp = L.get('spoken', '')
        if len(re.findall(r'"[^"]{2,}"', sp)) >= 2:
            outside = re.sub(r'"[^"]*"', ' ', sp)
            if not (any(n in outside for n in names) or re.search(r'\b(says|asks|snaps|whispers|mutters|says|shouts|yells|replies|answers|calls)\b', outside)):
                probs.append(f'{L.get("id")}: two people speak but nobody is named ("{sp}"). Say who says each part.')
    if talk < 4:
        probs.append(f'Only {talk} lines have quoted dialogue or texts; need at least 4. Let characters speak.')
    for L in lines:
        sp, cap = L.get('spoken', ''), L.get('caption', '')
        if re.search(r'\d', sp):
            probs.append(f'{L.get("id")}: Spoken has digits ("{sp}"). Write numbers as words.')
        if re.search(r'\b(AM|PM|A\.M\.|P\.M\.|ft|lb|lbs|sq|mph|ID)\b|%', sp):
            probs.append(f'{L.get("id")}: Spoken has an abbreviation ("{sp}"). Write it as it is said.')
        if '**' not in cap or cap.count('**') % 2:
            probs.append(f'{L.get("id")}: Caption needs one or two **keywords** ("{cap}").')
        cw = [w for w in re.findall(r"[a-z']+", cap.lower())]
        sw = set(re.findall(r"[a-z']+", sp.lower()))
        if len(cw) > 6:
            probs.append(f'{L.get("id")}: Caption is over 6 words ("{cap}").')
        if cw and sum(w in sw for w in cw) / len(cw) < 0.75:
            probs.append(f'{L.get("id")}: Caption "{cap}" must use the words of its Spoken line, not a summary.')
    if len(b.get('numbers_on_screen') or []) > 2:
        probs.append(f'numbers_on_screen has {len(b["numbers_on_screen"])}; at most 2.')
    shots = b.get('shots') or []
    if not 24 <= len(shots) <= 60:
        probs.append(f'{len(shots)} shots; must be 24 to 60.')
    for s in shots:
        if s.get('line') not in ids:
            probs.append(f'shot {s.get("n")} points at line "{s.get("line")}", which does not exist.')
    for a, c in zip(shots, shots[1:]):
        if a.get('set') == c.get('set') and a.get('frame') == c.get('frame'):
            probs.append(f'shots {a.get("n")} and {c.get("n")} repeat the same set and framing.')
    want = 'THE END' if part == total_parts else ('FINAL PART' if part + 1 == total_parts else f'PART {part + 1}')
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
    sys_msg = ('You write serialized animated stories (survival, mystery and horror) for a TikTok channel ("Stories from the Library"). '
               'Each story is three parts of about two and a half minutes, narrated in second person over flat vector cartoon shots.\n\n'
               + RULES + '\n\n' + BRIEF_SCHEMA)
    user = (f'STORY BIBLE\n{bible}\n\nSTYLE LOCK (what the animator can draw; reuse these sets and characters)\n{style[:9000]}\n\n'
            f'WHAT HAPPENED SO FAR\n{prior_lines(series, part)}\n\n'
            f'Write Part {part} of {meta["parts"]} of "{meta["title"]}", following the outline for Part {part}.')
    msgs = [{'role': 'system', 'content': sys_msg}, {'role': 'user', 'content': user}]
    edited = False
    for attempt in range(1, 6):
        print(f'writing {series} part {part}, attempt {attempt}')
        text = chat(msgs)
        try:
            b = extract_json(text)
            probs = check_brief(b, series, part, meta['parts'])
        except Exception as e:
            b, probs = None, [f'Your reply was not valid JSON ({e}). Return only the JSON object in a ```json block.']
        if not probs and not edited:
            print('  passed the checker; sending to the editor pass')
            edited = True
            msgs += [{'role': 'assistant', 'content': text},
                     {'role': 'user', 'content': EDITOR}]
            continue
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
    print('giving up after 5 attempts; nothing written')
    return False


# ---------- new series ----------

def new_series(cfg, dry):
    taken = []
    for s in cfg['series_order']:
        taken.append(json.load(open(os.path.join(ROOT, 'series', s, 'series.json')))['title'])
    example = rd('series', 'bulkway', 'BIBLE.md')
    sys_msg = ('You plan serialized animated survival stories for a TikTok channel ("Stories from the Library"). '
               'Each story is three parts of about two and a half minutes, second person ("you"), flat vector cartoon style.')
    user = (f'Here is an example story bible:\n\n{example}\n\n'
            f'Stories already made: {", ".join(taken)}. Plan a NEW story in a different setting.\n'
            'Requirements: an ordinary, believable situation (a normal storm, breakdown, outage, getting stranded or locked in), '
            'not a monster, zombie or apocalypse. One main location that can be drawn as 5 to 7 reusable sets. '
            'Three to five characters plus "you", each with a clear visual signature. Three parts: part 1 sets it up and ends on a hook, part 2 escalates and ends on a cliffhanger, '
            'part 3 resolves it. Same section headings as the example.\n\n'
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
        json.dump({'title': j['title'], 'parts': 3, 'hashtags': j['hashtags']}, open(os.path.join(d, 'series.json'), 'w'), indent=2)
        cfg['series_order'].append(slug)
        json.dump(cfg, open(os.path.join(ROOT, 'posting/config.json'), 'w'), indent=2)
        print(f'new series: {slug} ({j["title"]})')
        return True
    return False


# ---------- what to do today ----------

ACTIVE = 2   # stories in progress at once; the poster alternates between them


def plan(cfg):
    """Write the next part of whichever active story needs one (staying at most AHEAD briefs past its renders);
    start a new story when fewer than ACTIVE stories still have parts left to post."""
    posted = {(p['series'], p['part']) for p in json.load(open(os.path.join(ROOT, 'posting/state.json')))['posted']}
    active, todo = 0, []
    for s in cfg['series_order']:
        meta = json.load(open(os.path.join(ROOT, 'series', s, 'series.json')))
        if all((s, n) in posted for n in range(1, meta['parts'] + 1)):
            continue
        active += 1
        if s in cfg.get('paused', []):
            print(f'{s} is paused; skipping'); continue
        rendered = sum(os.path.exists(os.path.join(ROOT, 'renders', s, f'part{n}.mp4')) for n in range(1, meta['parts'] + 1))
        for n in range(1, meta['parts'] + 1):
            done = os.path.exists(os.path.join(ROOT, 'series', s, 'briefs', f'part{n}.json')) or \
                   os.path.exists(os.path.join(ROOT, 'series', s, f'part{n}', 'lines.json'))
            if not done:
                if n - rendered <= AHEAD: todo.append((n, s))
                break
    if active < ACTIVE:
        return ('new',)
    if todo:
        n, s = min(todo)
        return ('part', s, n)
    return ('wait',)


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
