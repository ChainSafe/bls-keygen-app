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
  const masterKey = deriveMasterSK(entropy);
  return {
    masterKey,
    mnemonic,
  };
}

export function generateKeystore(key, password, path) {
    const keystore = Keystore.encrypt(Buffer.from(key), password, path);

    if (!keystore) {
      throw new Error('unable to encrypt keystore');
    }

    keystore.verifyPassword(password);
    return keystore.toJSON();
}

export function validateMnemonic(mnemonic) {
  const isValid = bip39.validateMnemonic(mnemonic);

  if (!isValid) {
    throw new Error('not a valid mnemonic');
  }

  const masterKey = deriveKeyFromMnemonic(mnemonic);

  return {
    masterKey,
    mnemonic,
  };
}
