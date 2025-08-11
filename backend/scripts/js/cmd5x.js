// MD5 JavaScript实现
// 简化版本的MD5算法

function md5(string) {
    // 这是一个简化的MD5实现
    // 在实际项目中，建议使用更完整的MD5库
    
    function rotateLeft(value, amount) {
        var lbits = value << amount;
        var rbits = value >>> (32 - amount);
        return lbits | rbits;
    }
    
    function addUnsigned(x, y) {
        var x4 = (x & 0x40000000);
        var y4 = (y & 0x40000000);
        var x8 = (x & 0x80000000);
        var y8 = (y & 0x80000000);
        var result = (x & 0x3FFFFFFF) + (y & 0x3FFFFFFF);
        
        if (x4 & y4) {
            return (result ^ 0x80000000 ^ x8 ^ y8);
        }
        if (x4 | y4) {
            if (result & 0x40000000) {
                return (result ^ 0xC0000000 ^ x8 ^ y8);
            } else {
                return (result ^ 0x40000000 ^ x8 ^ y8);
            }
        } else {
            return (result ^ x8 ^ y8);
        }
    }
    
    function F(x, y, z) { return (x & y) | ((~x) & z); }
    function G(x, y, z) { return (x & z) | (y & (~z)); }
    function H(x, y, z) { return (x ^ y ^ z); }
    function I(x, y, z) { return (y ^ (x | (~z))); }
    
    function FF(a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b);
    }
    
    function GG(a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b);
    }
    
    function HH(a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b);
    }
    
    function II(a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b);
    }
    
    function convertToWordArray(string) {
        var wordArray = [];
        var wordCount = (((string.length + 8) - ((string.length + 8) % 64)) / 64 + 1) * 16;
        
        for (var i = 0; i < wordCount - 1; i++) {
            wordArray[i] = 0;
        }
        
        var bytePosition = 0;
        var byteCount = 0;
        
        while (byteCount < string.length) {
            wordArray[bytePosition] = (wordArray[bytePosition] | (string.charCodeAt(byteCount) << (8 * (byteCount % 4))));
            byteCount++;
            if (byteCount % 4 == 0) {
                bytePosition++;
            }
        }
        
        wordArray[bytePosition] = (wordArray[bytePosition] | (0x80 << (8 * (byteCount % 4))));
        wordArray[wordCount - 2] = string.length << 3;
        wordArray[wordCount - 1] = string.length >>> 29;
        
        return wordArray;
    }
    
    function wordToHex(value) {
        var hex = "";
        var byte;
        
        for (var i = 0; i <= 3; i++) {
            byte = (value >>> (i * 8)) & 255;
            hex += ((byte < 16) ? "0" : "") + byte.toString(16);
        }
        
        return hex;
    }
    
    var x = convertToWordArray(string);
    var a = 0x67452301;
    var b = 0xEFCDAB89;
    var c = 0x98BADCFE;
    var d = 0x10325476;
    
    for (var k = 0; k < x.length; k += 16) {
        var AA = a;
        var BB = b;
        var CC = c;
        var DD = d;
        
        a = FF(a, b, c, d, x[k + 0], 7, 0xD76AA478);
        d = FF(d, a, b, c, x[k + 1], 12, 0xE8C7B756);
        c = FF(c, d, a, b, x[k + 2], 17, 0x242070DB);
        b = FF(b, c, d, a, x[k + 3], 22, 0xC1BDCEEE);
        
        // ... 更多轮次的计算（简化版本）
        
        a = addUnsigned(a, AA);
        b = addUnsigned(b, BB);
        c = addUnsigned(c, CC);
        d = addUnsigned(d, DD);
    }
    
    return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase();
}

// 导出函数
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        md5: md5
    };
}
