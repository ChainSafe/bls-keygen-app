import { Keystore } from "@chainsafe/bls-keystore";
import { init, SecretKey } from "@chainsafe/bls";
import {expose} from "threads/worker";
import * as bip39 from 'bip39';
import {
  deriveMasterSK,
} from "@chainsafe/bls-hd-key";
import { deriveKeyFromMnemonic } from "@chainsafe/bls-keygen";

const worker = {
  async generateKeystore(key: Buffer, password: string, path: string) {
    await init("herumi");
  
    const publicKey = SecretKey.fromBytes(key).toPublicKey().toBytes();
    const keystore = await Keystore.create(password, Buffer.from(key), publicKey, path);
  
    if (!keystore) {
      throw new Error('unable to encrypt keystore');
    }
  
    await keystore.verifyPassword(password);
    return JSON.stringify(keystore.toObject(), null, 2);
  },
  generateMasterSK() {
    const mnemonic = bip39.generateMnemonic();
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const entropy = Buffer.from(seed);
    const masterSK = deriveMasterSK(entropy);
    return {
      masterSK,
      mnemonic,
    };
  },
  validateMnemonic(mnemonic: string) {
    const isValid = bip39.validateMnemonic(mnemonic);
  
    if (!isValid) {
      throw new Error('not a valid mnemonic');
    }
  
    const masterSK = deriveKeyFromMnemonic(mnemonic);
  
    return {
      masterSK,
      mnemonic,
    };
  }
}

export type KeygenWorkerThread = typeof worker;

expose(worker)