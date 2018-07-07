function jsWorkerAPI (url) {
    function workerApi () {
        function getWorker (pathWithFilename) {
            const slash = pathWithFilename.lastIndexOf('/');
            const path = slash >= 0 ? pathWithFilename.slice(0, slash + 1) : '';
            const workerInners = `(${workerScope.toString()})('${pathWithFilename}', '${path}')`;
        
            return new Worker(
            URL.createObjectURL(new Blob([workerInners]))
            );
        }

        const worker = getWorker(url);
    }

    return workerApi;
}