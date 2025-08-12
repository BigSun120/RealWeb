const axios = require('axios');

// 测试配置API
async function testConfigAPI() {
  const baseURL = 'http://localhost:8000/api';

  try {
    console.log('🔍 测试配置API...\n');

    // 1. 测试获取配置列表（无需认证）
    console.log('1. 测试获取配置列表...');
    try {
      const response = await axios.get(`${baseURL}/admin/configs`);
      console.log('❌ 应该需要认证，但请求成功了');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ 正确返回401，需要认证');
      } else {
        console.log('❌ 意外错误:', error.message);
      }
    }

    // 2. 测试登录获取token
    console.log('\n2. 测试管理员登录...');
    let token = null;
    try {
      const loginResponse = await axios.post(`${baseURL}/auth/login`, {
        identifier: 'ad666',
        password: 'admin123456'
      });

      if (loginResponse.data.code === 200) {
        token = loginResponse.data.data.token;
        console.log('✅ 登录成功，获得token');
      } else {
        console.log('❌ 登录失败:', loginResponse.data.message);
        return;
      }
    } catch (error) {
      console.log('❌ 登录请求失败:', error.message);
      return;
    }

    // 3. 使用token测试获取配置列表
    console.log('\n3. 使用token获取配置列表...');
    try {
      const response = await axios.get(`${baseURL}/admin/configs`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.code === 200) {
        console.log('✅ 获取配置列表成功');
        console.log(`   配置数量: ${response.data.data.length}`);

        // 显示前几个配置
        const configs = response.data.data.slice(0, 5);
        configs.forEach(config => {
          console.log(`   - ${config.key}: ${config.value} (${config.group})`);
        });
      } else {
        console.log('❌ 获取配置失败:', response.data.message);
      }
    } catch (error) {
      console.log('❌ 请求失败:', error.message);
    }

    // 4. 测试获取配置分组
    console.log('\n4. 测试获取配置分组...');
    try {
      const response = await axios.get(`${baseURL}/admin/configs/groups`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.code === 200) {
        console.log('✅ 获取配置分组成功');
        console.log(`   分组: ${response.data.data.join(', ')}`);
      } else {
        console.log('❌ 获取分组失败:', response.data.message);
      }
    } catch (error) {
      console.log('❌ 请求失败:', error.message);
    }

    // 5. 测试设置配置
    console.log('\n5. 测试设置配置...');
    try {
      const response = await axios.put(`${baseURL}/admin/configs/test.setting`, {
        value: 'test-value',
        description: '测试配置',
        group: 'test'
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.code === 200) {
        console.log('✅ 设置配置成功');
        console.log(`   配置: ${response.data.data.key} = ${response.data.data.value}`);
      } else {
        console.log('❌ 设置配置失败:', response.data.message);
      }
    } catch (error) {
      console.log('❌ 请求失败:', error.message);
    }

    // 6. 测试获取单个配置
    console.log('\n6. 测试获取单个配置...');
    try {
      const response = await axios.get(`${baseURL}/admin/configs/test.setting`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.code === 200) {
        console.log('✅ 获取单个配置成功');
        console.log(`   配置: ${response.data.data.key} = ${response.data.data.value}`);
      } else {
        console.log('❌ 获取配置失败:', response.data.message);
      }
    } catch (error) {
      console.log('❌ 请求失败:', error.message);
    }

    // 7. 测试删除配置
    console.log('\n7. 测试删除配置...');
    try {
      const response = await axios.delete(`${baseURL}/admin/configs/test.setting`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.code === 200) {
        console.log('✅ 删除配置成功');
      } else {
        console.log('❌ 删除配置失败:', response.data.message);
      }
    } catch (error) {
      console.log('❌ 请求失败:', error.message);
    }

    console.log('\n🎉 配置API测试完成！');

  } catch (error) {
    console.error('💥 测试过程中发生错误:', error.message);
  }
}

// 运行测试
testConfigAPI();
