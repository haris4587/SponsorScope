# Project Explorer notes

**SponsorScope** helps brands and creators resolve disputes about whether sponsored Bluesky posts meet an agreed brief. The brand locks the creator wallet, Bluesky DID, disclosure, messaging requirement, and deadline on GenLayer. The creator submits a post key. Validators independently fetch the public post from Bluesky, agree on the text, CID and indexing time, and check whether the messaging satisfies the brief. Deterministic rules enforce the disclosure and campaign window. The contract stores an auditable verdict and evidence snapshot. Open the website, enter a campaign ID, and review or export the finalized record. Studio's built-in account can register, submit, and request verification.

## Evidence

- Source: https://github.com/haris4587/SponsorScope
- Network: Studionet (61999), Normal (Full Consensus)
- Contract: https://explorer-studio.genlayer.com/address/0x1fE381D641b05c151fceD9Bd546f8EC1a20F0379
- Deployment: https://explorer-studio.genlayer.com/transactions/0xa62343c091e19356d2a98edb3cae80d422d995285833145db2ea6551cc8eb7db
- Demo campaign ID: `sponsorscope-public-test`
- Demo evidence: [historical public Bluesky post](https://bsky.app/profile/bsky.app/post/3mdjby5ifhc2e), used as a negative fixture without any claim of sponsorship.
