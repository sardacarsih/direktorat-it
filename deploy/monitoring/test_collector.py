import importlib.util
import json
import os
import sqlite3
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('collector', os.path.join(os.path.dirname(__file__), 'collector.py'))
collector = importlib.util.module_from_spec(spec)
spec.loader.exec_module(collector)


class CollectorTests(unittest.TestCase):
    def test_dependency_health(self):
        self.assertTrue(collector.contains({'deps': {'postgres': 'ok', 'redis': 'ok'}}, {'deps': {'postgres': 'ok'}}))
        self.assertFalse(collector.contains({'deps': {'postgres': 'failed'}}, {'deps': {'postgres': 'ok'}}))
        self.assertFalse(collector.contains({}, {'status': 'ok'}))

    def test_failed_dependency_is_not_healthy_service(self):
        app = {'services': ['service'], 'checks': [{'url': 'http://local'}], 'publicUrl': 'https://public'}
        with patch.object(collector, 'command_ok', return_value=True), patch.object(collector, 'http_probe', side_effect=[(False, None), (True, 10)]):
            _, local, _, public, _ = collector.app_probe(app)
        self.assertFalse(local)
        self.assertTrue(public)

    def test_failure_confirmation_recovery_and_observed_uptime(self):
        with sqlite3.connect(':memory:') as db:
            db.execute('CREATE TABLE samples (target TEXT, ts REAL, ok INTEGER)')
            db.execute('CREATE TABLE current_state (target TEXT PRIMARY KEY, streak INTEGER)')
            states = [collector.record(db, 'app', ok, 1000 + index * 60) for index, ok in enumerate([True, False, False, False, True])]
            self.assertEqual(states, ['operational', 'degraded', 'degraded', 'down', 'operational'])
            result = collector.summary(db, 'app', 1300)
            self.assertEqual(result['uptimePercent'], 40)
            self.assertEqual(result['sampleCount'], 5)
            self.assertLess(result['coveragePercent'], 1)
            self.assertEqual(result['history'], [True, False, False, False, True])
            self.assertIsNone(collector.summary(db, 'missing', 1300)['uptimePercent'])

    def test_publication_and_collection_failure_preserve_previous_snapshot(self):
        app = {'id': 'app', 'name': 'Example'}
        with tempfile.TemporaryDirectory() as folder:
            db = os.path.join(folder, 'history.sqlite')
            output = os.path.join(folder, 'status.json')
            with patch.object(collector, 'app_probe', return_value=(app, True, 20, False, None)), patch.object(collector, 'resources', return_value={'cpuPercent': 10, 'ramPercent': 20, 'diskPercent': 30}), patch.object(collector, 'command_ok', return_value=True):
                collector.collect({'apps': [app]}, db, output)
            with open(output) as stream:
                original = stream.read()
            snapshot = json.loads(original)
            self.assertEqual(snapshot['apps'][0]['status'], 'operational')
            self.assertEqual(snapshot['apps'][0]['publicStatus'], 'degraded')
            self.assertFalse(snapshot['externalMonitor'])
            self.assertNotIn('url', original)
            with patch.object(collector, 'app_probe', side_effect=RuntimeError('collector failed')):
                with self.assertRaises(RuntimeError):
                    collector.collect({'apps': [app]}, db, output)
            with open(output) as stream:
                self.assertEqual(stream.read(), original)


if __name__ == '__main__':
    unittest.main()
