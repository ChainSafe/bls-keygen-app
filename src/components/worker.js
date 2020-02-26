import { Keystore } from '@chainsafe/bls-keystore';
import * as bip39 from 'bip39';
import {
    deriveKeyFromMnemonic,
} from '@chainsafe/bls-keygen';

export function generateKeystore(key, password) {
    const keystore = Keystore.encrypt(Buffer.from(key), password, 'm/12381/60/0/0');

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

  return deriveKeyFromMnemonic(mnemonic);
}
