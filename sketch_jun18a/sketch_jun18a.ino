#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <Servo.h>

const char* ssid = "114514"; // WiFi网络的名称
const char* password = "617880522"; // WiFi网络的密码

// OneNET 平台的设备 ID 和数据流 ID
const String deviceID = "1020521995"; // 设备 ID
const String datastreamID = "suo"; // 数据流 ID

// OneNET 平台的 API Key
const String apiKey = "LAHDNNfRhhmgPdZN5yPtbfAzB80="; // API Key

WiFiClient wifiClient; // WiFi 客户端对象
Servo servo; // 舵机对象

#define THRESHOLD 400 // 阈值，用于匹配按键
#define MAX_NUM_VALUES 9 // 按键序列的最大长度
#define NUM_ROWS 5 // 按键序列数组的最大行数
unsigned long t = 0; // 用于计时的变量
int key[MAX_NUM_VALUES] = {352, 922, 284, 290, 314, 258, 256, 321, 588}; // 预设的按键序列
int numRows = NUM_ROWS; // 按键序列数组的当前行数
int i = 0; // 当前匹配的按键索引

bool dataUpdated = false; // 数据更新标志

void setup() {
  servo.attach(D2); // 将舵机连接到D2引脚
  t = millis(); // 初始化计时器
  Serial.begin(9600); // 初始化串口通信
  pinMode(A0, INPUT); // 将A0引脚设置为输入模式
  WiFi.begin(ssid, password); // 连接WiFi网络
  Serial.print("WiFi connecting...");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("WiFi connected!");
}

void loop() {
  
  if (WiFi.status() == WL_CONNECTED) { // 检查WiFi连接状态
    HTTPClient http;

    String url = "http://api.heclouds.com/devices/" + deviceID + "/datapoints?datastream_id=" + datastreamID;
    http.begin(wifiClient, url);
    http.addHeader("api-key", apiKey);

    int httpCode = http.GET(); // 发送GET请求获取数据

    if (httpCode == HTTP_CODE_OK) { // 检查HTTP请求是否成功
      String payload = http.getString(); // 读取响应数据

      parseData(payload); // 解析数据
      int dt = millis() - t; // 计算时间间隔
      int sensorValue = analogRead(A0); // 读取A0引脚的模拟值

      if (dt > 2000) { // 如果时间间隔超过2秒，则重新开始匹配按键
        t = millis();
        i = 0;
        servo.write(0); // 将舵机归位

        return;
      }

      if (sensorValue > 200 && dt > 200) { // 检测到按键按下
        t = millis();
        bool isMatchingKey = false;

        if (i > 0) {
          for (int a = 0; a < numRows; a++) {
            int thresholdLow = key[i - 1] - THRESHOLD;
            int thresholdHigh = key[i - 1] + THRESHOLD;
            isMatchingKey = (thresholdLow < dt && dt < thresholdHigh);

            if (isMatchingKey) break;
          }
        }

        if (isMatchingKey) { // 检测到匹配的按键
          if (++i > MAX_NUM_VALUES) { // 匹配完成，执行相应操作
            i = 0;
            servo.write(180); // 转动舵机到指定位置
            Serial.println("right!"); // 打印信息到串口监视器
          }
          return;
        }

        i = 0;
      }
    } else {
      Serial.println("从OneNET获取数据失败。HTTP状态码: " + String(httpCode));
    }

    http.end();
  }

  if (Serial.available() > 0) { // 检测串口输入
    String input = Serial.readStringUntil('\n'); // 读取串口数据直到换行符
    input.trim();

    if (input == "printkey") { // 如果输入为"printkey"，打印按键序列
      printKeyArray();
    }
  }
}

void parseData(String payload) {
  String value = getValueByKey(payload, "value");

  if (value != "") {
    int colIndex = 0;
    char *ptr = strtok((char *)value.c_str(), "/");

    while (ptr != NULL && colIndex < MAX_NUM_VALUES) {
      key[colIndex] = atoi(ptr); // 解析按键序列
      ptr = strtok(NULL, "/");
      colIndex++;
    }

    numRows = 1;  // 将按键序列数组的行数设置为1
  } else {
    Serial.println("未从OneNET接收到数据.");
  }
}

void printKeyArray() {
  Serial.println("now key:");
  for (int i = 0; i < numRows; i++) {
    for (int j = 0; j < MAX_NUM_VALUES; j++) {
      Serial.print(key[i * MAX_NUM_VALUES + j]); // 打印按键序列
      Serial.print(" ");
    }
    Serial.println();
  }
}

String getValueByKey(String data, String key) {
  String value = "";
  int keyIndex = data.indexOf(key);

  if (keyIndex != -1) {
    int valueIndex = data.indexOf(":", keyIndex);
    int valueEndIndex = data.indexOf(",", valueIndex);

    if (valueIndex != -1 && valueEndIndex != -1) {
      value = data.substring(valueIndex + 1, valueEndIndex); // 提取数值部分
      value.trim();
      value.remove(0, 1);
      value.remove(value.length() - 1);
    }
  }

  return value;
}
