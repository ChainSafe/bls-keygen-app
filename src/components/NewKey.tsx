import * as React from 'react';
import * as bip39 from 'bip39';
import { saveAs } from 'file-saver';
import { withAlert } from 'react-alert'
import worker from 'workerize-loader!./worker.js';
import LoadingOverlay from 'react-loading-overlay'
import BounceLoader from 'react-spinners/BounceLoader'

import {
  deriveMasterSK,
} from '@chainsafe/bls-hd-key';

import {
    deriveEth2ValidatorKeys,
} from '@chainsafe/bls-keygen';

type Props = {
  alert: any,
};
type State = {
  newKeyStep: number,
  fromMnemonicStep: number,
  storeKeysStep: number,
  mnemonic: string | undefined,
  masterKey: Buffer,
  mnemonicInput: string,
  password: string,
  passwordConfirm: string | undefined,
  keystore: any | undefined,
  showOverlay: boolean,
  overlayText: string,
};

const blobify = (keystore: string) => new Blob([JSON.stringify(keystore)], { type: 'application/json' });

const workerInstance = worker();

class NewKey extends React.Component<Props, State> {
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
      showOverlay: false,
      overlayText: ''
    };
  }

  generateEntropy(): string {
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

  mnemonicInputChange(event: any) {
    this.setState({ mnemonicInput: event.target.value });
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

  callValidateMnemonicWorker() {
    const { mnemonicInput } = this.state;

    this.setState({
      showOverlay: true,
      overlayText: 'Validating mnemonic...',
    });

    workerInstance.validateMnemonic(mnemonicInput)
      .then((result: { masterKey: any; mnemonic: any; }) => {
        this.setState({
          ...this.initialSteps,
          newKeyStep: 1,
          showOverlay: false,
          masterKey: result.masterKey,
          mnemonic: result.mnemonic,
        });
      })
      .catch(function (error: any) {
        this.showError(error.message);
        this.setState({ showOverlay: false });
      }.bind(this));
  }

  showError(errorMessage: string) {
    this.props.alert.error(errorMessage);
  }

  renderWizard() {
    const backButton = <button className='button is-secondary' onClick={() => this.goBack()}>Back</button>;

    const passwordsMatch = this.state.password === this.state.passwordConfirm;

    if (this.state.storeKeysStep === 1) {
      return <>
          <div className='text-section'>
            <div>
              <div className='keygen-title'>
                Enter password for your keys:
              </div>
              <input className='input' placeholder='Enter password' type='password' onChange={(event) => this.setState({ password: event.target.value })} />
            </div>
            <div>
              <div className='keygen-title'>
                Confirm password:
              </div>
              <input className='input' placeholder='Confirm password' type='password' onChange={(event) => this.setState({ passwordConfirm: event.target.value })} />
            </div>
          </div>
          <div className='button-section'>
            {!passwordsMatch && <div>passwords do not match</div>}
            <button className='button is-primary' onClick={() => this.callStoreKeysWorker()} disabled={!passwordsMatch}>Store Keys</button>
            {backButton}
          </div>
      </>
    } else if (this.state.newKeyStep === 1) {
      return <>
        <div className='text-section'>
          <div>
            <div className='keygen-title'>
              Master Key:
            </div>
              {this.state.masterKey}
          </div>
          <div>
            <div className='keygen-title'>
              Mnemonic:
            </div>
            {this.state.mnemonic}
          </div>
        </div>
        <div className='button-section'>
          <button className='button is-primary' onClick={() => this.showExportMasterKey()}>Export Master Key</button>
          <button className='button is-primary' onClick={() => this.showPasswordPrompt()}>Export Validator Keys</button>
          {backButton}
        </div>
      </>;
    } else if (this.state.fromMnemonicStep === 1) {
      return <>
        <div className='text-section'>
          <div className='keygen-title'>
            Enter the mnemonic
          </div>
          <input className='input' placeholder='Enter password' type='text' onChange={(event) => this.setState({ mnemonicInput: event.target.value })} />
        </div>
        <div className='button-section'>
          <button className='button is-primary' onClick={() => this.callValidateMnemonicWorker()}>Next</button>
          {backButton}
        </div>
      </>;
    } else if (this.state.newKeyStep === 2) {
      return <>
        <div className='text-section'>
          <div className='keygen-title'>
            Please write down this mnemonic:
          </div>
          <div>{this.state.mnemonic}</div>
        </div>
        <div className='button-section'>
          {backButton}
        </div>
      </>;
    } else {
      return <div className='button-section'>
        <button className='button is-primary' onClick={() => this.generateKey()}>Generate New Key</button>
        <br />
        <button className='button is-primary' onClick={() => this.fromMnemonicNext()}>Restore from Mnemonic</button>
        <br />
      </div>;
    }
  }

  showPasswordPrompt(): void {
    this.setState({ storeKeysStep: 1 });
  }

  storeKeys(): void {
    const validatorKeys = deriveEth2ValidatorKeys(Buffer.from(this.state.masterKey), 0);
    const { withdrawal, signing } = validatorKeys;
    const { password } = this.state;

    workerInstance.generateKeystore(withdrawal, password)
      .then((withdrawalKeystore: string) => {
        const withdrawalBlob = blobify(withdrawalKeystore);

        workerInstance.generateKeystore(signing, password)
          .then((signingKeystore: string) => {
            const signingBlob = blobify(signingKeystore);

            this.setState({ showOverlay: false });

            saveAs(withdrawalBlob, 'wblob.json');
            saveAs(signingBlob, 'sblob.json');
          });
      })
      .catch(function (error: any) {
        this.showError(error.message);
        this.setState({ showOverlay: false });
      }.bind(this));
  }

  callStoreKeysWorker() {
    this.setState({ showOverlay: true, overlayText: 'Generating keystores...' });
    this.storeKeys();
  }

  showExportMasterKey(): void {
    this.newKeyNext();
  }

  render () {
    const bounceLoader = <BounceLoader css='margin: auto;' />;

    return <span className='keygen-step'>
      <LoadingOverlay
        active={this.state.showOverlay}
        spinner={bounceLoader}
        text={this.state.overlayText}
      >
      </LoadingOverlay>
      {this.renderWizard()}
      </span>
  }
}

export default withAlert()(NewKey);
