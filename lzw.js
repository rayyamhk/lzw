const Base64 = require('base64-bit');
const encoder = Base64.Encoder();
const decoder = Base64.Decoder();
const fcc = String.fromCharCode;

const END_OF_STREAM = 0,
      CHARACTER_7 = 1,
      CHARACTER_16 = 2;

const compress = (input) => {
  if (typeof input !== 'string') {
    return null;
  }
  if (input.length === 0) {
    return '';
  }
  const dict = {};
  let tokenBits = 2;
  let dictIndex = 2;
  let dictIndexMax = 1 << tokenBits;

  let prev_word = input.charAt(0);
  let curr_char;
  let curr_word;
  let code;
  let i = 1;
  while (i < input.length) {
    curr_char = input.charAt(i);
    curr_word = prev_word + curr_char;
    if (dict[curr_word]) {
      prev_word = curr_word;
    } else {
      if (dict[prev_word]) {
        encoder.push(dict[prev_word], tokenBits);
      } else {
        code = prev_word.charCodeAt(0);
        if (code < 128) {
          encoder.push(CHARACTER_7, tokenBits);
          encoder.push(code, 7);
        } else {
          encoder.push(CHARACTER_16, tokenBits);
          encoder.push(code, 16);
        }
        dict[prev_word] = ++dictIndex;
      }
      dict[curr_word] = ++dictIndex;
      prev_word = curr_char;
      if (dictIndex >= dictIndexMax) {
        tokenBits += 1;
        dictIndexMax <<= 1;
      }
    }
    i += 1;
  }
  if (dict[prev_word]) {
    encoder.push(dict[prev_word], tokenBits);
  } else {
    code = prev_word.charCodeAt(0);
    if (code < 128) {
      encoder.push(CHARACTER_7, tokenBits);
      encoder.push(code, 7);
    } else {
      encoder.push(CHARACTER_16, tokenBits);
      encoder.push(code, 16);
    }
  }
  encoder.push(END_OF_STREAM, tokenBits); // End of stream
  return encoder.flush();
};

const decompress = (input) => {
  if (typeof input !== 'string') {
    return null;
  }
  if (input.length === 0) {
    return '';
  }
  decoder.from(input);

  const dict = [];
  let tokenBits = 2;
  let dictIndex = 2;
  let dictIndexMax = 2 ** tokenBits - 1; // decompression is one step behind compression
  
  let is_prev_char = true;
  let prev_word = decoder.pop(tokenBits) === CHARACTER_7 ? fcc(decoder.pop(7)) : fcc(decoder.pop(16));
  let curr_code;
  let curr_word;
  let decoded = prev_word;
  while (true) {
    if (is_prev_char) {
      dict[++dictIndex] = prev_word;
      is_prev_char = false;
    }
    if (dictIndex >= dictIndexMax) {
      tokenBits += 1;
      dictIndexMax = 2 ** tokenBits - 1;
    }
    curr_code = decoder.pop(tokenBits);
    if (curr_code === END_OF_STREAM) {
      break;
    }
    else if (curr_code === CHARACTER_7) {
      curr_word = fcc(decoder.pop(7));
      is_prev_char = true;
    }
    else if (curr_code === CHARACTER_16) {
      curr_word = fcc(decoder.pop(16));
      is_prev_char = true;
    }
    else if (dict[curr_code]) {
      curr_word = dict[curr_code];
    }
    else {
      curr_word = prev_word + prev_word.charAt(0);
    }
    dict[++dictIndex] = prev_word + curr_word.charAt(0);
    decoded += curr_word;
    prev_word = curr_word;
  }
  return decoded;
};

module.exports = {
  compress,
  decompress,
};
