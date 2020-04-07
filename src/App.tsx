import React from "react";

import ForkMe from "./components/ForkMe";
import Header from "./components/Header";
import KeyGen from "./components/KeyGen";
import Footer from "./components/Footer";

export default function App(): object {
  return (
    <>
      <ForkMe />
      <Header />
      <KeyGen />
      <Footer />
    </>
  );
}
