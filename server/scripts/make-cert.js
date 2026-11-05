// Creates a self-signed TLS certificate for https://localhost (development only).
// Output: certs/localhost.pem + certs/localhost-key.pem (same names mkcert uses, so a trusted
// mkcert certificate can simply replace these files). Both files are git-ignored.
const fs = require('fs');
const path = require('path');
const selfsigned = require('selfsigned');

const dir = path.join(__dirname, '..', 'certs');
fs.mkdirSync(dir, { recursive: true });
const pems = selfsigned.generate([{ name: 'commonName', value: 'localhost' }], {
  keySize: 2048,
  days: 825,
  algorithm: 'sha256',
  extensions: [
    { name: 'basicConstraints', cA: false },
    { name: 'keyUsage', digitalSignature: true, keyEncipherment: true },
    { name: 'extKeyUsage', serverAuth: true },
    { name: 'subjectAltName', altNames: [{ type: 2, value: 'localhost' }, { type: 7, ip: '127.0.0.1' }] },
  ],
});
fs.writeFileSync(path.join(dir, 'localhost.pem'), pems.cert);
fs.writeFileSync(path.join(dir, 'localhost-key.pem'), pems.private);
console.log(`Certificate written to ${dir}`);
