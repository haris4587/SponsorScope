import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { contractAddress } from './deployment.js';

const chain = studionet;
const reader = createClient({ chain });
const get = (id) => document.getElementById(id);
const provider = window.ethereum;
const status = get('status');
const connect = get('connect');
const track = get('track');
let busy = false;
let address = null;

function show(message) {
  status.textContent = message;
}

function setBusy(value) {
  busy = value;
  document.querySelectorAll('[data-write], #track button, #connect').forEach(button => {
    button.disabled = value;
  });
}

function showError(error) {
  show(error.shortMessage || error.message || String(error));
}

function append(container, text, tag = 'p', className = '') {
  const node = document.createElement(tag);
  node.textContent = text;
  node.className = className;
  container.append(node);
}

async function readCampaign(id) {
  const result = get('result');
  result.textContent = 'Reading finalized contract state…';
  try {
    if (!contractAddress) throw Error('Set the Studionet contract address before reading.');
    const [campaign, submission] = await Promise.all(['get_campaign', 'get_submission'].map(
      functionName => reader.readContract({ address: contractAddress, functionName, args: [id], transactionHashVariant: 'finalized' })
        .then(JSON.parse)
    ));
    if (get('lookup-form').elements.campaign.value !== id) return;
    result.replaceChildren();
    if (!campaign) {
      append(result, 'No finalized campaign exists for this ID.');
      return;
    }
    const brief = document.createElement('div');
    brief.className = 'record';
    result.append(brief);
    append(brief, id, 'h3');
    for (const [label, value] of Object.entries({
      Brand: campaign.brand, Creator: campaign.creator, 'Bluesky identity': campaign.did,
      'UTC deadline': campaign.deadline, Disclosure: campaign.disclosure, 'Required message': campaign.message,
    })) append(brief, label + ' · ' + value);
    if (!submission) {
      append(brief, 'Awaiting creator submission.');
      return;
    }
    append(brief, 'Public post · ' + submission.uri);
    append(brief, 'Submitted · ' + submission.submitted_at);
    const link = document.createElement('a');
    link.href = 'https://bsky.app/profile/' + encodeURIComponent(campaign.did) + '/post/' + encodeURIComponent(submission.uri.split('/').at(-1));
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Open post on Bluesky ↗';
    brief.append(link);
    if (!submission.attempts.length) append(brief, 'Awaiting verification.');
    submission.attempts.forEach((attempt, i) => {
      const record = document.createElement('div');
      record.className = 'record';
      result.append(record);
      append(record, 'Review ' + (i + 1) + ' · ' + attempt.verdict, 'p', 'verdict');
      append(record, attempt.checked_at);
      append(record, attempt.reason);
      for (const [label, value] of Object.entries(attempt.checks)) {
        append(record, label.replaceAll('_', ' ') + ' · ' + String(value));
      }
      if (attempt.evidence) {
        append(record, 'Indexed · ' + attempt.evidence.indexed_at);
        append(record, 'Bluesky record CID · ' + attempt.evidence.cid);
        append(record, attempt.evidence.text, 'blockquote');
      }
    });
    const download = document.createElement('button');
    download.type = 'button';
    download.textContent = 'Export audit record';
    download.addEventListener('click', () => {
      const file = new Blob([JSON.stringify({ chain: chain.id, contract: contractAddress, id, campaign, submission }, null, 2)], {type:'application/json'});
      const link = document.createElement('a');
      link.href = URL.createObjectURL(file);
      link.download = id + '.json';
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    });
    result.append(download);
  } catch (error) {
    if (get('lookup-form').elements.campaign.value === id) result.textContent = error.shortMessage || error.message;
  }
}

function renderAccount(accounts) {
  address = accounts?.[0] || null;
  connect.textContent = address ? address.slice(0, 6) + '…' + address.slice(-4) : 'Connect wallet';
}

