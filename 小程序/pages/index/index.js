Page({
    data: {
      isTiming: false, // 计时器是否正在计时的标志位
      clickTimes: [], // 存储点击时间间隔的数组
      lastClickTime: 0, // 上次点击的时间戳
      latestData: [], // 最新数据
      intervals: [] // 点击时间间隔数组
    },
  
    // 开始计时的函数
    handleStart: function () {
      if (this.data.isTiming) { // 如果计时器已经在计时，则不执行下面的逻辑
        console.log('计时已经开始！');
        return;
      }
  
      this.setData({
        clickTimes: [], // 清空点击时间间隔数组
        isTiming: true, // 设置计时器状态为正在计时
        lastClickTime: 0 // 重置上次点击的时间戳
      });
    },
  
    // 结束计时的函数
    handleEnd: function () {
      if (!this.data.isTiming) { // 如果计时器尚未开始，则不执行下面的逻辑
        console.log('计时尚未开始！');
        return;
      }
  
      this.setData({
        isTiming: false // 设置计时器状态为未计时
      });
  
      console.log('点击时间间隔数组:', this.data.clickTimes); // 输出点击时间间隔数组
  
      sendDataToOneNet(this.data.clickTimes); // 将点击时间间隔数组发送到 OneNet 平台
    },
  
    // 处理触摸开始事件的函数
    handleTouchStart: function (event) {
      if (!this.data.isTiming) { // 如果计时器未开始，则不执行下面的逻辑
        return;
      }
  
      const currentTime = Date.now(); // 获取当前时间戳
      const clickTimes = this.data.clickTimes; // 获取点击时间间隔数组
      const lastClickTime = this.data.lastClickTime; // 获取上次点击的时间戳
  
      if (lastClickTime > 0) {
        const interval = currentTime - lastClickTime; // 计算点击时间间隔
  
        clickTimes.push(interval); // 将点击时间间隔添加到数组中
      }
  
      this.setData({
        lastClickTime: currentTime, // 更新上次点击的时间戳
        clickTimes: clickTimes // 更新点击时间间隔数组
      });
    },
  
    // 获取最新数据的函数
    fetchData: function () {
      const that = this;
      const deviceId = '1020521995'; // 设备 ID
      const apiKey = 'LAHDNNfRhhmgPdZN5yPtbfAzB80='; // API 密钥
      const datastreamId = 'suo'; // 数据流 ID
  
      const url = `https://api.heclouds.com/devices/${deviceId}/datastreams/${datastreamId}`; // 请求数据的 URL
      const header = {
        'Content-Type': 'application/json',
        'api-key': apiKey
      };
  
      wx.request({
        url: url,
        method: 'GET',
        header: header,
        success: function (res) {
          if (res.data && res.data.data && res.data.data.current_value) {
            const latestData = res.data.data.current_value; // 获取最新数据
            const dataArray = latestData.split('/').map(Number); // 将每个元素转换为整型
            dataArray.push(0); // 添加数字0到数组末尾
  
            that.setData({
              latestData: dataArray, // 更新最新数据数组
              intervals: dataArray // 更新点击时间间隔数组
            });
          } else {
            console.log('No data available');
          }
        },
        fail: function (err) {
          console.error('Failed to fetch data from OneNet:', err);
        }
      });
    },
  
    onLoad: function () {
      this.fetchData(); // 页面加载时获取初始数据
  
      // 每隔5秒钟获取一次数据
      setInterval(this.fetchData.bind(this), 5000);
    },
  
    // 播放节奏的函数
    playBeat: function (index) {
      const intervals = this.data.intervals; // 使用存储在数据中的点击时间间隔数组
      const audioContext = wx.createInnerAudioContext();
      audioContext.src = '/pages/audio/节奏2.mp3'; // 设置音频文件的路径
  
      if (index < intervals.length) {
        audioContext.play(); // 播放音频
  
        setTimeout(() => {
          this.playBeat(index + 1); // 递归调用，播放下一个节拍
        }, intervals[index]);
      }
    },
  
    // 点击播放节奏按钮的事件处理函数
    onPlayButtonTap: function () {
      this.setData({
        index: 0 // 重置索引
      });
      this.playBeat(0); // 开始播放节奏
    }
  });
  
  // 将密码数组发送到 OneNet 平台的函数
  function sendDataToOneNet(passwordArray) {
    const deviceId = '1020521995'; // 设备 ID
    const apiKey = 'LAHDNNfRhhmgPdZN5yPtbfAzB80='; // API 密钥
    const datastreamId = 'suo'; // 数据流 ID
  
    const values = passwordArray.join('/'); // 使用斜杠将数组元素拼接为字符串
  
    const url = `https://api.heclouds.com/devices/${deviceId}/datapoints`; // 发送数据的 URL
    const header = {
      'Content-Type': 'application/json',
      'api-key': apiKey
    };
    const data = {
      datastreams: [
        {
          id: datastreamId,
          datapoints: [{ value: values }] // 将拼接后的字符串作为单个数据点传输
        }
      ]
    };
  
    wx.request({
      url: url,
      method: 'POST',
      header: header,
      data: data,
      success: function (res) {
        console.log('Data sent to OneNet successfully');
      },
      fail: function (err) {
        console.error('Failed to send data to OneNet:', err);
      }
    });
  }
  