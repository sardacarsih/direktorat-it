#!/usr/bin/env python3
"""Read-only probes; publish sanitized status atomically. Compatible with Python 3.6."""
import argparse
import concurrent.futures
import contextlib
import datetime
import json
import os
import shutil
import sqlite3
import subprocess
import time
import urllib.request

WINDOW = 30 * 86400


def command_ok(args):
    try:
        return subprocess.run(args, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                              timeout=5).returncode == 0
    except (OSError, subprocess.TimeoutExpired):
        return False


def contains(actual, expected):
    if isinstance(expected, dict):
        return isinstance(actual, dict) and all(
            key in actual and contains(actual[key], value) for key, value in expected.items())
    return actual == expected


def http_probe(check):
    started = time.monotonic()
    headers = {'User-Agent': 'DirektoratIT-Monitor/1.0'}
    if check.get('host'):
        headers['Host'] = check['host']
    try:
        request = urllib.request.Request(check['url'], headers=headers)
        with urllib.request.urlopen(request, timeout=5) as response:
            ok = 200 <= response.status < 300
            if 'json' in check:
                ok = ok and contains(json.loads(response.read(65536)), check['json'])
        return ok, round((time.monotonic() - started) * 1000)
    except Exception:
        return False, None


def app_probe(app):
    services = all(command_ok(['systemctl', 'is-active', '--quiet', unit])
                   for unit in app['services'])
    checks = [http_probe(check) for check in app['checks']]
    public, public_ms = http_probe({'url': app['publicUrl']})
    local = services and all(ok for ok, _ in checks)
    return app, local, max((ms for _, ms in checks if ms is not None), default=None), public, public_ms


def cpu_ticks():
    with open('/proc/stat') as stream:
        values = list(map(int, stream.readline().split()[1:9]))
    return sum(values), values[3] + values[4]


def resources():
    total1, idle1 = cpu_ticks()
    time.sleep(0.2)
    total2, idle2 = cpu_ticks()
    cpu = round(100 * (1 - (idle2 - idle1) / max(1, total2 - total1)), 1)
    with open('/proc/meminfo') as stream:
        memory = {line.split(':')[0]: int(line.split()[1]) for line in stream}
    ram = round(100 * (1 - memory['MemAvailable'] / memory['MemTotal']), 1)
    disk = max(round(100 * shutil.disk_usage(path).used / shutil.disk_usage(path).total, 1)
               for path in ['/', '/apps'])
    return {'cpuPercent': max(0, min(cpu, 100)), 'ramPercent': ram, 'diskPercent': disk}


def record(db, key, ok, now):
    previous = db.execute('SELECT streak FROM current_state WHERE target=?', (key,)).fetchone()
    streak = 0 if ok else (previous[0] if previous else 0) + 1
    db.execute('INSERT OR REPLACE INTO current_state VALUES (?, ?)', (key, streak))
    db.execute('INSERT INTO samples VALUES (?, ?, ?)', (key, now, int(ok)))
    return 'operational' if ok else ('down' if streak >= 3 else 'degraded')


def summary(db, key, now):
    count, success, first = db.execute(
        'SELECT COUNT(*), SUM(ok), MIN(ts) FROM samples WHERE target=? AND ts>=?',
        (key, now - WINDOW)).fetchone()
    recent = db.execute('SELECT ok FROM samples WHERE target=? ORDER BY ts DESC LIMIT 30',
                        (key,)).fetchall()
    return {'uptimePercent': round(100 * success / count, 2) if count else None,
            'sampleCount': count, 'coveragePercent': round(min(100, count / (WINDOW / 60) * 100), 3),
            'since': iso(first) if first else None,
            'history': [bool(row[0]) for row in reversed(recent)]}


def iso(timestamp):
    return datetime.datetime.fromtimestamp(timestamp, datetime.timezone.utc).isoformat()


def collect(config, db_path, output):
    started = time.time()
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        results = list(pool.map(app_probe, config['apps']))
    host = resources()
    database_ok = command_ok(['/usr/pgsql-18/bin/pg_isready', '-h', '127.0.0.1', '-p', '5432', '-t', '3'])
    tunnel_ok = command_ok(['systemctl', 'is-active', '--quiet', 'cloudflared'])
    now = time.time()
    with contextlib.closing(sqlite3.connect(db_path)) as db:
        db.execute('CREATE TABLE IF NOT EXISTS samples (target TEXT, ts REAL, ok INTEGER)')
        db.execute('CREATE INDEX IF NOT EXISTS samples_target_ts ON samples(target, ts)')
        db.execute('CREATE TABLE IF NOT EXISTS current_state (target TEXT PRIMARY KEY, streak INTEGER)')
        db.execute('DELETE FROM samples WHERE ts<?', (now - WINDOW,))
        apps = []
        for app, local, local_ms, public, public_ms in results:
            local_status = record(db, app['id'] + ':local', local, now)
            public_status = record(db, app['id'] + ':public', public, now)
            apps.append({'id': app['id'], 'name': app['name'], 'status': local_status,
                         'latencyMs': local_ms if local else None, 'publicStatus': public_status,
                         'publicLatencyMs': public_ms if public else None,
                         'checkType': 'http' if app.get('limited') else 'health',
                         **summary(db, app['id'] + ':local', now)})
        host_ok = host['ramPercent'] < 90 and host['diskPercent'] < 90 and host['cpuPercent'] < 90
        host['status'] = 'operational' if host_ok else 'degraded'
        database_status = record(db, 'database', database_ok, now)
        public_ok = tunnel_ok and all(row[3] for row in results)
        public_status = record(db, 'public', public_ok, now)
        db.commit()
    payload = {'version': 1, 'checkedAt': iso(now), 'startedAt': iso(started), 'intervalSeconds': 60,
               'windowDays': 30, 'probeLocation': 'same-host', 'externalMonitor': False,
               'apps': apps, 'host': host, 'database': {'status': database_status, 'checkType': 'accepting-connections'},
               'public': {'status': public_status, 'available': sum(int(row[3]) for row in results),
                          'total': len(results)}}
    temp = output + '.tmp'
    with open(temp, 'w') as stream:
        json.dump(payload, stream, ensure_ascii=True, allow_nan=False)
        stream.flush()
        os.fsync(stream.fileno())
    os.chmod(temp, 0o644)
    os.replace(temp, output)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--config', default='/apps/it-direktorat/monitoring/config.json')
    parser.add_argument('--database', default='/apps/it-direktorat/monitoring/data/history.sqlite')
    parser.add_argument('--output', default='/apps/it-direktorat/status/status.json')
    args = parser.parse_args()
    with open(args.config) as stream:
        collect(json.load(stream), args.database, args.output)
