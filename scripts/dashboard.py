"""Build the live dashboard (site/status.json + site/index.html) and push it to the public lnl-dashboard repo (GitHub Pages).
Run by .github/workflows/dashboard.yml on every push, whenever a write/voice/post job starts or finishes, and every 30 minutes.

What it shows: every story and part (script written, voice recorded, rendered, posted), the GitHub jobs running right now and
recently, what the render session is doing (status/render.json, written by the Claude render runs), the schedule, and a
playable preview of each rendered part (uploaded to Cloudinary as lnl-stories/previews/<series>__partN).
Nothing secret goes in: no keys, only titles, scripts, statuses and video links.

Env: GITHUB_TOKEN, GITHUB_REPOSITORY (runs), CLOUDINARY_URL (previews; optional), DASHBOARD_TOKEN (push; optional = build only)."""
import hashlib, json, os, shutil, subprocess, sys, time, uuid, datetime
import urllib.request, urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, 'site')
rd = lambda *p: json.load(open(os.path.join(ROOT, *p), encoding='utf-8'))
ex = lambda *p: os.path.exists(os.path.join(ROOT, *p))
now = datetime.datetime.now(datetime.timezone.utc)


def gh(path):
    tok, repo = os.environ.get('GITHUB_TOKEN'), os.environ.get('GITHUB_REPOSITORY')
    if not tok or not repo: return None
    req = urllib.request.Request(f'https://api.github.com/repos/{repo}/{path}', headers={'Authorization': f'Bearer {tok}', 'Accept': 'application/vnd.github+json'})
    try:
        with urllib.request.urlopen(req, timeout=30) as r: return json.load(r)
    except Exception as e:
        print('github api:', e); return None


# ---------- previews on Cloudinary (only re-uploaded when the render changes) ----------
def upload(path, public_id):
    u = urllib.parse.urlparse(os.environ['CLOUDINARY_URL']); key, secret, cloud = u.username, u.password, u.hostname
    params = {'overwrite': 'true', 'public_id': public_id, 'timestamp': str(int(time.time()))}
    sig = hashlib.sha1(('&'.join(f'{k}={params[k]}' for k in sorted(params)) + secret).encode()).hexdigest()
    b = uuid.uuid4().hex; body = b''
    for k, v in dict(params, api_key=key, signature=sig).items(): body += f'--{b}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode()
    body += f'--{b}\r\nContent-Disposition: form-data; name="file"; filename="v.mp4"\r\nContent-Type: video/mp4\r\n\r\n'.encode() + open(path, 'rb').read() + f'\r\n--{b}--\r\n'.encode()
    req = urllib.request.Request(f'https://api.cloudinary.com/v1_1/{cloud}/video/upload', data=body, headers={'Content-Type': f'multipart/form-data; boundary={b}'}, method='POST')
    with urllib.request.urlopen(req, timeout=600) as r: return json.load(r)['secure_url']


def previews(parts):
    cache_p = os.path.join(ROOT, 'status', 'previews.json')
    cache = json.load(open(cache_p)) if os.path.exists(cache_p) else {}
    changed = False
    for p in parts:
        f = os.path.join(ROOT, 'renders', p['series'], f"part{p['part']}.mp4")
        if not os.path.exists(f): f = os.path.join(ROOT, 'previews', p['series'], f"part{p['part']}.mp4")   # rendered, but Rishi posts it himself
        if not os.path.exists(f): continue
        h = hashlib.sha1(open(f, 'rb').read()).hexdigest()[:12]; k = f"{p['series']}/{p['part']}"
        if cache.get(k, {}).get('hash') != h and os.environ.get('CLOUDINARY_URL'):
            try:
                cache[k] = {'hash': h, 'url': upload(f, f"lnl-stories/previews/{p['series']}__part{p['part']}")}; changed = True
            except Exception as e: print('preview upload failed:', e)
        if k in cache: p['preview'] = cache[k]['url']
    if changed:
        os.makedirs(os.path.dirname(cache_p), exist_ok=True); json.dump(cache, open(cache_p, 'w'), indent=1)
    return changed


