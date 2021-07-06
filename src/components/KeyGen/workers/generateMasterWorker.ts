import * as bip39 from 'bip39';
import {
  deriveMasterSK,
} from "@chainsafe/bls-hd-key";

export function generateMasterSK() {
  const mnemonic = bip39.generateMnemonic();
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const entropy = Buffer.from(seed);
  const masterSK = deriveMasterSK(entropy);
  return {
    masterSK,
    mnemonic,
  };
}

self.onmessage = () => {
  const {masterSK, mnemonic} = generateMasterSK();
  self.postMessage({masterSK, mnemonic});
};