class SimpleComparer {
    constructor (count, api, getImageCb, drawImageCb) {
        this.api = api;
        this.getImage = getImageCb;
        this.drawImage = drawImageCb;
        this.quality = 100;
        this.count = count;
    }

    async convertJpegToWebPWithJS (blobJpeg) {
        console.time('jpeg-canv-js-webp');
        const api =  this.api;
        let result;
        const start = performance.now();
        for (var i = 0; i < this.count; i ++) {
          const img = await createImageBitmap(blobJpeg);
          // Make canvas same size as image
          const canvas = this.getImage('#canvas-1');
          canvas.width = img.width;
          canvas.height = img.height;
          // Draw image onto canvas
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const image = ctx.getImageData(0, 0, img.width, img.height);
  
          var out={output : ''};
          
          //CODE START
          var encoder = new WebPEncoder();
              
          //Config, you can set all arguments or what you need, nothing no objeect 
          var 
          config = new Object()
          config.target_size = 0;			// if non-zero, set the desired target size in bytes. Takes precedence over the 'compression' parameter.
          config.target_PSNR = 0.;		// if non-zero, specifies the minimal distortion to	try to achieve. Takes precedence over target_size.
          config.method = 0;				// quality/speed trade-off (0=fast, 6=slower-better)
          config.sns_strength = 50;		// Spatial Noise Shaping. 0=off, 100=maximum.
          config.filter_strength = 20;  	// range: [0 = off .. 100 = strongest]
          config.filter_sharpness = 0;	// range: [0 = off .. 7 = least sharp]
          config.filter_type = 1;			// filtering type: 0 = simple, 1 = strong (only used if filter_strength > 0 or autofilter > 0)
          config.partitions = 0;			// log2(number of token partitions) in [0..3] Default is set to 0 for easier progressive decoding.
          config.segments = 4;			// maximum number of segments to use, in [1..4]
          config.pass = 1;				// number of entropy-analysis passes (in [1..10]).
          config.show_compressed = 0;		// if true, export the compressed picture back. In-loop filtering is not applied.
          config.preprocessing = 0;		// preprocessing filter (0=none, 1=segment-smooth)
          config.autofilter = 0;			// Auto adjust filter's strength [0 = off, 1 = on]
                                          //   --- description from libwebp-C-Source Code --- 
          config.extra_info_type = 0;		// print extra_info
          config.preset = 0 				//0: default, 1: picture, 2: photo, 3: drawing, 4: icon 5: text
          
          //set Config; default config -> WebPConfig( null ) 
          encoder.WebPEncodeConfig(config); //when you set the config you must it do for every WebPEncode... new
          
          //start encoding
          var size = encoder.WebPEncodeRGBA(image.data, canvas.width, canvas.height, canvas.width*4, 100, out);
          console.log(typeof out.output);
          var enc = new TextEncoder();
          result = out.output;
        }
        const finish = performance.now();
        console.timeEnd('jpeg-canv-js-webp');
  
        this.drawImage(result);
        return finish - start; 
    };


    async convertJpegToWebPOverBmpAsync (blobJpeg) {
        console.time('jpeg-canv-wasm-webp');
        const api =  this.api;
        let result;
        const start = performance.now();
        for (var i = 0; i < this.count; i ++) {
          const img = await createImageBitmap(blobJpeg);
          // Make canvas same size as image
          const canvas = this.getImage('#canvas-1');
          canvas.width = img.width;
          canvas.height = img.height;
          // Draw image onto canvas
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const image = ctx.getImageData(0, 0, img.width, img.height);
  
          const p = api.create_buffer(image.width, image.height);
          Module.HEAP8.set(image.data, p);
          api.encode_bmp_to_webp(p, image.width, image.height, this.quality);
          const resultPointer = api.get_result_pointer();
          const resultSize = api.get_result_size();
          const resultView = new Uint8Array(Module.HEAP8.buffer, resultPointer, resultSize);
          result = new Uint8Array(resultView);
          api.free_result(resultPointer);
          api.destroy_buffer(p);
        }
        const finish = performance.now();
        console.timeEnd('jpeg-canv-wasm-webp');
  
        this.drawImage(result);
        return finish - start; 
    };
  
    convertJpegToWebP (arrayJpeg) {
        console.time('jpeg-wasm-webp');
        const api = this.api;
        let result;
        const start = performance.now();
        for (var i = 0; i < this.count; i ++) {
          let rawJpegAsTypedArray = new Uint8Array(arrayJpeg);
          const p = api.create_buffer(227, 149);
          Module.HEAP8.set(rawJpegAsTypedArray, p);
          const heapType = 'HEAP8';
          api.encode_jpeg_to_webp(p, rawJpegAsTypedArray.length, this.quality);
          const resultPointer = api.get_result_pointer();
          const resultSize = api.get_result_size();
          const resultView = new Uint8Array(Module.HEAP8.buffer, resultPointer, resultSize);
          result = new Uint8Array(resultView);
          api.free_result(resultPointer);
          api.destroy_buffer(p);
        }
        const finish = performance.now();
        console.timeEnd('jpeg-wasm-webp');
  
        this.drawImage(result);
        return finish - start; 
    }
}