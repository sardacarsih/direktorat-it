#!/usr/bin/env python3
"""Prepare a minimal ingress addition; validation and activation are separate."""
import pathlib
import re
import sys

config = pathlib.Path('/etc/cloudflared/config.yml').read_text()
hostname = 'it.kskgroup.web.id'
if re.search(r'^\s*- hostname:\s*' + re.escape(hostname) + r'\s*$', config, re.M):
    raise SystemExit('Hostname already present; inspect existing route before changing it.')
catchall = re.search(r'^  - service: http_status:404\s*$', config, re.M)
if not catchall:
    raise SystemExit('Expected terminal catch-all not found; no changes made.')
addition = '  - hostname: it.kskgroup.web.id\n    service: http://127.0.0.1:8087\n'
pathlib.Path(sys.argv[1]).write_text(config[:catchall.start()] + addition + config[catchall.start():])
