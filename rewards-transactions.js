const SHA256 = require('crypto-js/sha256');
const now = require('performance-now');

class Transaction {
  constructor(fromAddress, toAddress, amount) {
    this.fromAddress = fromAddress;
    this.toAddress = toAddress;
    this.amount = amount;
  }
}

class Block {
  constructor(timestamp, transactions, previousHash = '') {
    this.timestamp = timestamp;
    this.transactions = transactions;
    this.previousHash = previousHash;
    this.hash = this.calculateHash();
    //added for alteration of payload to permit mining, differences in payload when searching for 0s
    this.nonce = 0;
  }

  // Calculate using all the data in this object
  calculateHash() {
    return SHA256(
      this.index + 
      this.previousHash + 
      this.timestamp +
      JSON.stringify(this.data) + 
      this.nonce).toString(); 
  }

  mineBlock(difficulty) {
    while(this.hash.substring(0, difficulty) !== Array(difficulty +1).join("0")) {
      this.nonce++;
      this.hash = this.calculateHash();
    }
  }
}

class BlockChain {
  constructor() {
    this.chain = [this.createGenesisBlock()];
    //proof-of-work
    this.difficulty = 4;
    this.pendingTransactions = [];
    this.miningReward = 100;

    this.tampered = [];
    this.unlinked = [];
    this.unmined = [];
  }

  createGenesisBlock() {
    let tx = new Transaction(null, null, 0);
    let txs = [];
    txs.push(tx);
    return new Block("01/01/2021", txs, null); 
  } 

  getDifficultyString() {
    var ds = ""; 
    for(var i = 0; i < this.difficulty; i++) {
      ds = ds + "0";
    }
    console.log("Difficulty begins-with string: " + ds);
    return ds;
  }

  getLength() {
    return this.chain.length;
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

 /* in bitcoin, miners don't recieve all transactions, instead they choose the ones to 
 * work on.  Only so many transactions fit in a block as a block cannot exceed 1 MB.
 */
  minePendingTransactions(miningRewardAddress) {
    let block = new Block(Date.now(), this.pendingTransactions);
    block.mineBlock(this.difficulty);
    console.log("Block mined!");
    this.chain.push(block);
    this.pendingTransactions = [
      new Transaction(null, miningRewardAddress, this.miningReward)
    ];
  }

  //Add a transaction to the array
  createTransaction(transaction) {
    this.pendingTransactions.push(transaction);
  }

  getBalance(address) {
    let balance = 0;
    for (const block of this.chain) {
      for (const trans of block.transactions) {
        if(trans.fromAddress === address) {
          balance -= trans.amount;
          console.log("Transaction: " + JSON.stringify(trans));
        }
        if(trans.toAddress === address) {
          balance += trans.amount;
          console.log("Transaction: " + JSON.stringify(trans));
        }
      }
    }
    return balance;
  }
/*
 * validate the blockchain.  skip block = 0 - genesis block
 */
  isChainValid() {
    for(let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i-1];
      // if changed data
      var error = 0;
      if(currentBlock.hash !== currentBlock.calculateHash()) {
        console.log("Block has improper data[" + i + "]");
        this.tampered.push(i);
        error++;
      }
      // if improper linking
      if(currentBlock.previousHash !== previousBlock.hash) {
        console.log("Block improperly linked[" + i +"]");
        this.unlinked.push(i);
        error++;
      }
      //hash must be of certain difficulty
      if(!currentBlock.hash.startsWith(this.getDifficultyString())) {
        console.log("Block not mined[" + i + "]");
        this.unmined.push(i);
        error++;
      }
    }
    if(error > 0) {
      return false;
    } else {
      return true;
    }
  } 
}

let batesCoin = new BlockChain();

batesCoin.createTransaction(new Transaction('address1', 'address2', 5));
batesCoin.createTransaction(new Transaction('address3', 'address2', 3));

console.log("Start miner...");
batesCoin.minePendingTransactions("bates-miner");

console.log("Balance of bate-miners: " + batesCoin.getBalance("bates-miner"));
//balance is 0!  Reward for mining is added to block for next transactions

batesCoin.createTransaction(new Transaction('address4','address2',2));

console.log("Mining again...");
batesCoin.minePendingTransactions("bates-miner");

console.log("Balance of bates-miner: " + batesCoin.getBalance("bates-miner"));
console.log(JSON.stringify(batesCoin.chain));

for(var i = 0; i < 5; i++) {
  console.log("Balance address[" + i + "]: " + batesCoin.getBalance("address" + i));
}
