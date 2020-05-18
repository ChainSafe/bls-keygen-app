import * as React from "react";

export default function(): object {
  return (
    <div className='section'>
      <div className='container'>
        <h1 className='title is-family-code'>Eth2 BLS Keygen</h1>
        <p className='subtitle'>Eth2 web utility for deriving children BLS keys from a master BLS key, which are then encrypted and bundled together in a downloadable format for use in Eth2 testnets. (Specs <a href="https://github.com/ethereum/EIPs/blob/master/EIPS/eip-2333.md">EIP-2333</a>, <a href="https://github.com/ethereum/EIPs/blob/master/EIPS/eip-2334.md">EIP-2334</a>, and <a href="https://github.com/ethereum/EIPs/blob/master/EIPS/eip-2335.md">EIP-2335</a>)</p>
        <article className="message is-danger">
          <div className="message-body">
            <p>This site is experimental, and should NOT be used for generating high-value keys.</p>
            <p>Mainnet keys should always be generated offline, using well-vetted software.</p>
          </div>
        </article>
      </div>
    </div>
  );
}
