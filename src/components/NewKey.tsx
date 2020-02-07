import * as React from 'react';
import * as bip39 from 'bip39';
import {Keystore} from "@chainsafe/bls-keystore";

import {
  deriveMasterSK,
  deriveChildSK,
  deriveChildSKMultiple,
  pathToIndices,
} from "@chainsafe/bls-hd-key";

import {
    generateRandomSecretKey,
    deriveKeyFromMnemonic,
    deriveKeyFromEntropy,
    deriveKeyFromMaster,
    deriveEth2ValidatorKeys,
} from "@chainsafe/bls-keygen";

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
    this.setState({ masterKey });
  }

  validateMnemonic(inputKey) {
    const isValid = bip39.validateMnemonic(inputKey);
    console.log('isValid: ', isValid);

    if (!isValid) {
      alert('not a valid mnemonic');
      return;
    }

    if (this.state.masterKey) {
      resultComparison = masterKey === deriveKeyFromMnemonic(inputKey);
    } else {
      resultComparison = deriveKeyFromMnemonic(inputKey);
    }
    console.log('resultComparison: ', resultComparison);
  }

  showRestoreFromMnemonic() {
    this.setState({ showRestoreFromMnemonic: true });
  }

  renderWizard() {
    if (this.state.mnemonic) {
      return <>
        <button onClick={() => this.exportMasterKey()}>Export Master Key</button>
        <button onClick={() => this.exportValidatorKeys()}>Export Validator Keys</button>
        <div>
          Please write down this mnemonic:
          <div>{this.state.mnemonic}</div>
        </div>
        <br />
        <div>Master Key: {this.state.masterKey}</div>
      </>;
    } else if (this.state.showRestoreFromMnemonic) {
      return <>
        Enter the mnemonic
        <input />
        <button onClick={() => this.validateMnemonic()}>Next</button>
      </>;
    } else {
      return <>
        <button onClick={() => this.generateKey()}>Generate New Key</button>
        <button onClick={() => this.showRestoreFromMnemonic()}>Restore from Mnemonic</button>
        <button onClick={() => this.placeholder()}>Restore from Master</button>
      </>;
    }
  }

  render () {
    return this.renderWizard();
  }
}
