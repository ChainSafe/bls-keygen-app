import * as React from "react";
// @ts-ignore
import forkmeImg from "./forkme_right_orange_ff7600.png";

export default function(): JSX.Element {
  return (
    <a href="https://github.com/chainsafe/bls-keygen-app"
      style={{position: "absolute", right: 0, top: 0}}>
      <img width="149" height="149"
        src={forkmeImg}
        className="attachment-full size-full"
        alt="Fork me on GitHub"
        data-recalc-dims="1" />
    </a>
  );
}
