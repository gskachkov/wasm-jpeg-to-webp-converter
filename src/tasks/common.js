const addResult = (value) => {
    const span = document.createElement('span');
    span.innerText = JSON.stringify(value);
    document.body.appendChild(span);
};
  
const addBr = () => {
    const br = document.createElement('br');
    document.body.appendChild(br);
};

const getImage = id => document.querySelector(id);

function loadSrcImage(imgUrl, holder) {
    fetch(imgUrl)
      .then(response => response.blob())
      .then(img => { holder.inputBlobJpeg = img; global = img; });

    fetch(imgUrl)
      .then(response => response.arrayBuffer())
      .then(img => { holder.inputArrayJpeg = img });
}

const drawImage = image => {
    let blobURL;
    if (typeof image === 'string') {
        const base64URI=btoa(image);
        blobURL = "data:image/webp;base64," + base64URI;
    } else {  
        const blob = new Blob([image], {type: 'image/webp'});
        blobURL = URL.createObjectURL(blob);
    }

    const imgWebP = document.createElement('img');
    imgWebP.src = blobURL;
    document.body.appendChild(imgWebP);
};