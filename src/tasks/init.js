const params = {};

const getApi = module => ({
    setSrcImage: module.cwrap('setSrcImage', 'number', ['number', 'number']),
    version: module.cwrap('version', 'number', []),
    create_buffer: module.cwrap('create_buffer', 'number', ['number', 'number']),
    destroy_buffer: module.cwrap('destroy_buffer', '', ['number']),
    encode_bmp_to_webp: module.cwrap('encode_bmp_to_webp', '', ['number', 'number', 'number']),
    encode_jpeg_to_webp: module.cwrap('encode_jpeg_to_webp', '', ['number', 'number']),
    encode_jpeg_to_bmp: module.cwrap('encode_jpeg_to_bmp', '', ['number', 'number']),
    get_result_pointer: module.cwrap('get_result_pointer', 'number', []),
    get_result_size:  module.cwrap('get_result_size', 'number', []),
    free_result: module.cwrap('free_result', '', [ 'number' ]),
  });

const pathToWasmModule = "/../wasm-jpeg-webp.js";

const doInit = () => { 
    loadSrcImage("images/testimg.jpg", params);
    params.api = getApi(Module);
};