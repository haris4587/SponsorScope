# Project Explorer notes

**SponsorScope** helps brands and creators resolve disputes about whether sponsored Bluesky posts meet an agreed brief. The brand locks the creator wallet, Bluesky DID, disclosure, messaging requirement, and deadline on GenLayer. The creator submits a post key. Validators independently fetch the public post from Bluesky, agree on the text, CID and indexing time, and check whether the messaging satisfies the brief. Deterministic rules enforce the disclosure and campaign window. The contract stores an auditable verdict and evidence snapshot. Open the website, enter a campaign ID, and review or export the finalized record. Studio's built-in account can register, submit, and request verification.

## Evidence

- Source: https://github.com/haris4587/SponsorScope
- Network: Studionet (61999), Normal (Full Consensus)
- Contract: https://explorer-studio.genlayer.com/address/0x1fE381D641b05c151fceD9Bd546f8EC1a20F0379
- Deployment: https://explorer-studio.genlayer.com/tx/0xa62343c091e19356d2a98edb3cae80d422d995285833145db2ea6551cc8eb7db
- Demo campaign ID: `sponsorscope-public-test`
- Demo evidence: [historical public Bluesky post](https://bsky.app/profile/bsky.app/post/3mdjby5ifhc2e), used as a negative fixture without any claim of sponsorship.
- Website (owner access): https://sponsorscope.mohamedansaf222.chatgpt.site/?campaign=sponsorscope-public-test
- Registration: https://explorer-studio.genlayer.com/tx/0x83842fb1137b9a4fb899d9a235bdedf4ff796b703a07143d711da702b1697a22
- Submission: https://explorer-studio.genlayer.com/tx/0x1ba4913e5917341aeb2a62d5e75af958b929b404dd50abd543c1902b0f56e1d5
- Verification: https://explorer-studio.genlayer.com/tx/0xf80d0ba54768f22d49c1c82310f3f94918da3b9163777199d42dfd27a185d514

The three application calls finalized with Studio's built-in account. The browser preview loaded the finalized brief, submission and review, and its transaction tracker returned `FINALIZED · SUCCESS` for the verification call. The review verdict was `INCONCLUSIVE` because the contract had no usable Bluesky response. A separate request to the same endpoint returned a connection reset in the test session. Live semantic approval remains unverified. The 11 offline tests cover the positive messaging path, a mismatch, an ambiguous response, and validator disagreement with test doubles.

One bounded retry also finalized and returned `INCONCLUSIVE`. Both attempts remain in the audit record. Retry receipt: https://explorer-studio.genlayer.com/tx/0xeebf5d2c16b0618572061240f045822f7ee1c149efc39f0f2ac9128e7a13b8e4
