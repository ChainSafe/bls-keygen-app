import { Keystore } from '@chainsafe/bls-keystore';
import * as bip39 from 'bip39';
import {
  deriveMasterSK,
} from "@chainsafe/bls-hd-key";
import {
    deriveKeyFromMnemonic,
} from '@chainsafe/bls-keygen';

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

export function generateKeystore(key, password, path) {
    const keystore = Keystore.encrypt(Buffer.from(key), password, path);

    if (!keystore) {
      throw new Error('unable to encrypt keystore');
    }

    keystore.verifyPassword(password);
    return JSON.stringify(keystore.toObject(), null, 2);
}

export function validateMnemonic(mnemonic) {
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
