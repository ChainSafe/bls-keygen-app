import * as React from "react";
import * as bip39 from "bip39";
import {saveAs} from "file-saver";
import {withAlert} from "react-alert";
import worker from "workerize-loader!./worker.js";
import LoadingOverlay from "react-loading-overlay";
import BounceLoader from "react-spinners/BounceLoader";
import JSZip from 'jszip';

import {
  initBLS,
  generatePublicKey,
} from "@chainsafe/bls";

import {
  deriveMasterSK,
} from "@chainsafe/bls-hd-key";

import {
  deriveEth2ValidatorKeys, IEth2ValidatorKeys,
} from "@chainsafe/bls-keygen";

type Props = {
  alert: object;
};
type State = {
  newKeyStep: number;
  fromMnemonicStep: number;
  storeKeysStep: number;
  mnemonic: string | undefined;
  masterKey: Uint8Array;
  mnemonicInput: string;
  password: string | undefined;
  passwordConfirm: string | undefined;
  showOverlay: boolean;
  overlayText: string;
  validatorIndex: number | undefined;
  validatorKeys: IEth2ValidatorKeys;
  publicKey: Buffer;
  signingPath: string,
  withdrawalPath: string,
};

const blobify = (keystore: string): Blob => new Blob([JSON.stringify(keystore)], {type: "application/json"});

const toHex = (input: Uint8Array): string => {
  return "0x" + Buffer.from(input).toString('hex');
}

const workerInstance = worker();

class NewKey extends React.Component<Props, State> {
  initialSteps: object;

  constructor(props: object) {
    super(props);

    this.initialSteps = {
      newKeyStep: 0,
      fromMnemonicStep: 0,
      storeKeysStep: 0,
    };

    this.state = {
      ...this.initialSteps,
      mnemonicInput: "",
      password: undefined,
      passwordConfirm: undefined,
      showOverlay: false,
      overlayText: "",
      validatorIndex: 0,
      withdrawalPath: 'm/12381/3600/0/0',
      signingPath: 'm/12381/3600/0/0/0',
    };
  }

  async componentDidMount() {
    // initialize BLS
    await initBLS();
  }

  generateEntropy(): string {
    const mnemonic = bip39.generateMnemonic();
    this.setState({mnemonic});
    return mnemonic;
  }

  deriveValidatorKeys(validatorIndex: number): void {
    const {masterKey} = this.state;

    let validatorKeys;
    try {
      validatorKeys = deriveEth2ValidatorKeys(Buffer.from(masterKey), validatorIndex);
    }
    catch(error) {
      this.showError(error.message);
      return;
    }

    this.setState({
      validatorKeys,
      publicKey: generatePublicKey(validatorKeys.signing),
    });
  }

  generateKey(): void {
    const entropy: Buffer = Buffer.from(this.generateEntropy());
    const masterKey: Buffer = deriveMasterSK(entropy);

    this.setState({
      masterKey,
      newKeyStep: 1,
    });
  }

  mnemonicInputChange(event: { target: { value: string } }): void {
    this.setState({mnemonicInput: event.target.value});
  }

  newKeyNext(): void {
    this.setState({newKeyStep: this.state.newKeyStep + 1});
  }

  fromMnemonicNext(): void {
    this.setState({fromMnemonicStep: this.state.fromMnemonicStep + 1});
  }

  goBack(): void {
    if (this.state.storeKeysStep > 0) {
      this.setState({storeKeysStep: this.state.storeKeysStep - 1});
    } else if (this.state.newKeyStep > 0) {
      this.setState({newKeyStep: this.state.newKeyStep - 1});
    } else if (this.state.fromMnemonicStep > 0) {
      this.setState({fromMnemonicStep: this.state.fromMnemonicStep - 1});
    }
  }

  onChangeValidatorIndex(event: { target: { value: string; }; }) {
    let indexInput = event.target.value;
    const re = /^[0-9\b]+$/;

    // if value is not blank, then test the regex
    if (indexInput === '' || re.test(indexInput)) {
      this.setState({
        validatorIndex: indexInput,
        signingPath: indexInput ? `m/12381/3600/${indexInput}/0/0` : 'm/12381/3600/0/0/0',
        withdrawalPath: indexInput ? `m/12381/3600/${indexInput}/0` : 'm/12381/3600/0/0',
      });
      this.deriveValidatorKeys(indexInput.length > 0 ? parseInt(indexInput, 10) : 0);
    }
  }

  callValidateMnemonicWorker(): void {
    const {mnemonicInput} = this.state;

    this.setState({
      showOverlay: true,
      overlayText: "Validating mnemonic...",
    });

    workerInstance.validateMnemonic(mnemonicInput)
      .then((result: { masterKey: Uint8Array; mnemonic: string }) => {
        this.setState({
          ...this.initialSteps,
          newKeyStep: 1,
          showOverlay: false,
          masterKey: result.masterKey,
          mnemonic: result.mnemonic,
        });
      })
      .catch(function (error: { message: string }) {
        this.showError(error.message);
        this.setState({showOverlay: false});
      }.bind(this));
  }

