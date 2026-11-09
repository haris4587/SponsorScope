# SponsorScope

SponsorScope gives brands and creators a shared record of whether a public sponsored Bluesky post meets an agreed brief. The brand locks a creator wallet, a Bluesky DID, a UTC deadline, a disclosure hashtag, and a messaging requirement. The creator wallet submits a post key. Either participant can request a review, and anyone can read and export the finalized evidence.

## Run locally

Requires Node.js 20.19+ or 22.12+ and Python 3.10+ for the offline tests.

```sh
npm ci
npm test
npm run dev
npm run build
```

The site reads the default Studionet contract configured in [web/deployment.js](web/deployment.js). Set `VITE_CONTRACT_ADDRESS` when building to point the frontend at a fresh deployment of the same contract.

## Try a campaign

The [hosted website](https://sponsorscope.mohamedansaf222.chatgpt.site/) is owner-access only. The [Studionet explorer record](https://explorer-studio.genlayer.com/address/0x1fE381D641b05c151fceD9Bd546f8EC1a20F0379) and this repository are public. Wait for each write to finalize before submitting the next.

1. Open the site and use **Find a campaign** to read a finalized record. The ledger shows the locked terms, canonical post URI, review attempts, and archived evidence. Use **Export audit record** to download the JSON.
2. To write using Studio's built-in account, create a file from [contracts/sponsor_scope.py](contracts/sponsor_scope.py) in [GenLayer Studio](https://studio.genlayer.com/contracts), open **Run and Debug**, and deploy with **Normal (Full Consensus)**. For a demo, the same Studio wallet can fill both roles. For real campaigns, use the brand wallet to call `register` and set the creator's Studionet wallet and Bluesky DID.
3. Publish the agreed disclosure and message on Bluesky after registering the campaign. From the creator wallet, call `submit` with the campaign ID and the 13-character key after `/post/` in the post link.
4. From either participant wallet call `verify`, wait for finalization, and read `get_submission` in Studio or the site's ledger. The website also accepts transaction hashes from Studio and can sign the same methods with an injected Studionet wallet if one is available.

## What is verified

- Each validator independently queries the fixed [Bluesky AppView endpoint](https://docs.bsky.app/docs/api/app-bsky-feed-get-posts). The contract checks the expected AT URI and author DID, and consensus binds the post text, record CID, and platform indexing time.
- Deterministic rules check for the exact disclosure token, ignoring letter case, and require the platform index time to be between registration and the UTC deadline. The creator's self-declared timestamp is ignored.
- If both deterministic checks pass, the leader and validators independently classify whether the actual post text satisfies the locked messaging requirement. The equivalence rule checks agreement on the classification. A validator disagreement can prevent the transaction from producing a receipt.
- The receipt is `VERIFIED`, `NON_COMPLIANT`, or `INCONCLUSIVE`. Inconclusive reviews can be retried up to three total attempts. A conclusive result closes the review. Briefs and submitted post keys are immutable, and each recorded attempt preserves the evidence used at that time.

## Scope

The first release handles public Bluesky text posts with PLC DIDs and one deliverable per campaign. It treats AppView as the authority for its observed indexing time, which may differ from publication time. Brand and creator should agree on the correct DID before locking a brief. This workflow checks the post's author DID and the submitting wallet as separate facts. It does not prove that the wallet holder controls the Bluesky account. Media quality, audience metrics, and truth of product claims are outside this text assessment. The contract does not move funds or adjudicate legal rights. Campaign terms and the archived public post text are visible on-chain, so use only public campaign information.

## Verification

The offline suite exercises access control, immutability, the exact hashtag, the platform timestamp, evidence identity, decision handling, retry limits, and independent validator disagreement. See [review notes](docs/submission.md) for live evidence.
