/**
 * YouTube Cookies提取脚本
 * 在YouTube页面的浏览器控制台中运行此脚本来提取cookies
 */

function extractYouTubeCookies() {
    console.log('🍪 开始提取YouTube Cookies...');
    
    // 获取所有cookies
    const cookies = document.cookie.split(';');
    const youtubeDomain = '.youtube.com';
    const googleDomain = '.google.com';
    
    let cookiesText = '# Netscape HTTP Cookie File\n';
    cookiesText += '# This is a generated file! Do not edit.\n\n';
    
    // 重要的YouTube cookies
    const importantCookies = [
        'VISITOR_INFO1_LIVE',
        'YSC', 
        'PREF',
        'CONSENT',
        'SOCS',
        '__Secure-3PSID',
        '__Secure-3PAPISID',
        '__Secure-3PSIDCC',
        'HSID',
        'SSID',
        'APISID',
        'SAPISID',
        'SID',
        'SIDCC',
        'LOGIN_INFO'
    ];
    
    cookies.forEach(cookie => {
        const [name, value] = cookie.trim().split('=');
        if (name && value && importantCookies.some(important => name.includes(important))) {
            // 格式：domain flag path secure expiration name value
            const domain = name.includes('youtube') ? youtubeDomain : googleDomain;
            const flag = 'TRUE';
            const path = '/';
            const secure = 'TRUE';
            const expiration = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60); // 1年后过期
            
            cookiesText += `${domain}\t${flag}\t${path}\t${secure}\t${expiration}\t${name}\t${value}\n`;
        }
    });
    
    console.log('✅ Cookies提取完成！');
    console.log('📋 复制以下内容到cookies.txt文件：');
    console.log('='.repeat(50));
    console.log(cookiesText);
    console.log('='.repeat(50));
    
    // 尝试下载文件
    try {
        const blob = new Blob([cookiesText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'youtube_cookies.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log('💾 cookies.txt文件已自动下载！');
    } catch (error) {
        console.log('⚠️ 自动下载失败，请手动复制上面的内容');
    }
    
    return cookiesText;
}

// 使用说明
console.log(`
🍪 YouTube Cookies 提取工具

使用步骤：
1. 确保您已登录YouTube
2. 在此页面按F12打开开发者工具
3. 切换到Console标签
4. 粘贴并运行以下命令：

extractYouTubeCookies()

5. 复制输出的内容到cookies.txt文件
6. 将cookies.txt放到项目的backend/config/目录下
`);

// 导出函数供直接调用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { extractYouTubeCookies };
}
