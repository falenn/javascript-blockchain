/**
 * test example showing signing and the now-refactored blockchain code moved to
 * blockchain.js
 */
const EC = require('elliptic').ec;
const ec = new EC('ed25519');
const {Blockchain,Transaction} = require("./blockchain");
var fs = require('file-system');


/**
 * load private / public keys
 */

  fs.readFile('keys/private.ec', 'utf8', (err, data) => {
  if (err) {
    throw new Error("Unable to load private key: "  + err);
  }
  console.log("privateKey: " + data);
  const myKey = ec.keyFromPrivate(data);
  const myWalletAddress = myKey.getPublic('hex');


let batesCoin = new Blockchain('keys/system/private.ec');

/* create a transaction using my public key, sign with my private key.
 * toAddress should be someone else's public key, a.k.a their wallet address
 */
const tx1 = new Transaction(myWalletAddress, 'other public key', 10);
tx1.signTransaction(myKey);
batesCoin.addTransaction(tx1);

console.log("Start miner...");
batesCoin.minePendingTransactions(myWalletAddress);

console.log("Balance of bate-miners: " + batesCoin.getBalance(myWalletAddress));
//balance is 0!  Reward for mining is added to block for next transactions

const tx2 = new Transaction(myWalletAddress, 'other public key', 5);
tx2.signTransaction(myKey);
batesCoin.addTransaction(tx2);

console.log("Mining again...");
batesCoin.minePendingTransactions(myWalletAddress);

console.log("Balance of bates-miner: " + batesCoin.getBalance(myWalletAddress));
console.log(JSON.stringify(batesCoin.chain));

console.log("--- balances ---");
for(const address of batesCoin.getAddresses()) {
  console.log();
  console.log("Quick Balance [" + address + "] " + batesCoin.getQuickBalance(address));
  console.log("Balance [" + address + "]: " + batesCoin.getBalance(address));
}

console.log("--- quick balances ---");
for(const address of batesCoin.getAddresses()) {
  console.log("[" + address + "]: " + batesCoin.getQuickBalance(address)); 
}

console.log("Mining rewards paid: " + batesCoin.getMiningRewardsPaid());

})
