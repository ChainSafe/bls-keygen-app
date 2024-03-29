import * as React from "react";
import {saveAs} from "file-saver";
import {AlertManager, withAlert} from "react-alert";
// @ts-ignore
import worker from "workerize-loader!./worker.ts";
import LoadingOverlay from "react-loading-overlay";
import BounceLoader from "react-spinners/BounceLoader";
import JSZip from "jszip";

import {
  initBLS,
  generatePublicKey,
} from "@chainsafe/bls";

import {
  deriveEth2ValidatorKeys, IEth2ValidatorKeys,
} from "@chainsafe/bls-keygen";

type Props = {
  alert: AlertManager;
};

type State = {
  mnemonic?: string | undefined;
  masterPK?: Uint8Array;
  masterSK?: Uint8Array;
  mnemonicInput: string;
  password?: string;
  passwordConfirm?: string;
  showOverlay: boolean;
  overlayText: string;
  validatorIndex: number | undefined;
  validatorKeys?: IEth2ValidatorKeys;
  validatorPublicKey?: Buffer;
  signingPath: string;
  withdrawalPath: string;
  step: number;
  prevStep: number;
};

const blobify = (keystore: string): Blob => new Blob([keystore], {type: "application/json"});

const toHex = (input: Uint8Array): string => {
  return input && "0x" + Buffer.from(input).toString("hex");
};

const workerInstance = worker();

