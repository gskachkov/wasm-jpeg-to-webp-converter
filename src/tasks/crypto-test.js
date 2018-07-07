// salt should be Uint8Array or ArrayBuffer
var saltBuffer = Unibabel.utf8ToBuffer('salt');

async function calcPBKDF2 (pwdWord, pwdCount) {
// You should firstly import your passphrase Uint8array into a CryptoKey
  const key = await crypto.subtle.importKey(
    'raw', 
    Unibabel.utf8ToBuffer(pwdWord), 
    {name: 'PBKDF2'}, 
    false, 
    ['deriveBits', 'deriveKey']
  )

  const webKey = await crypto.subtle.deriveKey(
      { "name": 'PBKDF2',
        "salt": saltBuffer,
        // don't get too ambitious, or at least remember
        // that low-power phones will access your app
        "iterations": pwdCount,
        "hash": 'SHA-1'
      },
      key,

      // Note: for this demo we don't actually need a cipher suite,
      // but the api requires that it must be specified.

      // For AES the length required to be 128 or 256 bits (not bytes)
      { "name": 'AES-CBC', "length": 256 },

      // Whether or not the key is extractable (less secure) or not (more secure)
      // when false, the key can only be passed as a web crypto object, not inspected
      true,

      // this web crypto object will only be allowed for these functions
      [ "encrypt", "decrypt" ]
    );

  return crypto.subtle.exportKey("raw", webKey);
};