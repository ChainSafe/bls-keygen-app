import * as bip39 from 'bip39';
import {
  deriveKeyFromMnemonic,
} from '@chainsafe/bls-keygen';

export function validateMnemonic(mnemonic: string) {
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

self.onmessage = ({data: phrase}) => {
  const {masterSK, mnemonic} = validateMnemonic(phrase);
  self.postMessage({masterSK, mnemonic});
}
