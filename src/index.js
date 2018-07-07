// import 'babel-polyfill';

import React from 'react';
import ReactDOM from 'react-dom';
import Button from './js/button';

import logo from './assets/logo.svg';

import FractalModule from './js/wasm-binding/fractal.js'
import { drawFractalActionFactory, downloadImageActionFactory } from './js/action/fractal.js'
import wasmImportObject from './js/wasm/wasm-import-object.js'

const title = 'JavaScript OdessaJS 2018 @alSkachkov';

const cb = function () {
  let global;

  ReactDOM.render(
    <div className="App">
      <img className="App-Logo" src={logo} alt="React Logo" />
      <h1 className="App-Title">{title}</h1>
      <canvas id="canvas-1" width="300" height="300"></canvas>
      <ul>
        <li>
          <Button title="Init" action ={ doInit } value= { 1 } showResult = { true } />
        </li>
        <li>
          <Button title="Browser internal" action ={ doJpeg2Canv2Wasm2Webp } value= { 1 }/>
        </li>
        <li>
          <Button title="Wasm" action ={ doJpeg2Wasm2Webp } value= { 1 }/>
        </li>
        <li>
          <Button title="Webworker-Wasm" action ={ doRunWebworkers } value= { 1 }/>
        </li>
        <li>
          <Button title="Thread-Wasm" action ={ doRunThreads } value= { 1 }/>
        </li>
      </ul>
    </div>,
    document.getElementById('app')
  );
}

Promise.resolve().then(cb);

module.hot.accept();