interface ICopyButtonProps {
  onClick: ((event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void);
}

const CopyButton: React.FC<ICopyButtonProps> =
  ({onClick}) =>
    <span>
      <button
        className="copy-button"
        onClick={onClick}
      >
        <span className="fa-copy" />
      </button>
    </span>;

const BackButton: React.FC<ICopyButtonProps> = ({onClick}) => (
  <button
    className="button is-secondary"
    onClick={onClick}
  >
    Back
  </button>
);

class NewKey extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      mnemonicInput: "",
      showOverlay: false,
      overlayText: "",
      validatorIndex: 0,
      withdrawalPath: "m/12381/3600/0/0",
      signingPath: "m/12381/3600/0/0/0",
      step: 1,
      prevStep: 1,
    };
  }

  async componentDidMount(): Promise<void> {
    // initialize BLS
    await initBLS();
  }

  deriveValidatorKeys(validatorIndex: number, masterSK: Uint8Array): void {
    let validatorKeys;
    try {
      validatorKeys = deriveEth2ValidatorKeys(Buffer.from(masterSK), validatorIndex);
    }
    catch(error) {
      this.showError(error.message);
      return;
    }

    this.setState({
      validatorKeys,
      validatorPublicKey: generatePublicKey(validatorKeys.signing),
    });
  }

  handleError(error: { message: string }): void {
    this.showError(error.message);
    this.setState({showOverlay: false});
  }

  generateMasterKey(): void {
    this.setState({
      showOverlay: true,
      overlayText: "Generating Master Key...",
    });

    workerInstance.generateMasterSK()
      .then((result: { masterSK: Uint8Array; mnemonic: string }) => this.updateMasterKey(result))
      .then(() => this.updateStep(2))
      .catch((error: { message: string }) => this.handleError(error));
  }

  updateStep(newStep: number): void {
    this.setState((prevState) => ({step: newStep, prevStep: prevState.step}));
  }

  mnemonicInputChange(event: { target: { value: string } }): void {
    this.setState({mnemonicInput: event.target.value});
  }

  onChangeValidatorIndex(event: { target: { value: string } }): void {
    const indexInput = event.target.value;
    const re = /^[0-9\b]+$/;

    // if value is not blank, then test the regex
    if (indexInput === "" || re.test(indexInput)) {
      const validatorIndex = indexInput.length > 0 ? parseInt(indexInput, 10) : 0;
      this.setState({
        validatorIndex,
        signingPath: indexInput ? `m/12381/3600/${indexInput}/0/0` : "m/12381/3600/0/0/0",
        withdrawalPath: indexInput ? `m/12381/3600/${indexInput}/0` : "m/12381/3600/0/0",
      });
      if (!this.state.masterSK) {
        throw new Error("Master key not found.");
      }
      this.deriveValidatorKeys(validatorIndex, this.state.masterSK);
    }
  }

  restoreFromMnemonic(): void {
    const {mnemonicInput} = this.state;
    const trimmed = this.trimMnemonic(mnemonicInput);

    this.setState({
      showOverlay: true,
      overlayText: "Validating mnemonic...",
    });

    workerInstance.validateMnemonic(trimmed)
      .then((result: { masterSK: Uint8Array; mnemonic: string }) => this.updateMasterKey(result))
      .then(() => this.updateStep(4))
      .catch((error: { message: string }) => this.handleError(error));
  }

  showError(errorMessage: string): void {
    this.props.alert.error(errorMessage);
  }

  storeKeys(): void {
    const {password, validatorKeys, withdrawalPath, signingPath, validatorPublicKey} = this.state;
    if (!validatorKeys || !validatorPublicKey) {
      throw new Error("Validator keys not found.");
    }
    const {withdrawal, signing} = validatorKeys;

    if (password && password.length < 8) {
      this.handleError({message: "Password must be at least 8 characters long."});
      return;
    }

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
                saveAs(content, `${toHex(validatorPublicKey)}.zip`);
              });
          });
      })
      .catch((error: { message: string }) => this.handleError(error));
  }

  updateMasterKey(result: { masterSK: Uint8Array; mnemonic: string }): void {
    this.setState({
      showOverlay: false,
      masterSK: result.masterSK,
      masterPK: generatePublicKey(result.masterSK),
      mnemonic: result.mnemonic,
    });
    this.deriveValidatorKeys(0, result.masterSK);
  }

  callStoreKeysWorker(): void {
    this.setState({showOverlay: true, overlayText: "Generating keystores..."});
    this.storeKeys();
  }

  async copyTextToClipboard(text: string): Promise<void> {
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        this.props.alert.show("Copied to clipboard");
      } catch (err) {
        this.props.alert.error("Failed to copy!", err);
      }
    }
  }

  goBack(): void {
    this.setState((prevState) => ({step: prevState.prevStep, prevStep: prevState.prevStep - 1}));
  }

  trimMnemonic(mnemonic: string) {
    return mnemonic.replace(/^\s*|\s*$/g,"").replace(/\f|\n|\r|\t|\v|\u00A0|\u2028|\u2029/g, "").replace(/\s\s+/g, " ");
  }

  verifyNewMnemonic() {
    const {mnemonicInput, mnemonic} = this.state;
    const trimmed = this.trimMnemonic(mnemonicInput);
    if (trimmed !== mnemonic) {
      this.props.alert.error("Mnemonic entered does not match mnemonic generated in previous screen");
    } else {
      this.restoreFromMnemonic();
    }
  }

  render (): object {
    const {validatorIndex, password, passwordConfirm, masterSK} = this.state;
    const passwordsMatch = password === passwordConfirm;
    const bounceLoader = <BounceLoader css="margin: auto;" />;

    return <span className="keygen-step">
      <LoadingOverlay
        active={this.state.showOverlay}
        spinner={bounceLoader}
        text={this.state.overlayText}
      >
      </LoadingOverlay>
      <div className="section">
        {this.state.step === 1 &&
          <div className="card columns">
            <div className="column generate-new-key">
              <button
                className="button is-primary"
                onClick={() => this.generateMasterKey()}
              >
                Generate New Master Key
              </button>
            </div>
            <div className="column restore-from-mnemonic">
              <div className="text-section">
                <div className="keygen-title">
                  Enter the mnemonic
                </div>
                <textarea
                  className='textarea'
                  placeholder="Enter phrase"
                  onChange={(event) => this.setState({mnemonicInput: event.target.value})}
                />
              </div>
              <div>
                <button
                  className="button is-primary"
                  onClick={() => this.restoreFromMnemonic()}
                >
                  Restore From Mnemonic
                </button>
              </div>
            </div>
          </div>
        }
        <div className="text-section">
          <div>
            {masterSK &&
              <div>
                {this.state.step === 2 &&
                  <div className="card">
                    <article className="message is-info">
                      <div className="message-body">
                        <p>Write this mnemonic down to avoid permanent data loss.</p>
                      </div>
                    </article>
                    <div>
                      <div className="keygen-title">
                        Mnemonic
                        <CopyButton
                          onClick={() => this.copyTextToClipboard(this.state.mnemonic || "")}
                        />
                      </div>
                      {this.state.mnemonic}
                    </div>
                    <br />
                    <BackButton onClick={() => this.goBack()} />
                    <button
                      className="button is-primary"
                      onClick={() => this.updateStep(3)}
                    >
                      Next
                    </button>
                  </div>
                }
                <br />
                {this.state.step === 3 &&
                  <div className="column restore-from-mnemonic">
                    <div className="text-section re-enter-mnemonic">
                      <div className="keygen-title">
                        Enter the mnemonic
                      </div>
                      <textarea
                        className='textarea'
                        placeholder="Enter phrase"
                        onChange={(event) => this.setState({mnemonicInput: event.target.value})}
                      />
                    </div>
                    <div>
                      <BackButton onClick={() => this.goBack()} />
                      <button
                        className="button is-primary"
                        onClick={() => this.verifyNewMnemonic()}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                }
                <br />
                {this.state.step === 4 &&
                  <div className="card">
                    <div className="key-text">
                      <div className="keygen-title">
                        Master Public Key
                        <CopyButton
                          onClick={() => {
                            if (!this.state.masterPK) {
                              this.props.alert.error("Master public key not found");
                              return;
                            }
                            this.copyTextToClipboard(toHex(this.state.masterPK));
                          }}
                        />
                      </div>
                      <div id="master-key-text">
                        {this.state.masterPK ? toHex(this.state.masterPK) : ""}
                      </div>
                    </div>
                    <br />
                    <div className="keygen-title">
                        Validator Index
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
                    {this.state.validatorPublicKey && <div className="key-text">
                      <div className="keygen-title">
                        Validator {validatorIndex || 0} Public Key
                        <CopyButton
                          onClick={() => {
                            if (!this.state.validatorPublicKey) {
                              throw new Error("Validator public key not found");
                            }
                            this.copyTextToClipboard(toHex(this.state.validatorPublicKey));
                          }}
                        />
                      </div>
                      {toHex(this.state.validatorPublicKey)}
                    </div>}
                    <div>
                      <div className="keygen-title">
                          Paths
                      </div>
                      <div><em>Signing: </em>{this.state.signingPath}</div>
                      <div><em>Withdrawal: </em>{this.state.withdrawalPath}</div>
                    </div>

                    <br />
                    <div className="keygen-title">
                      Enter password for your keys (Minimum 8 characters required)
                    </div>
                    <input
                      className="input"
                      placeholder="Enter password"
                      type="password"
                      onChange={(event) => this.setState({password: event.target.value})}
                    />
                    <div>
                      <div className="keygen-title">
                          Confirm password
                      </div>
                      <input
                        className="input"
                        placeholder="Confirm password"
                        type="password"
                        onChange={(event) => this.setState({passwordConfirm: event.target.value})}
                      />
                    </div>
                    <div>
                      {!passwordsMatch && <div>passwords do not match</div>}
                      <BackButton onClick={() => this.goBack()} />
                      <button
                        className="button is-primary"
                        onClick={() => this.callStoreKeysWorker()}
                        disabled={!password || !passwordConfirm || !passwordsMatch}>Download Keys
                      </button>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      </div>
    </span>;
  }
}

export default withAlert()(NewKey);