  showError(errorMessage: string): void {
    this.props.alert.error(errorMessage);
  }

  renderWizard(): object {
    const {validatorIndex, password, passwordConfirm} = this.state;
    const backButton = <button className="button is-secondary" onClick={() => this.goBack()}>Back</button>;

    const passwordsMatch = password === passwordConfirm;

    if (this.state.storeKeysStep === 1) {
      return <>
        <div className="text-section">
          <div>
            <div className="keygen-title">
                Validator Index:
            </div>
            <input
              className="input"
              placeholder="Enter Validator Index"
              value={validatorIndex}
              onChange={(event) => this.onChangeValidatorIndex(event)}
              maxLength={11}
            />
            <br />
            <br />
            <div>
              <div className="keygen-title">
                Validator {validatorIndex || 0} Public Key
              </div>
              {toHex(this.state.publicKey)}
            </div>
            <div>
              <div className="keygen-title">
                  Paths:
              </div>
              <div><em>Signing: </em>{this.state.signingPath}</div>
              <div><em>Withdrawal: </em>{this.state.withdrawalPath}</div>
            </div>
            <br />
            <div className="keygen-title">
                Enter password for your keys:
            </div>
            <input
              className="input"
              placeholder="Enter password"
              type="password"
              onChange={(event) => this.setState({password: event.target.value})}
            />
          </div>
          <div>
            <div className="keygen-title">
                Confirm password:
            </div>
            <input
              className="input"
              placeholder="Confirm password"
              type="password"
              onChange={(event) => this.setState({passwordConfirm: event.target.value})}
            />
          </div>
        </div>
        <div className="button-section">
          {!passwordsMatch && <div>passwords do not match</div>}
          <button
            className="button is-primary"
            onClick={() => this.callStoreKeysWorker()}
            disabled={!password || !passwordConfirm || !passwordsMatch}>Download Keys
          </button>
          {backButton}
        </div>
      </>;
    } else if (this.state.newKeyStep === 1) {
      return <>
        <div>
          <div>
            <div className="keygen-title">
              Master Private Key:
            </div>
            {toHex(this.state.masterKey)}
          </div>
          <div>
            <div className="keygen-title">
              Mnemonic:
            </div>
            {this.state.mnemonic}
          </div>
        </div>
        <div className="button-section">
          <button className="button is-primary" onClick={() => this.generateKey()}>Generate New Master Key</button>
          <button className="button is-primary" onClick={() => this.showExportMasterKey()}>Export Master Key</button>
          <button className="button is-primary" onClick={() => this.showPasswordPrompt()}>Export Validator Keys</button>
          {backButton}
        </div>
      </>;
    } else if (this.state.fromMnemonicStep === 1) {
      return <>
        <div className="text-section">
          <div className="keygen-title">
            Enter the mnemonic
          </div>
          <input
            className="input"
            placeholder="Enter phrase"
            type="text"
            onChange={(event) => this.setState({mnemonicInput: event.target.value})}
          />
        </div>
        <div className="button-section">
          <button className="button is-primary" onClick={() => this.callValidateMnemonicWorker()}>Next</button>
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
        <button className="button is-primary" onClick={() => this.generateKey()}>Generate New Key</button>
        <br />
        <button className="button is-primary" onClick={() => this.fromMnemonicNext()}>Restore from Mnemonic</button>
        <br />
      </div>;
    }
  }

  showPasswordPrompt(): void {
    this.setState({storeKeysStep: 1});
    this.deriveValidatorKeys(0);
  }

  storeKeys(): void {
    const {password, validatorKeys, withdrawalPath, signingPath, publicKey} = this.state;
    const {withdrawal, signing} = validatorKeys;

    workerInstance.generateKeystore(withdrawal, password, withdrawalPath)
      .then((withdrawalKeystore: string) => {
        const withdrawalBlob = blobify(withdrawalKeystore);

        workerInstance.generateKeystore(signing, password, signingPath)
          .then((signingKeystore: string) => {
            const signingBlob = blobify(signingKeystore);

            this.setState({showOverlay: false});

            const zip = new JSZip();
            zip.file("withdrawal.json", withdrawalBlob);
            zip.file("signing.json", signingBlob);

            zip.generateAsync({type:"blob"})
            .then(function(content: string | Blob) {
                saveAs(content, `${toHex(publicKey)}.tar.gz`);
            });
          });
      })
      .catch(function (error: { message: string }) {
        this.showError(error.message);
        this.setState({showOverlay: false});
      }.bind(this));
  }

  callStoreKeysWorker(): void {
    this.setState({showOverlay: true, overlayText: "Generating keystores..."});
    this.storeKeys();
  }

  showExportMasterKey(): void {
    this.newKeyNext();
  }

  render (): object {
    const bounceLoader = <BounceLoader css="margin: auto;" />;

    return <span className="keygen-step">
      <LoadingOverlay
        active={this.state.showOverlay}
        spinner={bounceLoader}
        text={this.state.overlayText}
      >
      </LoadingOverlay>
      {this.renderWizard()}
    </span>;
  }
}

export default withAlert()(NewKey);
