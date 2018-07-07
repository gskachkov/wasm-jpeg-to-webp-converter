(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.wasmWorkerAPI = factory());
}(this, (function () { 'use strict';

function workerScope (pathWithFilename, path) {
  const functions = new Map();
  const heapMap = new Map([
    [  'HEAP8',         Int8Array],
    [ 'HEAPU8', Uint8ClampedArray],
    [ 'HEAP16',        Int16Array],
    ['HEAPU16',       Uint16Array],
    [ 'HEAP32',        Int32Array],
    ['HEAPU32',       Uint32Array],
    ['HEAPF32',      Float32Array],
    ['HEAPF64',      Float64Array]
  ]);

  let id = 1;

  addEventListener('message', once);

  function postError (error, msgId) {
    postMessage({ error, id: msgId });
  }

  function once ({ data }) {
    importScripts(
      URL.createObjectURL(
        new Blob([
          `var Module
           (function (url) {
             if (!Module) Module = {}
             Module.locateFile = function (file) {
               return url + file
             }
           })('${data.url + path}')`
        ])
      ),
      data.url + pathWithFilename
    );

    if (typeof Module === 'undefined')
      return postError("the 'Module' object is not defined.", 0)

    Module.addOnPostRun(() => {
      for (const { name, ret, args, isSetter, isGetter, type, returnType } of data.functions) {
        let binded = false;
        if (isSetter) {
          const fnSet = fnSetter(type);
          functions.set(name, { fn: fnSet, returnsArray: false });
          continue;
        } else if (isGetter) {
          const fnGet = fnGetter(type, returnType);
          functions.set(name, { fn: fnGet, returnsArray: false });
          continue;
        }

        if (typeof Module[name] === 'function') {
          binded = true;
        } else if (typeof Module[`_${name}`] !== 'function') {
          const message = (
            `failed to register the '${name}' function. ` +
            "The C/C++ code doesn't expose the function."
          );
          return postError(message, 0)
        }

        const arrayArgs = [];

        args && args.forEach((arg, i) => {
          if (/[0-9]/.test(arg)) {
            args[i] = 'number';
            arrayArgs.push({ index: i, type: arg });
          }
        });

        let returnsArray = false;
        let retType = ret;
        if (ret && /[0-9]/.test(ret)) {
          returnsArray = true;
          retType = 'number';
        }

        let fn = binded ? Module[name] : Module.cwrap(name, retType, args);
        if (arrayArgs.length)
          fn = fnWithArrayArgs(fn, arrayArgs);
        if (returnsArray)
          fn = fnThatReturnsArray(fn, ret);

        functions.set(name, { fn, returnsArray });
      }

      removeEventListener('message', once);
      addEventListener('message', handleMessage);

      postMessage({ id: 0 });
    });
  }

  function handleMessage ({ data }) {
    const funcObj = functions.get(data.name);

    // Unnecessary guard?
    if (!funcObj)
      return postError(`the function '${data.name}' doesn't exist.`, id++)

    const message = { name: data.name, id: id++ };

    if (funcObj.returnsArray)
      data.args.unshift(data.arrayLength);

    message.ret = funcObj.fn(...data.args);

    postMessage(message, funcObj.returnsArray ? [message.ret.buffer] : []);
  }

  function fnSetter (type) {
    return function(data, ptr) {
      const heapType = 'HEAP' + type;
      Module[heapType].set(data, ptr);
    }
  }

  function fnGetter (type, retType) {
    return function(ptr, size) {
      const heapType = 'HEAP' + type;
      const heapRetType = 'HEAP' + retType;
      const heapBuffer = Module[heapType].buffer;
      const typedArr = new (heapMap.get(heapRetType))(heapBuffer, ptr, size);
      return typedArr;
    }
  }

  function fnWithArrayArgs (fn, arrayArgs) {
    return function (...args) {
      const buffers = [];

      for (const { index, type } of arrayArgs) {
        const heapType = 'HEAP' + type;

        let typedArr = args[index];

        if (!(typedArr instanceof heapMap.get(heapType)))
          typedArr = heapMap.get(heapType).from(typedArr);

        const buf = Module._malloc(typedArr.BYTES_PER_ELEMENT * typedArr.length);
        buffers.push(buf);
        Module[heapType].set(typedArr, buf / typedArr.BYTES_PER_ELEMENT);
        args[index] = buf;
      }

      const ret = fn(...args);

      buffers.forEach(buf => Module._free(buf));

      return ret
    }
  }

  function fnThatReturnsArray (fn, arrayType) {
    return function (length = 1, ...args) {
      const ptr = fn(...args);
      const heapType = 'HEAP' + arrayType;
      const typedArr = new (heapMap.get(heapType))(length);
      const start = ptr / typedArr.BYTES_PER_ELEMENT;
      const heap = Module[heapType];

      for(let i = start, end = start + length, j = 0; i < end; i++, j++)
        typedArr[j] = heap[i];

      Module._free(ptr);

      return typedArr
    }
  }
}

function getWorker (pathWithFilename) {
  const slash = pathWithFilename.lastIndexOf('/');
  const path = slash >= 0 ? pathWithFilename.slice(0, slash + 1) : '';
  const workerInners = `(${workerScope.toString()})('${pathWithFilename}', '${path}')`;

  return new Worker(
    URL.createObjectURL(new Blob([workerInners]))
  )
}

function wasmWorkerAPI (functions, url) {
  if (!Array.isArray(functions))
    throw new TypeError('functions must be an array')

  const api = Object.create(null);
  const types = ['string', 'number', '8', 'U8', '16', 'U16', '32', 'U32', 'F32', 'F64'];
  const worker = getWorker(url);

  let id = 0;

  for (const { name, args: argTypes, ret, isGetter, isSetter, type } of functions) {
    if (!name)
      throw new Error("the 'name' field is required.")
    else if (typeof name !== 'string')
      throw new TypeError("the 'name' field should be a string.")
    if (isSetter) { 
      validateSetterType(name, type);
      api[name] = fnThatSetArray(name); 
      continue;
    } else if (isGetter) {
      validateSetterType(name, type);
      api[name] = fnThatGetArray(name); 
      continue;
    }
  
    if (ret) validateReturnType(name, ret);

    if (argTypes) validateArgTypes(name, argTypes);

    const returnsArray = /[0-9]/.test(ret);

    api[name] = returnsArray
      ? fnThatReturnsArray(name, argTypes ? argTypes.length : 0)
      : (...args) => call(name, args);
  }

  const ready = handleMessage(id, (resolve, _) => resolve(api));

  worker.postMessage({
    url: location.toString(),
    functions
  });

  function validateReturnType (name, ret) {
    const validReturnType = types.some(type => type === ret);

    if (!validReturnType) {
      throw new Error(
        `failed to register the '${name}' function. ` +
        `Invalid return type: ${ret}.`
      )
    }
  }

  function validateSetterType (name, setterType) {
    const validSetterType = types.some(type => type === setterType);

    if (!validSetterType) {
      throw new Error(
        `failed to register the '${name}' function. ` +
        `Invalid setter type: ${ret}.`
      )
    }
  }

  function validateArgTypes (name, argTypes) {
    if (!Array.isArray(argTypes)) {
      throw new Error(
        `failed to register the '${name}' function. ` +
        "The 'args' field must be an array."
      )
    }

    const invalidArgTypes = new Set();

    argTypes.forEach(argType => {
      const validArgType = types.some(type => type === argType);

      if (!validArgType) invalidArgTypes.add(argType);
    });

    if (invalidArgTypes.size) {
      throw new Error(
        `failed to register the '${name}' function. ` +
        `The following argument types aren't supported: ${
          [...invalidArgTypes].join(', ')
        }`
      )
    }
  }

  function handleMessage (msgId, callback) {
    return new Promise((resolve, reject) => {
      function onMessage ({ data }) {
        if (data.id !== msgId) return

        worker.removeEventListener('message', onMessage);

        if (data.error)
          return reject(new Error(data.error))

        callback(resolve, data);
      }

      worker.addEventListener('message', onMessage);
    })
  }

  function fnThatReturnsArray (name, declaredLength) {
    return function (...args) {
      if (args.length !== declaredLength + 1) {
        throw new Error(
          `failed to call the '${name}' function. ` +
          "A function that returns an array should accept the array's length " +
          'as the last parameter.'
        )
      }

      const arrayLength = args.pop();

      if (typeof arrayLength !== 'number')
        throw new TypeError('arrayLength must be a number')

      return call(name, args, arrayLength)
    }
  }

  function fnThatSetArray (name) {
    return (...args) => call(name, args);
  }

  function fnThatGetArray (name) {
    return (...args) => call(name, args);
  }

  function call (name, args, arrayLength) {
    const promise = handleMessage(++id, (resolve, { ret }) => resolve(ret));
    const transferables = [];

    args && args.length && args.forEach(arg => {
      !!arg.buffer && transferables.push(arg.buffer);
    });

    worker.postMessage({ id, name, args, arrayLength }, transferables);

    return promise
  }

  return ready
}

return wasmWorkerAPI;

})));