"""Check that the repo's API keys work, without posting or spending anything meaningful.
Run by .github/workflows/check-keys.yml. Never prints the keys themselves."""
import base64, json, os, sys, urllib.request, urllib.parse, urllib.error

ok = True


def call(name, req):
    global ok
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            body = json.load(r)
        return body
    except urllib.error.HTTPError as e:
        print(f'FAIL {name}: HTTP {e.code} {e.read()[:300].decode(errors="replace")}')
    except Exception as e:
        print(f'FAIL {name}: {type(e).__name__}: {e}')
    ok = False
    return None


# Cloudinary: read the account's usage (needs a valid key and secret)
cu = os.environ.get('CLOUDINARY_URL', '')
if not cu.startswith('cloudinary://') or '<' in cu:
    print('FAIL cloudinary: CLOUDINARY_URL is missing or still has <placeholders>'); ok = False
else:
    u = urllib.parse.urlparse(cu)
    auth = base64.b64encode(f'{u.username}:{u.password}'.encode()).decode()
    r = call('cloudinary', urllib.request.Request(f'https://api.cloudinary.com/v1_1/{u.hostname}/usage',
                                                 headers={'Authorization': f'Basic {auth}'}))
    if r: print(f"OK   cloudinary: cloud '{u.hostname}', plan {r.get('plan')}, credits used {r.get('credits', {}).get('used_percent')}%")

# Buffer: list the organization's channels and confirm the TikTok channel is there
bk = os.environ.get('BUFFER_API_KEY', '')
if not bk:
    print('FAIL buffer: BUFFER_API_KEY is missing'); ok = False
else:
    cfg = json.load(open(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'posting/config.json')))
    def gql(q, v=None):
        return call('buffer', urllib.request.Request('https://api.buffer.com', method='POST',
                    data=json.dumps({'query': q, 'variables': v or {}}).encode(),
                    headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {bk}'}))
    r = gql('query { account { email organizations { id name } } }')
    if r and r.get('errors'):
        print(f"FAIL buffer: {r['errors']}"); ok = False
    elif r:
        orgs = r['data']['account']['organizations']
        found = False
        for o in orgs:
            c = gql('query($id: OrganizationId!) { channels(input: {organizationId: $id}) { id name service } }', {'id': o['id']})
            for ch in ((c or {}).get('data') or {}).get('channels') or []:
                if ch['id'] == cfg['buffer_channel_id']:
                    found = True
                    print(f"OK   buffer: {r['data']['account']['email']}, channel {ch['name']} ({ch['service']}) found")
        if not found:
            print(f"FAIL buffer: key works but channel {cfg['buffer_channel_id']} wasn't found in {[o['name'] for o in orgs]}"); ok = False

# NVIDIA: a 1-token chat completion on a small model
nk = os.environ.get('NVIDIA_API_KEY', '')
if not nk.startswith('nvapi-'):
    print("FAIL nvidia: NVIDIA_API_KEY is missing or doesn't start with nvapi-"); ok = False
else:
    models = call('nvidia models', urllib.request.Request('https://integrate.api.nvidia.com/v1/models',
                  headers={'Authorization': f'Bearer {nk}'}))
    ids = sorted(m['id'] for m in (models or {}).get('data', []))
    print('     nvidia chat models available:', ', '.join(i for i in ids if any(w in i for w in ('instruct', 'chat', 'llama', 'qwen', 'deepseek', 'kimi', 'nemotron', 'mistral', 'gpt-oss'))))
    tried = []
    nv_ok = False
    ok_before = ok
    for m in ('moonshotai/kimi-k3.1-pro', 'mistralai/mistral-large-4-1t-a52b', 'nvidia/nemotron-3-ultra-550b-a55b'):
        if m in tried: continue
        tried.append(m)
        r = call(f'nvidia ({m})', urllib.request.Request('https://integrate.api.nvidia.com/v1/chat/completions', method='POST',
                 data=json.dumps({'model': m, 'max_tokens': 5, 'messages': [{'role': 'user', 'content': 'Say hi'}]}).encode(),
                 headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {nk}'}))
        if r:
            print(f'OK   nvidia: key works ({m})'); nv_ok = True
    ok = ok_before and nv_ok

sys.exit(0 if ok else 1)
