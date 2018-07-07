const workerWrapper = function (url) {
    const jsWorker = new Worker(url);
    let hash = [];
    let index = 0;

    jsWorker.onmessage = function(e) {
        const resolve = hash[e.data.index];
        resolve(e.data.data);
    };

    return {
        processData: function (config, data) {
            const promise = new Promise(resolve => {
                index++;
                hash[index] = resolve;
                jsWorker.postMessage({ index, config, data });
            });
            return promise;
        }
    }
};


class ThreadsComparer {
    constructor (threadsCount, api, getImageCb, drawImageCb, imageCount) {
        this.api = api;
        this.getImage = getImageCb;
        this.drawImage = drawImageCb;
        this.quality = 100;
        this.threadsCount = threadsCount;
        this.imageCount = imageCount;
        this.threads = [];
        this.jsThreads = [];
    }

    async runThreadOverBmpAsync (thread, finishOperation) {
        while (this.images.length > 0) {
          const blob = this.images.pop();
          const img = await createImageBitmap(blob);
          // Make canvas same size as image
          const canvas = this.getImage('#canvas-1');
          canvas.width = img.width;
          canvas.height = img.height;
          // Draw image onto canvas
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const image = ctx.getImageData(0, 0, img.width, img.height);
          const p = await thread.create_buffer(image.width, image.height);
          thread.encode_setter(image.data, p);
          const result = await thread.encode_bmp_to_webp(p, image.width, image.height, 100);
          const [ptr, size] = await Promise.all([thread.get_result_pointer(), thread.get_result_size()]);
          const buffer = await thread.encode_getter(ptr, size);
          const resultImage = new Uint8Array(buffer);
          thread.free_result(ptr);
          thread.destroy_buffer(p);
          this.imageResults.push(resultImage);
          if (this.imageResults.length >= imageCount) {
                
            const finishTime = performance.now();
  
            this.drawImage(resultImage);
  
            finishOperation(finishTime);
            return;
          }
        }
    }

    async runThreadOverBmpJSAsync (thread, finishOperation) {
        while (this.images.length > 0) {
          const blob = this.images.pop();
          const img = await createImageBitmap(blob);
          // Make canvas same size as image
          const canvas = this.getImage('#canvas-1');
          canvas.width = img.width;
          canvas.height = img.height;
          // Draw image onto canvas
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const image = ctx.getImageData(0, 0, img.width, img.height);

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
          config.width = canvas.width; 
          config.height = canvas.height;

          const resultImage = await thread.processData(config, image.data);
          this.imageResults.push(resultImage);
          if (this.imageResults.length >= imageCount) {
                
            const finishTime = performance.now();
            this.drawImage(resultImage);
  
            finishOperation(finishTime);
            return;
          }
        }
    }

    async runThreadAsync (thread, finishOperation) {
        while (this.images.length > 0) {
          const blob = this.images.pop();
          
          const bufferSize = blob.length;
          const p = await thread.create_buffer(227, 149);
          await thread.encode_setter(blob, p);
          const result = await thread.encode_jpeg_to_webp(p, bufferSize, 100);
  
          const [ptr, size] = await Promise.all([thread.get_result_pointer(), thread.get_result_size()]);
          const buffer = await thread.encode_getter(ptr, size);
          const resultImage = new Uint8Array(buffer);
          thread.free_result(ptr);
          thread.destroy_buffer(p);
          this.imageResults.push(resultImage);
          if (this.imageResults.length >= this.imageCount) {
            const finishTime = performance.now();
  
            this.drawImage(resultImage);

            finishOperation(finishTime);
            return;
          }
        }
    }

    async fillThreadsAsync (url) {
        for (let i = 0; i < this.threadsCount; i++ ) {
          const api = await wasmWorkerAPI(webp_to_canvas, pathToWasmModule);
          this.threads.push(api);

          this.jsThreads.push(workerWrapper(url));
        }
      };
    
    fillImagesOverBmp (jpeg) {
        this.images = [];
        this.imageResults = [];
        for (let i = 0; i < this.imageCount; i++ ) {
            this.images.push(jpeg);
        }
    }
  
    fillImages (jpeg) {
        this.images = [];
        this.imageResults = [];
        for (let i = 0; i < this.imageCount; i++ ) {
          const rawJpegAssign = new Uint8Array(jpeg);
          const rawJpegAsTypedArray = new Uint8Array(rawJpegAssign.length);
          rawJpegAsTypedArray.set(rawJpegAssign, 0);
          this.images.push(rawJpegAsTypedArray);
        }
    }

    async convertJpegToWebPOverBmpAsync (inputBlobJpeg) {
        let resolve;
        const promise = new Promise(_resolve => {
            resolve = _resolve;
        });

        this.fillImagesOverBmp(inputBlobJpeg);
        const startTime = performance.now();
        for (let i = 0; i < this.threadsCount; i++) {
            this.runThreadOverBmpAsync(this.threads[i], resolve);
        }

        const endTime = await promise;
        return endTime - startTime;
    };
  
    async convertJpegToWebPAsync (inputArrayJpeg) {
        let resolve;
        const promise = new Promise(_resolve => {
            resolve = _resolve;
        });

        this.fillImages(inputArrayJpeg);
        const startTime = performance.now();
        for (let i = 0; i < this.threadsCount; i++) {
          this.runThreadAsync(this.threads[i], resolve);
        }

        const endTime = await promise;
        return endTime - startTime;
    }

    async convertJpegToWebPOverBmpJsAsync (inputBlobJpeg) {
        let resolve;
        const promise = new Promise(_resolve => {
            resolve = _resolve;
        });

        this.fillImagesOverBmp(inputBlobJpeg);
        const startTime = performance.now();
        for (let i = 0; i < this.threadsCount; i++) {
            this.runThreadOverBmpJSAsync(this.jsThreads[i], resolve);
        }

        const endTime = await promise;
        return endTime - startTime;
    }
}