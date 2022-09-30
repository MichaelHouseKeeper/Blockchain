const sha256 = require("crypto-js/sha256");
const ecLib = require('elliptic').ec;
const ec = new ecLib('secp256k1') 



//分发部分，让每次挖矿可以从单块的奖励池中，“转出”积分给用户
class Transaction {
  constructor(from, to, amount, datatext, timestampin) {
    this.from = from;
    this.to = to;
    this.amount = amount;
    this.datatext = datatext;
    this.timestampin = timestampin;

  }



  //这是要保存的数据的最核心部分，任何数据单独拿出来验算，这个值都不变，所以能保持链的1通畅
  computeHash(){
    return sha256(
        this.from +
        this.to +
        this.amount +
        this.datatext +
        this.timestampin
    ).toString();
  }


}



class Block {
  constructor(transactions, previousHash, timestamp) {
    // data 是 string
    // data -> transaction <-> array of objects
    this.transactions = transactions;
    this.previousHash = previousHash;

    if (timestamp !== 1663316176000) { 
      this.timestamp = this.transactions[0].timestampin;      
    }else {
      this.timestamp = 1663316176000;
    }

    this.nonce = 1;
    this.hash = this.computeHash();
  }

  computeHash() {
    // data 需要 stringify
    // JSON.stringify
    return sha256(
      JSON.stringify(this.transactions) +
        this.previousHash +
        this.nonce
    ).toString();
  }



  getAnswer(difficulty) {
    //开头前n位为0的hash
    let answer = "";
    for (let i = 0; i < difficulty; i++) {
      answer += "0";
    }
    return answer;
  }
  
  
  //计算复合区块链难度要求的hash
  mine(difficulty) {
    while (true) {
      this.hash = this.computeHash();
      if (this.hash.substring(0, difficulty) !== this.getAnswer(difficulty)) {
        this.nonce++;
        this.hash = this.computeHash();
      } else {
        break;
      }
    }
    console.log("挖矿结束", this.hash);
  }

}



// 区块 的 链
// 生成创世区块
class Chain {
  constructor(difficulty) {
    this.chain = [this.bigBang()];
    this.transactionPool = [];
    this.minerReward = 36500; // !!!初始配置365天 100年为区块的积分池
    this.difficulty = difficulty;
  }

  setDifficulty(difficulty) {
    this.difficulty = difficulty
  }


  bigBang() {
    const genesisBlock = new Block("生成创世区块", "", 1663316176000);// !!!初始配置，生成创世区块时间写死//2022-09-16 16:16:16 毫秒时间戳
    return genesisBlock;
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }



  // 添加transaction 到 transactionPool里
  addTransaction(transaction) {
    this.transactionPool.push(transaction);
  }


  // 添加区块到区块链上
  addBlockToChain(newBlock) {
    // data
    // 找到最近一个block的hash
    // 这个hash就是新区块的previousHash
    newBlock.previousHash = this.getLatestBlock().hash;
    newBlock.mine(this.difficulty);
    // 这个hash 需要满足一个区块链设置的条件
    this.chain.push(newBlock);
  }
 
     // 发放“挖矿”的奖励
  mineTransactionPool(minerRewardAddress) {
        
    const minerRewardTransaction = new Transaction(
      this.from = "米迦勒学院",
      this.to = minerRewardAddress,
      this.amount = this.minerReward,
      this.datatext = "区块积分源",// !!!初始配置
      this.timestampin =  "等于区块创建时间戳"// !!!初始配置
    );
    this.transactionPool.push(minerRewardTransaction);


    // “挖矿”是月评的记录，“转出”积分给用户是月评的结果行为
    const newBlock = new Block(
      this.transactionPool,
      this.getLatestBlock().hash
    );
    newBlock.mine(this.difficulty);

    // 添加区块到区块链
    // 清空 transaction Pool
    this.chain.push(newBlock);
    this.transactionPool = [];
    
  }


  //验证这个当前的区块链是否合法
  //当前的数据有没有被篡改
  //我们要验证区块的previousHash是否等于previous区块的hash
  // validate all the transactions
  validateChain() {
    if (this.chain.length === 1) {
      if (this.chain[0].hash !== this.chain[0].computeHash()) {
        return false;
      }
      return true;
    }
    // this.chain[1] 是第二个区块
    // 我们从第二个区块开始 验证
    // 验证到最后一个区块 this.chain.length -1
    for (let i = 1; i <= this.chain.length - 1; i++) {
      const blockToValidate = this.chain[i];
      // block的transactions均valid
      if (!blockToValidate.validateTransactions()){
        console.log("异常转出")
        return false
      }
      //当前的数据有没有被篡改
      if (blockToValidate.hash !== blockToValidate.computeHash()) {
        console.log("数据篡改");
        return false;
      }
      //我们要验证区块的previousHash是否等于previous区块的hash
      const previousBlock = this.chain[i - 1];
      if (blockToValidate.previousHash !== previousBlock.hash) {
        console.log("前后区块链接断裂");
        return false;
      }
    }
    return true;
  }
}

module.exports = { Chain, Transaction, Block }