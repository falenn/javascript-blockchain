const SHA256 = require('crypto-js/sha256');
const now = require('performance-now');

class Block {
  constructor(index, timestamp, data, previousHash = '') {
    this.index = index;
    this.timestamp = timestamp;
    this.data = data;
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
    this.difficulty = 5;
    //any errors
    this.tampered = [];
    this.unlinked = [];
    this.unmined = [];
  }

  createGenesisBlock() {
    return new Block(0,"01/01/2021", "Genesis block", "0");
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

  addBlock(newBlock) {
    console.log("Adding block: " + newBlock.index);
    var t0 = now();
    newBlock.previousHash = this.getLatestBlock().hash;
    //for proof-of-work 
    newBlock.mineBlock(this.difficulty);
    // newBlock.hash = newBlock.calculateHash();
    var t1 = now();
    const tz = (((t1 - t0)/1000).toFixed(3));
    console.log("Block[" + newBlock.index + "] created in " + tz + " seconds");
    this.chain.push(newBlock);
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
        console.log("Block has improper data: " + currentBlock.index);
        this.tampered.push(currentBlock.index);
        error++;
      }
      // if improper linking
      if(currentBlock.previousHash !== previousBlock.hash) {
        console.log("Block improperly linked: " + currentBlock.index);
        this.unlinked.push(currentBlock.index);
        error++;
      }
      //hash must be of certain difficulty
      if(!currentBlock.hash.startsWith(this.getDifficultyString())) {
        console.log("Block not mined: " + currentBlock.index);
        this.unmined.push(currentBlock.index);
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
batesCoin.addBlock(new Block(batesCoin.getLength(), "01/02/2021", {amount: 4}));
batesCoin.addBlock(new Block(batesCoin.getLength(), "01/03/2021", {amount: 5}));

console.log(JSON.stringify(batesCoin, null, 4));
console.log("valid: " + batesCoin.isChainValid());

// now tamper with the chain
batesCoin.chain[1].data = { amount: 10000};
console.log("valid: " + batesCoin.isChainValid());

//tamper with linking
batesCoin.chain[1].hash = batesCoin.chain[1].calculateHash();
console.log("valid: " + batesCoin.isChainValid());
// bc 2 should have different previousHash than bc 1 hash

console.log(JSON.stringify(batesCoin, null, 4));
