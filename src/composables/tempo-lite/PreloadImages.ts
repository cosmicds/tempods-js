// modified from https://stackoverflow.com/a/63397776/11594175

let preloadedImages: HTMLElement[] = [];

function loadImage(src: string): Promise<HTMLElement> {
  return new Promise((resolve, reject) => {
    const img = document.createElement("link");
    img.rel = "preload";
    img.as = "image";
    img.onload = function () {
      resolve(img);
    };
    img.onerror = img.onabort = function () {
      reject(src);
    };
    img.href = src;
    // add it to the dom in body so it will load
    document.body.appendChild(img);
    // append to the preloaded images list so it can be removed
    preloadedImages.push(img);
  });
}
export function _preloadImages(images: string[]): Promise<HTMLElement>[] {
  // remove past images
  preloadedImages.forEach((img) => {
    img.remove();
  });
  preloadedImages = [];
  const promises = images.map((src) => loadImage(src));
  // Promise.all(promises);
  return promises;
}

// reset the preload images
