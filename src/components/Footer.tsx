import * as React from "react";
import pkg from "../../package.json";

export default (): JSX.Element => {
  return (
    <footer className="footer">
      <div className="content has-text-centered">
        Made with ❤️ by{" "}
        <a className="is-link has-text-danger is-family-code" href="https://chainsafe.io">
          ChainSafe Systems
        </a>
      </div>
      <div className="content has-text-centered is-small is-family-code">
        <div><a className="is-link has-text-grey"
          href="https://www.npmjs.com/package/@chainsafe/bls">
          @chainsafe/bls {pkg.dependencies["@chainsafe/bls"]}
        </a></div>
        <div><a className="is-link has-text-grey"
          href="https://www.npmjs.com/package/@chainsafe/bls-hd-key">
          @chainsafe/bls-hd-key {pkg.dependencies["@chainsafe/bls-hd-key"]}
        </a></div>
        <div><a className="is-link has-text-grey"
          href="https://www.npmjs.com/package/@chainsafe/bls-keygen">
          @chainsafe/bls-keygen {pkg.dependencies["@chainsafe/bls-keygen"]}
        </a></div>
        <div><a className="is-link has-text-grey"
          href="https://www.npmjs.com/package/@chainsafe/bls-keystore">
          @chainsafe/bls-keystore {pkg.dependencies["@chainsafe/bls-keystore"]}
        </a></div>
      </div>
    </footer>
  );
};
