import * as React from 'react';
import * as bip39 from 'bip39';
import { saveAs } from 'file-saver';

import {
  deriveMasterSK,
  // deriveChildSK,
  // deriveChildSKMultiple,
  // pathToIndices,
} from '@chainsafe/bls-hd-key';

import {
    // generateRandomSecretKey,
    deriveKeyFromMnemonic,
    deriveEth2ValidatorKeys,
} from '@chainsafe/bls-keygen';

import { Keystore } from '@chainsafe/bls-keystore';

type Props = {};
type State = {
  newKeyStep: number,
  fromMnemonicStep: number,
  storeKeysStep: number,
  mnemonic: string | undefined,
  masterKey: string,
  mnemonicInput: string,
  password: string,
  passwordConfirm: string | undefined,
  keystore: any | undefined,
};

export default class NewKey extends React.Component<Props, State> {
  initialSteps: any;

  constructor(props: any) {
    super(props);

    this.initialSteps = {
      newKeyStep: 0,
      fromMnemonicStep: 0,
      storeKeysStep: 0,
    };

    this.state = {
      ...this.initialSteps,
      mnemonicInput: '',
      masterKey: undefined,
      password: undefined,
      passwordConfirm: undefined,
      keystore: undefined,
    };
  }

  generateEntropy(): string {
    const mnemonic = bip39.generateMnemonic();
    this.setState({ mnemonic });
    return mnemonic;
  }

  generateKey() {
    const entropy: Buffer = Buffer.from(this.generateEntropy());
    console.log('mnemonic: ', entropy);
    const masterKey: Buffer = deriveMasterSK(entropy);
    this.setState({
      masterKey,
      newKeyStep: 1,
    });
  }

  mnemonicInputChange(event: any) {
    this.setState({ mnemonicInput: event.target.value });
  }

  validateMnemonic() {
    const { mnemonicInput, masterKey } = this.state
    const isValid = bip39.validateMnemonic(mnemonicInput);

    if (!isValid) {
      alert('not a valid mnemonic');
      return;
    }

    const newMasterKey = deriveKeyFromMnemonic(mnemonicInput);

    this.setState({
      ...this.initialSteps,
      masterKey: newMasterKey,
    });

    this.setState({ newKeyStep: 1 });
  }

  newKeyNext() {
    this.setState({ newKeyStep: this.state.newKeyStep + 1 });
  }

  fromMnemonicNext() {
    this.setState({ fromMnemonicStep: this.state.fromMnemonicStep + 1 });
  }

  goBack() {
    if (this.state.storeKeysStep > 0) {
      this.setState({ storeKeysStep: this.state.storeKeysStep - 1 });
    } else if (this.state.newKeyStep > 0) {
      this.setState({ newKeyStep: this.state.newKeyStep - 1 });
    } else if (this.state.fromMnemonicStep > 0) {
      this.setState({ fromMnemonicStep: this.state.fromMnemonicStep - 1 });
    }
  }

  renderWizard() {
    const backButton = <button onClick={() => this.goBack()}>Back</button>;

    if (this.state.storeKeysStep === 1) {
      return <>
          <div className="text-section">
            <div>
              <div className="keygen-title">
                Enter password for your keys:
              </div>
              <input type="password" onChange={(event) => this.setState({ password: event.target.value })} />
            </div>
            <div>
              <div className="keygen-title">
                Confirm password:
              </div>
              <input type="password" onChange={(event) => this.setState({ passwordConfirm: event.target.value })} />
            </div>
          </div>
          <div className="button-section">
            {this.state.password !== this.state.passwordConfirm && <div>passwords do not match</div>}
            <button onClick={() => this.storeKeys()}>Store Keys</button>
            {backButton}
          </div>
      </>
    } else if (this.state.newKeyStep === 1) {
      return <>
        <div className="text-section">
          <div>
            <div className="keygen-title">
              Master Key:
            </div>
            0x{this.state.masterKey}
          </div>
          <div>
            <div className="keygen-title">
              Mnemonic:
            </div>
            {this.state.mnemonic}
          </div>
        </div>
        <div className="button-section">
          <button onClick={() => this.showExportMasterKey()}>Export Master Key</button>
          <button onClick={() => this.showPasswordPrompt()}>Export Validator Keys</button>
          {backButton}
        </div>
      </>;
    } else if (this.state.fromMnemonicStep === 1) {
      return <>
        <div className="text-section">
          <div className="keygen-title">
            Enter the mnemonic
          </div>
          <input onChange={(event) => this.setState({ mnemonicInput: event.target.value })} />
        </div>
        <div className="button-section">
          <button onClick={() => this.validateMnemonic()}>Next</button>
          {backButton}
        </div>
      </>;
    } else if (this.state.newKeyStep === 2) {
      return <>
        <div className="text-section">
          <div className="keygen-title">
            Please write down this mnemonic:
          </div>
          <div>{this.state.mnemonic}</div>
        </div>
        <div className="button-section">
          {backButton}
        </div>
      </>;
    } else {
      return <div className="button-section">
        <button onClick={() => this.generateKey()}>Generate New Key</button>
        <button onClick={() => this.fromMnemonicNext()}>Restore from Mnemonic</button>
      </div>;
    }
  }

  showPasswordPrompt(): void {
    this.setState({ storeKeysStep: 1 });
  }

  generateKeystore(key: Buffer): any {
    const { password } = this.state;
    const keystore = Keystore.encrypt(key, password, "m/12381/60/0/0");

    keystore.verifyPassword(password); // true | false

    // const decryptedPrivateKey: Buffer = keystore.decrypt(password);

    return keystore.toJSON(); // string
  }

  storeKeys(): void {
    const validatorKeys = deriveEth2ValidatorKeys(this.state.masterKey, 0);
    const { withdrawal, signing } = validatorKeys;

    const withdrawalKeystore = this.generateKeystore(withdrawal);
    const signingKeystore = this.generateKeystore(signing);

    var withdrawalBlob = new Blob([JSON.stringify(withdrawalKeystore)], { type: "application/json" });
    var signingBlob = new Blob([JSON.stringify(signingKeystore)], { type: "application/json" });
    saveAs(withdrawalBlob, 'wblob.json');
    saveAs(signingBlob, 'sblob.json');
  }

  showExportMasterKey(): void {
    this.newKeyNext();
  }

  render () {
    return <span class="keygen-step">
      {this.renderWizard()}
      </span>
  }
}
