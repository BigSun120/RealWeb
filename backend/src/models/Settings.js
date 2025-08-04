const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  // 设置类型：site(网站信息), personal(个人信息), blog(博客设置)
  type: {
    type: String,
    required: true,
    enum: ['site', 'personal', 'blog'],
    unique: true
  },

  // 设置数据
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // 最后更新者
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// 静态方法：获取设置
settingsSchema.statics.getSetting = async function(type) {
  const setting = await this.findOne({ type });
  return setting ? setting.data : {};
};

// 静态方法：更新设置
settingsSchema.statics.updateSetting = async function(type, data, updatedBy) {
  const setting = await this.findOneAndUpdate(
    { type },
    { 
      data,
      updatedBy,
      updatedAt: new Date()
    },
    { 
      upsert: true, 
      new: true,
      runValidators: true
    }
  );
  return setting;
};

// 静态方法：获取所有设置
settingsSchema.statics.getAllSettings = async function() {
  const settings = await this.find({});
  const result = {};
  
  settings.forEach(setting => {
    result[setting.type] = setting.data;
  });
  
  return result;
};

module.exports = mongoose.model('Settings', settingsSchema);
