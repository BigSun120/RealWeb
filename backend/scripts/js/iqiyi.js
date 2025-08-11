// 爱奇艺认证JS文件 - 简化版本

function auth(key) {
    if (!key) {
        return "cb2c7d269b5b8c8e8b8e8b8e8b8e8b8e";
    }

    // 简化的认证逻辑
    var result = "";
    for (var i = 0; i < key.length; i++) {
        var char = key.charCodeAt(i);
        result += String.fromCharCode(char ^ 0x5A);
    }

    return result;
}

function addChar(str) {
    if (!str) return "";

    // 简化的字符串处理
    var timestamp = Math.floor(Date.now() / 1000);
    return str + "&t=" + timestamp + "&k=cb2c7d269b5b8c8e8b8e8b8e8b8e8b8e";
}
