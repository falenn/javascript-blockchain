const EC = require('elliptic').ec;
const fs = require('file-system');
const ec = new EC('ed25519');

// commandline parse --dir <directory> for keys
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const argv = yargs(hideBin(process.argv)).argv

var keydir = "keys/mykey";
if(!argv.dir === 'undefined') {
  keydir = "keys/" + argv.dir;
} 
  

const key = ec.genKeyPair();
const publicKey = key.getPublic('hex');
const privateKey = key.getPrivate('hex');



console.log();
console.log('Private key:', privateKey);
console.log();
console.log('Public key:', publicKey);


fs.writeFile(keydir + "/public.ec", publicKey, function(err) {
    if(err) {
        return console.log(err);
    }
    console.log("Public key saved: " + keydir + "/public.ec");
});
 

fs.writeFile(keydir + "/private.ec", privateKey, function(err) {
    if(err) {
        return console.log(err);
    }
    console.log("Private Key saved: " + keydir + "/private.ec");
}); 

