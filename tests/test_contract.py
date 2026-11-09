"""Offline contract tests. GenVM I/O is replaced with explicit test doubles."""
import importlib.util
import json
import sys
import types
import unittest
from pathlib import Path


class Returned:
    def __init__(self, calldata):
        self.calldata = calldata


def consensus(leader, validator):
    value = leader()
    if not validator(Returned(value)):
        raise RuntimeError("Consensus disagreement")
    return value


def identity(fn):
    return fn


genlayer = types.ModuleType("genlayer")
genlayer.Address = str
genlayer.TreeMap = dict
genlayer.gl = types.SimpleNamespace(
    Contract=object, public=types.SimpleNamespace(write=identity, view=identity),
    message=types.SimpleNamespace(sender_address="brand"),
    message_raw={"datetime": "2026-11-09T10:00:00Z"},
    eq_principle=types.SimpleNamespace(strict_eq=lambda run: run()),
    vm=types.SimpleNamespace(Return=Returned, run_nondet_unsafe=consensus),
    nondet=types.SimpleNamespace(web=types.SimpleNamespace(), exec_prompt=lambda _: "MATCH"),
)
sys.modules["genlayer"] = genlayer
spec = importlib.util.spec_from_file_location(
    "sponsor_scope", Path(__file__).parents[1] / "contracts" / "sponsor_scope.py",
)
contract = importlib.util.module_from_spec(spec)
spec.loader.exec_module(contract)
gl = genlayer.gl
CREATOR = "0x" + "a" * 40
DID = "did:plc:z72i7hdynmk6r22z27h6tvur"
KEY = "3mdjby5ifhc2e"


class CampaignTest(unittest.TestCase):
    def setUp(self):
        gl.message.sender_address = "brand"
        gl.nondet.exec_prompt = lambda _: "MATCH"
        self.scope = contract.SponsorScope()
        self.scope.campaigns = {}
        self.scope.submissions = {}
        self.scope.register("test-campaign", CREATOR, DID, "2026-11-10T10:00:00Z", "#ad", "Describe a refillable bottle.")

    def submit(self):
        gl.message.sender_address = CREATOR.upper().replace("0X", "0x")
        self.scope.submit("test-campaign", KEY)

    def evidence(self, text="#Ad Try this refillable bottle.", indexed="2026-11-09T11:00:00Z", did=DID):
        def request(url, method):
            self.assertTrue(url.startswith("https://public.api.bsky.app/xrpc/app.bsky.feed.getPosts?"))
            self.assertEqual(method, "GET")
            post = {
                "uri": f"at://{DID}/app.bsky.feed.post/{KEY}", "author": {"did": did},
                "record": {"$type": "app.bsky.feed.post", "text": text, "createdAt": "1900-01-01T00:00:00Z"},
                "indexedAt": indexed, "cid": "bafy" + "a" * 30,
            }
            return types.SimpleNamespace(status_code=200, body=json.dumps({"posts": [post]}).encode())
        gl.nondet.web.request = request

    def verify(self):
        self.scope.verify("test-campaign")
        return json.loads(self.scope.get_submission("test-campaign"))["attempts"][-1]

    def test_read_unknown(self):
        self.assertEqual(self.scope.get_campaign("unknown"), "null")

    def test_campaign_cannot_be_overwritten(self):
        with self.assertRaisesRegex(ValueError, "already registered"):
            self.scope.register("test-campaign", "other", DID, "2026-11-10T10:00:00Z", "#ad", "Changed.")

    def test_creator_only_and_single_submission(self):
        with self.assertRaisesRegex(ValueError, "Only the campaign creator"):
            self.scope.submit("test-campaign", KEY)
        self.submit()
        with self.assertRaisesRegex(ValueError, "already has a submission"):
            self.scope.submit("test-campaign", KEY)

    def test_participant_only_verification(self):
        self.submit()
        gl.message.sender_address = "outsider"
        with self.assertRaisesRegex(ValueError, "Only campaign participants"):
            self.verify()

    def test_full_consensus_match_and_audit(self):
        self.submit()
        self.evidence()
        prompts = []
        def classify(prompt):
            prompts.append(prompt)
            return "MATCH"
        gl.nondet.exec_prompt = classify
        result = self.verify()
        self.assertEqual(len(prompts), 2)
        self.assertEqual(result["verdict"], "VERIFIED")
        self.assertIn("refillable bottle", result["evidence"]["text"])
        self.assertTrue(result["checks"]["indexed_in_window"])
        with self.assertRaisesRegex(ValueError, "Review is closed"):
            self.verify()

    def test_disclosure_token_boundary(self):
        self.submit()
        self.evidence("#advert refillable bottle")
        result = self.verify()
        self.assertEqual(result["verdict"], "NON_COMPLIANT")
        self.assertFalse(result["checks"]["disclosure"])
        self.assertNotIn("messaging", result["checks"])

    def test_indexed_time_overrides_self_declared_time(self):
        self.submit()
        self.evidence(indexed="2026-11-10T10:00:00.001Z")
        result = self.verify()
        self.assertEqual(result["verdict"], "NON_COMPLIANT")
        self.assertFalse(result["checks"]["indexed_in_window"])

    def test_wrong_author_fails_closed_and_retries_are_bounded(self):
        self.submit()
        self.evidence(did="did:plc:aaaaaaaaaaaaaaaaaaaaaaaa")
        for _ in range(3):
            self.assertEqual(self.verify()["verdict"], "INCONCLUSIVE")
        with self.assertRaisesRegex(ValueError, "Review is closed"):
            self.verify()

    def test_model_mismatch(self):
        self.submit()
        self.evidence()
        gl.nondet.exec_prompt = lambda _: "MISMATCH"
        self.assertEqual(self.verify()["verdict"], "NON_COMPLIANT")

    def test_invalid_model_output_can_be_retried(self):
        self.submit()
        self.evidence()
        gl.nondet.exec_prompt = lambda _: "unexpected response"
        self.assertEqual(self.verify()["verdict"], "INCONCLUSIVE")
        gl.nondet.exec_prompt = lambda _: "MATCH"
        self.assertEqual(self.verify()["verdict"], "VERIFIED")

    def test_validator_disagreement_leaves_no_receipt(self):
        self.submit()
        self.evidence()
        outcomes = iter(("MATCH", "MISMATCH"))
        gl.nondet.exec_prompt = lambda _: next(outcomes)
        with self.assertRaisesRegex(RuntimeError, "disagreement"):
            self.verify()
        self.assertEqual(json.loads(self.scope.get_submission("test-campaign"))["attempts"], [])
