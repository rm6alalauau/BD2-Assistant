const fs = require('fs');
try {
    const buffer = fs.readFileSync('public/live2d_models/000701/char000701.skel');
    let str = '';
    // Spine binary usually puts version string early on.
    // Printable ascii range checking.
    for (let i = 0; i < 50; i++) {
        const c = buffer[i];
        if (c > 31 && c < 127) str += String.fromCharCode(c);
        else str += ' ';
    }
    console.log('Header Chars:', str);
    // Hash can be long, version might be after or before.
} catch (e) { console.error(e); }
