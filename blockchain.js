/**
 * refactored to include signing
 */
const SHA256 = require('crypto-js/sha256');
const now = require('performance-now');
const EC = require('elliptic').ec;
const ec = new EC('ed25519');
const HashMap = require("hashmap");
const fs = require('file-system');

class Transaction {
  constructor(fromAddress, toAddress, amount) {
    this.fromAddress = fromAddress;
    this.toAddress = toAddress;
    this.amount = amount;
  }
  
  calculateHash() {
    return SHA256(this.fromAddress + this.toAddres + this.amount).toString();
  }

  signTransaction(signingKey) {
    if(signingKey.getPublic('hex') !== this.fromAddress) {
      throw new Error('You cannot sign transactions for other wallets!');
    }
    const hashTx = this.calculateHash();
    const sig = signingKey.sign(hashTx, 'base64');
    this.signature = sig.toDER('hex');
  }
  
  isValid() {
    if(this.fromAddress === null) return true;
    if(!this.signature || this.signature.length === 0) {
      throw new Error('No signature in this transaction');
    }
    const publicKey = ec.keyFromPublic(this.fromAddress, 'hex');
    return publicKey.verify(this.calculateHash(), this.signature);
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
 
  /* verify all transactions are signed */
  hasValidTransactions() {
    for(const tx of this.transactions) {
      if(!tx.isValid()) {
        return false;
      }
    }
    return true;
  }
}

class Blockchain {
  constructor(privateKeyPath) {
    this.privateKey = "";
    this.publicKey = "";
    //this.chain = [this.createGenesisBlock()];
    this.chain = [];
    //proof-of-work
    this.difficulty = 4;
    this.pendingTransactions = [];
    this.miningReward = 100;
    this.transPerBlock = 4;
    this.tampered = [];
    this.unlinked = [];
    this.unmined = [];
    this.txsign = [];
   
    /** unique list of addresses seen and their current wallet balance*/
    this.cache = new HashMap();

    // setup
    this.loadKeys(privateKeyPath);
    this.createGenesisBlock();
  }

  /* load keys for the SYSTEM signing capability */
  loadKeys(privateKeyPath) {
    try {
      console.log("Loading keys from: " + privateKeyPath);
      const data = fs.readFileSync(privateKeyPath, 'utf8'); 
      this.privateKey = ec.keyFromPrivate(data);
      this.publicKey = this.privateKey.getPublic('hex');
      console.log("BlockChain privateKey: " + this.privateKey);
      console.log("BlockChain publicKey: " + this.publicKey);
    } catch (err) { 
      console.log("Unable to load keys: " + err);
      process.exit();
    } 
  }
  
  createGenesisBlock() {
    console.log("Creating genesis block");
    let tx = new Transaction(this.publicKey, this.publicKey, 0);
    tx.signTransaction(this.privateKey);
    this.addTransaction(tx);
    this.minePendingTransactions(this.publicKey);
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

  getAddresses() {
    return this.cache.keys();
  }

 /* in bitcoin, miners don't recieve all transactions, instead they choose the ones to 
 * work on.  Only so many transactions fit in a block as a block cannot exceed 1 MB.
 */
  minePendingTransactions(miningRewardAddress) {
    let block = new Block(Date.now(), this.getTransactionsPerBlock());
    block.mineBlock(this.difficulty);
    console.log("Block mined!");
    this.chain.push(block);
    //add new transaction containing the mining reward
    console.log("Adding reward of [" + this.miningReward + "] to " + miningRewardAddress);
    const tx = new Transaction(this.publicKey, miningRewardAddress, this.miningReward);
    tx.signTransaction(this.privateKey);
    this.addTransaction(tx);
  }

  //clear existing transactions
  //clearTransactions() {
  //  this.pendingTransactions.
  //}
  
  getTransactionsPerBlock() {
    if(this.pendingTransactions.length >= this.transPerBlock) {
      return this.pendingTransactions.splice(0,this.transPerBlock);
    } else {
      return this.pendingTransactions.splice(0,this.pendingTransactions.length);
    }
  }
 
  //Add a transaction to the array
  addTransaction(transaction) {
    if(!transaction.fromAddress || !transaction.toAddress) {
      throw new Error('Transaction must include a from and to address' + 
        JSON.stringify(transaction));
    }
    if(!transaction.isValid()) {
      throw new Error('Cannot add an invalid transaction to block: ' + 
        JSON.stringify(transaction));
    }
    this.pendingTransactions.push(transaction);
    this.updateCache(transaction);
  }
  
  // A cache of addresses and thier running wallet values, computed upon insert
  updateCache(transaction) {
    var cf = this.cache.get(transaction.fromAddress);
    if ( typeof cf === 'undefined') {
      cf = 0;
    }
    this.cache.set(transaction.fromAddress, cf + (transaction.amount*-1));
    var ct = this.cache.get(transaction.toAddress);
    if ( typeof ct === 'undefined') {
      ct = 0;
    }
    this.cache.set(transaction.toAddress, ct + (transaction.amount));
  }

  //return the ammount paid for block mining
  getMiningRewardsPaid() {
    return this.getQuickBalance(this.publicKey)*-1;
  }
 
  getQuickBalance(address) {    
    return this.cache.get(address);
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

      if(!currentBlock.hasValidTransactions()) {
        console.log("Block[" + i + "]  has unsigned or improperly signed transactions!");
        this.txsign.push(i);
        error++;
      }
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

/* export the classes - the Block class is 'private' scope*/
module.exports.Blockchain = Blockchain;
module.exports.Transaction = Transaction;
