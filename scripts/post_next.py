"""Post the next finished part to TikTok through Buffer. Run daily by .github/workflows/post.yml.

Stories take turns (see next_part): each series' next unposted part is a candidate once renders/<series>/partN.mp4
exists, and the series that posted least recently goes first. Within a series it never skips ahead.
Uploads the video to Cloudinary (signed upload), then creates a Buffer post with
the Cloudinary URL. Records the result in posting/state.json (the workflow commits it).

Env: CLOUDINARY_URL (cloudinary://KEY:SECRET@CLOUD), BUFFER_API_KEY. DRY_RUN=1 prints what it would do.
"""
import hashlib, json, os, sys, time, datetime
import urllib.request, urllib.parse, uuid

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cfg = json.load(open(os.path.join(ROOT, 'posting/config.json')))
state_path = os.path.join(ROOT, 'posting/state.json')
state = json.load(open(state_path))
done = {(p['series'], p['part']) for p in state['posted']}
DRY = os.environ.get('DRY_RUN') == '1'


def next_part():
    """Stories take turns: each series' next unposted part (in part order, never skipping ahead) is a candidate when it's
    rendered; post the candidate from the series that posted least recently, so P1 of one story, then the other story's
    next part, and so on. With only one series ready, it posts that one."""
    last = {}
    for i, p in enumerate(state['posted']): last[p['series']] = i
    ready = []
    for s in cfg['series_order']:
        meta = json.load(open(os.path.join(ROOT, 'series', s, 'series.json')))
        n = next((n for n in range(1, meta['parts'] + 1) if (s, n) not in done), None)
        if n is None: continue
        path = os.path.join(ROOT, 'renders', s, f'part{n}.mp4')
        wait = cfg.get('post_after', {}).get(s)   # e.g. {"bulkway": ["nighttrain", 1]}: hold bulkway until that part is up
        if wait and (wait[0], wait[1]) not in done: continue
        if os.path.exists(path): ready.append((last.get(s, -1), s, n, meta, path))
    if not ready: return None
    _, s, n, meta, path = min(ready, key=lambda r: r[0])
    return (s, n, meta, path)


def multipart(fields, file_field, file_path):
    b = uuid.uuid4().hex
    out = []
    for k, v in fields.items():
        out += [f'--{b}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode()]
    out += [f'--{b}\r\nContent-Disposition: form-data; name="{file_field}"; filename="{os.path.basename(file_path)}"\r\n'
            f'Content-Type: video/mp4\r\n\r\n'.encode(), open(file_path, 'rb').read(), f'\r\n--{b}--\r\n'.encode()]
    return b''.join(out), f'multipart/form-data; boundary={b}'


def cloudinary_upload(path, public_id):
    u = urllib.parse.urlparse(os.environ['CLOUDINARY_URL'])
    key, secret, cloud = u.username, u.password, u.hostname
    ts = str(int(time.time()))
    params = {'overwrite': 'true', 'public_id': public_id, 'timestamp': ts}
    to_sign = '&'.join(f'{k}={params[k]}' for k in sorted(params)) + secret
    fields = dict(params, api_key=key, signature=hashlib.sha1(to_sign.encode()).hexdigest())
    body, ctype = multipart(fields, 'file', path)
    req = urllib.request.Request(f'https://api.cloudinary.com/v1_1/{cloud}/video/upload', data=body,
                                 headers={'Content-Type': ctype}, method='POST')
    with urllib.request.urlopen(req, timeout=600) as r:
        return json.load(r)['secure_url']


def post_time():
    """GitHub's daily schedule often runs hours late, so Buffer does the timing: the post is set for the next 7:23 PM Eastern.
    Run within six hours after 7:23 PM (a late run, or by hand that evening) and it goes out now instead."""
    from zoneinfo import ZoneInfo
    tz = ZoneInfo('America/New_York'); now = datetime.datetime.now(tz)
    target = now.replace(hour=19, minute=23, second=0, microsecond=0)
    if now >= target:
        if now - target < datetime.timedelta(hours=6): return None
        target += datetime.timedelta(days=1)
    return target.isoformat(timespec='seconds')


def buffer_post(text, video_url):
    # TikTok flagged every automatic Buffer post as spam, so posts go out as Buffer reminders (notification):
    # the Buffer app on Rishi's phone pings him at post time with the video and caption ready, and he taps post
    # in TikTok. Set "scheduling": "automatic" in the config to try automatic again.
    q = '''mutation CreatePost($input: CreatePostInput!) {
      createPost(input: $input) {
        ... on PostActionSuccess { post { id } }
        ... on MutationError { message }
      }
    }'''
    when = post_time()
    variables = {'input': {'text': text, 'channelId': cfg['buffer_channel_id'], 'schedulingType': cfg.get('scheduling', 'notification'),
                           **({'mode': 'customScheduled', 'dueAt': when} if when else {'mode': 'shareNow'}), 'assets': [{'video': {'url': video_url, 'metadata': {'thumbnailOffset': 1500}}}]}}
    req = urllib.request.Request('https://api.buffer.com', data=json.dumps({'query': q, 'variables': variables}).encode(),
                                 headers={'Content-Type': 'application/json', 'Authorization': f"Bearer {os.environ['BUFFER_API_KEY']}"},
                                 method='POST')
    with urllib.request.urlopen(req, timeout=120) as r:
        resp = json.load(r)
    if resp.get('errors'):
        sys.exit(f'Buffer error: {resp["errors"]}')
    res = resp['data']['createPost']
    if 'message' in res:
        sys.exit(f'Buffer refused the post: {res["message"]}')
    return res['post']['id']


if not DRY and not (os.environ.get('CLOUDINARY_URL') and os.environ.get('BUFFER_API_KEY')):
    print('CLOUDINARY_URL or BUFFER_API_KEY secret is not set yet; not posting')
    sys.exit(0)
nxt = next_part()
if not nxt:
    print('nothing to post today (next part not rendered yet, or every series is finished)')
    sys.exit(0)
series, n, meta, path = nxt
caption = f"{cfg['caption_prefix']}: {meta['title']}, " + ('Final Part' if n == meta.get('parts') else f'Part {n}')
if n > 1:
    caption += '. Part 1 is in the playlist'
caption += f". {meta['hashtags']}"
public_id = f"{cfg['cloudinary_folder']}/{series}__part{n}"
print(f'posting {series} part {n}: {caption}')
if DRY:
    print('DRY_RUN: not uploading or posting')
    sys.exit(0)
url = cloudinary_upload(path, public_id)
print('cloudinary:', url)
post_id = buffer_post(caption, url)
print('buffer post:', post_id)
state['posted'].append({'series': series, 'part': n, 'buffer_post_id': post_id, 'video_url': url,
                        'posted_at': datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds')})
json.dump(state, open(state_path, 'w'), indent=2)
