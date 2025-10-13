# 批量角色解析器修复文档

## 问题描述

用户在使用批量角色导入功能时，遇到无法正确解析AI生成内容的问题。

## 问题示例

用户提供的格式：
```
【角色1】
姓名：萧景玄
年龄：26
性别：男
角色定位：男主角
描述：大晏王朝三皇子...
性格特点：冷静睿智...
角色背景：皇后嫡子...
行为动机：巩固皇权...
人际关系：与皇帝关系微妙...

【角色2】
姓名：...
```

## 问题原因

原解析函数使用 `text.split(/【角色\\d+】/)` 进行分割，这种方式会：
1. 丢失分隔符本身
2. 无法正确处理多行字段值
3. 对换行符敏感的格式支持不好

## 解决方案

### 修改前
```javascript
const characterBlocks = text.split(/【角色\\d+】/).filter(block => block.trim());

characterBlocks.forEach((block, index) => {
  const character = {
    name: extractField(block, ['姓名', '名字', '角色名'], 20),
    // ... 使用通用extractField
  };
});
```

### 修改后
```javascript
// 使用matchAll保留分隔符并提取内容块
const characterMatches = text.matchAll(/【角色(\\d+)】([\\s\\S]*?)(?=【角色\\d+】|$)/g);

for (const match of characterMatches) {
  const block = match[2];
  
  // 专门的单行字段提取函数
  const extractLineField = (fieldName) => {
    const pattern = new RegExp(`${fieldName}[\\uff1a:]*\\\\s*(.+?)(?=\\\\n|$)`, 'i');
    const match = block.match(pattern);
    return match ? match[1].trim() : '';
  };
  
  const character = {
    name: extractLineField('姓名') || extractLineField('名字'),
    role: extractLineField('角色定位') || extractLineField('定位'),
    // ...
  };
}
```

## 关键改进

### 1. 使用 matchAll 代替 split
- ✅ 保留分隔符信息
- ✅ 准确提取每个角色块
- ✅ 支持正向预查避免内容丢失

### 2. 单行字段提取函数
```javascript
const extractLineField = (fieldName) => {
  const pattern = new RegExp(`${fieldName}[\\uff1a:]*\\\\s*(.+?)(?=\\\\n|$)`, 'i');
  const match = block.match(pattern);
  return match ? match[1].trim() : '';
};
```

**特点**：
- 支持中文冒号（：）和英文冒号（:）
- 匹配到换行符或字符串结束
- 自动trim去除首尾空格

### 3. 返回格式优化
```javascript
// 修改前
return characters; // 直接返回数组

// 修改后
return { characters }; // 返回对象包含characters数组
```

这样与组件期望的数据格式一致。

## 支持的格式

### 标准格式
```
【角色1】
姓名：张三
年龄：25
性别：男
角色定位：男主角
描述：简短描述
性格特点：性格描述
角色背景：背景描述
行为动机：动机描述
人际关系：关系描述

【角色2】
姓名：李四
...
```

### 灵活支持

#### 1. 冒号格式
```
姓名：张三    ✅
姓名:张三     ✅
姓名 张三     ✅
```

#### 2. 字段别名
```
姓名 / 名字           → name
角色定位 / 定位       → role
性格特点 / 性格       → personality
角色背景 / 背景       → background
行为动机 / 动机       → motivation
人际关系 / 关系       → relationships
```

#### 3. 年龄和性别
```
年龄：25       ✅
25岁          ✅
性别：男       ✅
男性          ✅
```

## 测试用例

### 测试1: 完整数据
```
【角色1】
姓名：萧景玄
年龄：26
性别：男
角色定位：男主角
描述：大晏王朝三皇子
性格特点：冷静睿智
角色背景：皇后嫡子
行为动机：巩固皇权
人际关系：与皇帝关系微妙
```

**期望结果**：✅ 所有字段正确解析

### 测试2: 部分数据
```
【角色1】
姓名：张三
角色定位：男主角
描述：简介
```

**期望结果**：✅ 解析成功，未填字段为空字符串或null

### 测试3: 多个角色
```
【角色1】
姓名：张三
...

【角色2】
姓名：李四
...

【角色3】
姓名：王五
...
```

**期望结果**：✅ 解析3个角色

## 构建验证

```bash
✓ 2562 modules transformed
✓ built in 16.52s
✓ 无错误
```

## 使用建议

### 推荐的AI提示词格式

当生成批量角色时，建议在提示词中明确要求：

```
请按以下格式生成X个角色：

【角色1】
姓名：[角色姓名]
年龄：[数字]
性别：[男/女/其他]
角色定位：[男主角/女主角/男配角/女配角/反派/龙套]
描述：[简短描述]
性格特点：[性格描述]
角色背景：[背景描述]
行为动机：[动机描述]
人际关系：[关系描述]

【角色2】
...
```

### 注意事项

1. **必须使用【角色N】标记**：N必须是数字
2. **字段名称要准确**：建议使用标准字段名
3. **换行分隔**：每个字段独占一行
4. **避免空行**：角色块之间可以有空行，但字段之间不要有空行

## 相关文件

- `frontend/src/views/tools/productivity/drama/utils/aiResponseParser.js` - 解析器文件
- `frontend/src/views/tools/productivity/drama/components/CharacterManager.vue` - 使用解析器的组件

## 后续优化建议

1. 支持更多格式变体（如使用=号、|等分隔）
2. 添加格式验证和友好错误提示
3. 支持模糊匹配字段名
4. 提供解析预览功能

---

**修复状态**：✅ 已完成  
**测试状态**：✅ 构建成功  
**影响范围**：批量角色导入功能