def build():
    cfg = rd('posting', 'config.json'); state = rd('posting', 'state.json')
    posted = {(p['series'], p['part']): p for p in state['posted']}
    stories, parts = [], []
    for s in cfg['series_order']:
        meta = rd('series', s, 'series.json'); st = {'slug': s, 'title': meta['title'], 'parts': [], 'paused': s in cfg.get('paused', [])}
        for n in range(1, meta['parts'] + 1):
            p = {'series': s, 'part': n}
            bj = os.path.join('series', s, 'briefs', f'part{n}.json')
            if ex(bj):
                b = rd(bj); p['title'] = b.get('title'); p['summary'] = b.get('summary'); p['end_card'] = b.get('end_card')
                p['script'] = [l.get('spoken') or l.get('Spoken') for l in b.get('lines', [])]
            p['written'] = ex(bj) or ex('series', s, 'briefs', f'part{n}.md')
            p['rendered'] = ex('renders', s, f'part{n}.mp4') or ex('previews', s, f'part{n}.mp4')
            p['voiced'] = ex('series', s, f'part{n}', 'voices', 'chunks', 'words.json') or ex('series', s, f'part{n}', 'voices', 'narration.wav') or p['rendered']
            if (s, n) in posted:
                q = posted[(s, n)]; p['posted'] = q.get('posted_at'); p['video'] = q.get('video_url'); p['post_note'] = q.get('note')
            st['parts'].append(p); parts.append(p)
        stories.append(st)
    previews(parts)
    runs = []
    r = gh('actions/runs?per_page=25')
    titles = {st['slug']: st['title'] for st in stories}
    for x in (r or {}).get('workflow_runs', []):
        m = __import__('re').search(r'(\w+) part (\d+)', x.get('display_title') or '')
        target = {'series': m[1], 'part': int(m[2]), 'story': titles.get(m[1], m[1])} if m and m[1] in titles else None
        runs.append({'target': target, 'name': x['name'], 'status': x['status'], 'conclusion': x['conclusion'], 'started': x.get('run_started_at') or x['created_at'],
                     'updated': x['updated_at'], 'url': x['html_url'], 'event': x['event'], 'title': x.get('display_title')})
    render = rd('status', 'render.json') if ex('status', 'render.json') else None
    out = {'updated': now.isoformat(timespec='seconds'), 'stories': stories, 'runs': runs, 'render': render,
           'schedule': [{'what': 'Write the next script', 'when': 'daily 9:47 AM ET', 'where': 'GitHub'},
                        {'what': 'Record voices', 'when': 'daily 4:17 PM ET (and right after a script lands)', 'where': 'GitHub'},
                        {'what': 'Post the next part', 'when': 'daily 7:23 PM ET', 'where': 'GitHub → Cloudinary → Buffer → TikTok'},
                        {'what': 'Render the next part', 'when': 'nightly 1:37 AM ET', 'where': 'Claude'}],
           'next_post_order': 'stories take turns' + (f"; {', '.join(f'{k} waits for {v[0]} part {v[1]}' for k, v in cfg.get('post_after', {}).items())}" if cfg.get('post_after') else '')}
    os.makedirs(SITE, exist_ok=True)
    json.dump(out, open(os.path.join(SITE, 'status.json'), 'w'), indent=1, ensure_ascii=False)
    shutil.copy(os.path.join(ROOT, 'dashboard', 'index.html'), os.path.join(SITE, 'index.html'))
    open(os.path.join(SITE, '.nojekyll'), 'w').close()
    print('built site/ with', len(parts), 'parts and', len(runs), 'runs')


def push():
    tok = os.environ.get('DASHBOARD_TOKEN')
    if not tok: print('DASHBOARD_TOKEN not set: built only'); return
    repo = os.environ.get('DASHBOARD_REPO', 'RishiAnir/lnl-dashboard')
    d = '/tmp/dash'; shutil.rmtree(d, ignore_errors=True)
    run = lambda *a, **k: subprocess.run(a, check=True, **k)
    run('git', 'clone', '-q', '--depth', '1', f'https://x-access-token:{tok}@github.com/{repo}.git', d)
    for f in os.listdir(SITE): shutil.copy(os.path.join(SITE, f), os.path.join(d, f))
    run('git', '-C', d, 'add', '-A')
    if subprocess.run(['git', '-C', d, 'diff', '--cached', '--quiet']).returncode == 0: print('dashboard unchanged'); return
    run('git', '-C', d, '-c', 'user.name=lnl-stories bot', '-c', 'user.email=actions@users.noreply.github.com', 'commit', '-qm', 'Update dashboard')
    run('git', '-C', d, 'push', '-q')
    print('dashboard pushed to', repo)


if __name__ == '__main__':
    build()
    if '--push' in sys.argv: push()
