import { readFileSync } from 'fs';
try {
    const buffer = readFileSync('public/live2d_models/000701/char000701.skel');
    // First 4 bytes are hash usually? Or signature?
    // Spine binary format often starts with hash, strictly structured.
    // Version string is usually near the top.
    // Let's print the first 100 printable chars.
    let str = '';
    for (let i = 0; i < 100; i++) {
        const c = buffer[i];
        if (c > 31 && c < 127) str += String.fromCharCode(c);
        else str += '.';
    }
    console.log('Header Chars:', str);
} catch (e) { console.error(e); }
