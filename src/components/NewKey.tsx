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
    this.state = {
      newKeyStep: 0,
      fromMnemonicStep: 0,
      fromMasterStep: 0,
    };
  }

  generateEntropy(): Uint8Array {
    const mnemonic = bip39.generateMnemonic();
    this.setState({ mnemonic });
    return mnemonic;
  }

  generateKey() {
    const entropy: Buffer = Buffer.from(this.generateEntropy());
    const masterKey: Buffer = deriveMasterSK(entropy);
    this.setState({
      masterKey,
      newKeyStep: 1,
    });
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

    fromMnemonicStep += 1;
  }

  newKeyNext() {
    this.setState({ newKeyStep: this.state.newKeyStep + 1 });
  }

  fromMnemonicNext() {
    this.setState({ fromMnemonicStep: this.state.fromMnemonicStep + 1 });
  }

  goBack() {
    if (this.state.newKeyStep > 0) {
      this.setState({ newKeyStep: this.state.newKeyStep - 1 });
    } else if (this.state.fromMnemonicStep > 0) {
      this.setState({ fromMnemonicStep: this.state.fromMnemonicStep - 1 });
    } else if (this.state.fromMasterStep > 0) {
      this.setState({ fromMasterStep: this.state.fromMasterStep - 1 });
    }
  }

  renderWizard() {
    const backButton = <button onClick={() => this.goBack()}>Back</button>;
    if (this.state.newKeyStep === 1) {
      return <>
        <button onClick={() => this.exportMasterKey()}>Export Master Key</button>
        <button onClick={() => this.exportValidatorKeys()}>Export Validator Keys</button>
        <div>
          Please write down this mnemonic:
          <div>{this.state.mnemonic}</div>
        </div>
        <br />
        <div>Master Key: {this.state.masterKey}</div>
        {backButton}
      </>;
    } else if (this.state.fromMnemonicStep === 1) {
      return <>
        Enter the mnemonic
        <input />
        <button onClick={() => this.validateMnemonic()}>Next</button>
        {backButton}
      </>;
    } else {
      return <>
        <button onClick={() => this.generateKey()}>Generate New Key</button>
        <button onClick={() => this.fromMnemonicNext()}>Restore from Mnemonic</button>
        <button onClick={() => this.placeholder()}>Restore from Master</button>
      </>;
    }
  }

  render () {
    return this.renderWizard();
  }
}