async function connectWallet() {
  if (!provider) throw Error('No browser wallet detected. Use the built-in account in GenLayer Studio to sign.');
  const chainId = '0x' + chain.id.toString(16);
  if (await provider.request({ method: 'eth_chainId' }) !== chainId) {
    try {
      await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId }] });
    } catch (error) {
      if (error.code !== 4902) throw error;
      await provider.request({ method: 'wallet_addEthereumChain', params: [{
        chainId, chainName: chain.name, nativeCurrency: chain.nativeCurrency, rpcUrls: chain.rpcUrls.default.http,
      }] });
      await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId }] });
    }
  }
  renderAccount(await provider.request({ method: 'eth_requestAccounts' }));
  if (!address) throw Error('The wallet did not provide an account.');
  return createClient({ chain, account: address, provider });
}

async function trackReceipt(hash, campaign, wait = false) {
  track.elements.hash.value = hash;
  try {
    localStorage.setItem('sponsorscope:last-transaction', JSON.stringify({ hash, campaign }));
  } catch { /* The visible hash remains available for manual tracking. */ }
  for (let poll = 0; poll < (wait ? 150 : 1); poll++) {
    let tx;
    try {
      tx = await reader.getTransaction({ hash });
    } catch (error) {
      if (!wait) throw error;
      show(hash + ' · Waiting for the network to return the receipt…');
      await new Promise(resolve => setTimeout(resolve, 3000));
      continue;
    }
    const phase = tx.statusName || tx.status || 'Unknown status';
    const execution = tx.txExecutionResultName || tx.consensus_data?.leader_receipt?.[0]?.execution_result ||
      tx.consensus_data?.leader_receipt?.execution_result;
    show(hash + ' · ' + phase + (execution ? ' · ' + execution : ''));
    if (String(phase).toUpperCase() === 'FINALIZED') {
      if (campaign) {
        get('lookup-form').elements.campaign.value = campaign;
        await readCampaign(campaign);
        get('lookup').scrollIntoView();
      }
      return;
    }
    if (!wait || /CANCEL|REJECT|FAIL|UNDETERMINED/.test(String(phase).toUpperCase())) return;
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  show(hash + ' · Still pending. Check the receipt again later.');
}

provider?.on?.('accountsChanged', renderAccount);
connect.addEventListener('click', async () => {
  setBusy(true);
  try { await connectWallet(); show('Studionet wallet connected.'); }
  catch (error) { showError(error); document.querySelector('#transactions').scrollIntoView(); }
  finally { setBusy(false); }
});
get('lookup-form').addEventListener('submit', event => {
  event.preventDefault();
  void readCampaign(event.currentTarget.elements.campaign.value);
});
track.addEventListener('submit', async event => {
  event.preventDefault();
  if (busy) return;
  setBusy(true);
  try { await trackReceipt(track.elements.hash.value, null); }
  catch (error) { showError(error); }
  finally { setBusy(false); }
});

const methods = {
  register: data => [data.campaign, data.creator, data.did, new Date(data.deadline).toISOString().replace('.000Z', 'Z'), data.disclosure, data.message],
  submit: data => [data.campaign, data.key],
  verify: data => [data.campaign],
};
for (const [method, args] of Object.entries(methods)) {
  get(method).addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);
    get('transactions').scrollIntoView();
    try {
      if (!contractAddress) throw Error('Set the Studionet contract address before signing.');
      show('Waiting for wallet signature…');
      const signer = await connectWallet();
      const hash = await signer.writeContract({ address: contractAddress, functionName: method, args: args(data), value: 0n });
      show(hash + ' · Submitted. Waiting for consensus…');
      await trackReceipt(hash, data.campaign, true);
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  });
}

try {
  const previous = JSON.parse(localStorage.getItem('sponsorscope:last-transaction'));
  if (previous?.hash) track.elements.hash.value = previous.hash;
} catch { /* The tracker also accepts manually pasted hashes. */ }
const initial = new URLSearchParams(location.search).get('campaign');
if (initial && /^[a-z0-9][a-z0-9-]{2,63}$/.test(initial)) {
  get('lookup-form').elements.campaign.value = initial;
  void readCampaign(initial);
}
