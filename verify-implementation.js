/**
 * 实现验证脚本 - 检查代码完整性
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 验证临时邮箱功能实现...\n');

// 检查文件是否存在
const filesToCheck = [
  'backend/src/routes/admin/tempEmailActivationCodes.js',
  'backend/src/routes/tempEmail.js',
  'backend/src/models/User.js',
  'frontend/src/views/admin/TempEmailActivationCodes.vue',
  'frontend/src/views/TempEmail.vue',
  'frontend/src/api/tempEmail.js',
  'frontend/src/api/tempEmailAuth.js'
];

console.log('📁 检查文件存在性...');
let allFilesExist = true;
filesToCheck.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - 文件不存在`);
    allFilesExist = false;
  }
});

if (!allFilesExist) {
  console.log('\n❌ 部分文件缺失，请检查实现');
  process.exit(1);
}

console.log('\n🔧 检查关键代码片段...');

// 检查后端API实现
const backendConfigFile = fs.readFileSync('backend/src/routes/admin/tempEmailActivationCodes.js', 'utf8');
const checks = [
  {
    name: '后端配置获取API',
    file: 'backend/src/routes/admin/tempEmailActivationCodes.js',
    pattern: /router\.get\(['"]\/config['"]/,
    content: backendConfigFile
  },
  {
    name: '后端配置更新API',
    file: 'backend/src/routes/admin/tempEmailActivationCodes.js',
    pattern: /router\.put\(['"]\/config['"]/,
    content: backendConfigFile
  },
  {
    name: 'ToolConfig导入',
    file: 'backend/src/routes/admin/tempEmailActivationCodes.js',
    pattern: /require\(['"].*ToolConfig['"]\)/,
    content: backendConfigFile
  }
];

// 检查用户端公告API
const tempEmailFile = fs.readFileSync('backend/src/routes/tempEmail.js', 'utf8');
checks.push({
  name: '用户端公告API',
  file: 'backend/src/routes/tempEmail.js',
  pattern: /router\.get\(['"]\/notice['"]/,
  content: tempEmailFile
});

// 检查User模型修改
const userModelFile = fs.readFileSync('backend/src/models/User.js', 'utf8');
checks.push({
  name: 'User模型ToolConfig导入',
  file: 'backend/src/models/User.js',
  pattern: /require\(['"].*ToolConfig['"]\)/,
  content: userModelFile
});

checks.push({
  name: 'User模型权限检查修改',
  file: 'backend/src/models/User.js',
  pattern: /requireActivationCode.*getValue/,
  content: userModelFile
});

// 检查前端管理界面
const adminVueFile = fs.readFileSync('frontend/src/views/admin/TempEmailActivationCodes.vue', 'utf8');
checks.push({
  name: '前端配置管理界面',
  file: 'frontend/src/views/admin/TempEmailActivationCodes.vue',
  pattern: /config-section/,
  content: adminVueFile
});

checks.push({
  name: '前端配置数据',
  file: 'frontend/src/views/admin/TempEmailActivationCodes.vue',
  pattern: /const config = ref\(/,
  content: adminVueFile
});

// 检查前端用户界面
const tempEmailVueFile = fs.readFileSync('frontend/src/views/TempEmail.vue', 'utf8');
checks.push({
  name: '前端公告显示',
  file: 'frontend/src/views/TempEmail.vue',
  pattern: /temp-email-notice/,
  content: tempEmailVueFile
});

checks.push({
  name: '前端公告数据',
  file: 'frontend/src/views/TempEmail.vue',
  pattern: /tempEmailNotice.*ref/,
  content: tempEmailVueFile
});

// 检查API文件
const tempEmailApiFile = fs.readFileSync('frontend/src/api/tempEmail.js', 'utf8');
checks.push({
  name: '前端公告API',
  file: 'frontend/src/api/tempEmail.js',
  pattern: /getNotice.*function/,
  content: tempEmailApiFile
});

const tempEmailAuthApiFile = fs.readFileSync('frontend/src/api/tempEmailAuth.js', 'utf8');
checks.push({
  name: '前端配置管理API',
  file: 'frontend/src/api/tempEmailAuth.js',
  pattern: /getConfig.*function/,
  content: tempEmailAuthApiFile
});

// 执行检查
let allChecksPass = true;
checks.forEach(check => {
  if (check.pattern.test(check.content)) {
    console.log(`✅ ${check.name}`);
  } else {
    console.log(`❌ ${check.name} - 在 ${check.file} 中未找到预期代码`);
    allChecksPass = false;
  }
});

console.log('\n📊 验证结果:');
if (allChecksPass) {
  console.log('🎉 所有检查通过！实现看起来是完整的。');
  console.log('\n📋 下一步:');
  console.log('1. 启动服务器测试功能');
  console.log('2. 访问管理后台验证配置界面');
  console.log('3. 测试临时邮箱页面公告显示');
  console.log('4. 验证激活码验证开关功能');
} else {
  console.log('❌ 部分检查失败，请检查实现的完整性');
  process.exit(1);
}

console.log('\n🔗 相关链接:');
console.log('- 管理后台: https://godaug.fun/admin/temp-email-activation-codes');
console.log('- 临时邮箱页面: https://godaug.fun/temp-email');
console.log('- 更新说明文档: docx/临时邮箱功能更新说明.md');
