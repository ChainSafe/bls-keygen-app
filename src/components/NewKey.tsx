import * as React from 'react';
import * as bip39 from 'bip39';

import {
  deriveMasterSK, deriveChildSK, deriveChildSKMultiple, pathToIndices,
} from "@chainsafe/bls-hd-key";

export default class NewKey extends React.Component {
  constructor(props: any) {
    super(props);
    this.state = {}
  }

  generateEntropy(): Uint8Array {
    const mnemonic = bip39.generateMnemonic();
    this.setState({ mnemonic });
    return mnemonic;
  }

  generateKey() {
    const entropy: Buffer = Buffer.from(this.generateEntropy());
    const masterKey: Buffer = deriveMasterSK(entropy);
    this.setState({ masterKey })
  }

  render () {
    return (
      <>
        <button onClick={() => this.generateKey()}>Generate New Key</button>
        <button onClick={() => this.placeholder()}>Restore from Mnemonic</button>
        <button onClick={() => this.placeholder()}>Restore from Master</button>
        <div>{this.state.mnemonic}</div>
        <div>{this.state.masterKey}</div>
      </>
    );
  }
}
