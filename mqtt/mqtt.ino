#include <WiFi.h>
#include <PubSubClient.h>
#include <SPI.h>
#include <MFRC522.h>

// =====================================================
// WIFI
// =====================================================

const char* ssid = "Free S Wifi";
const char* password = "67896789";

// =====================================================
// MQTT
// =====================================================

const char* MQTT_SERVER = "broker.emqx.io";
const int MQTT_PORT = 1883;

#define CONTROL_TOPIC "bonupdata"
#define DATA_TOPIC    "bondowdata"

// =====================================================
// RC522
// =====================================================

#define RC522_SS    10
#define RC522_RST   3
#define RC522_SCK   6
#define RC522_MISO  4
#define RC522_MOSI  5

MFRC522 rfid(RC522_SS, RC522_RST);

// =====================================================
// BUZZER
// =====================================================

#define BUZZER_PIN 9

// =====================================================
// MQTT CLIENT
// =====================================================

WiFiClient espClient;
PubSubClient client(espClient);

// =====================================================
// TRẠNG THÁI NGĂN 1
// =====================================================

String slotStatus = "SẴN SÀNG";
String currentUser = "--";

// Chống quét RFID liên tục
unsigned long lastRFID = 0;
const unsigned long RFID_DELAY = 1500;

// =====================================================
// BUZZER
// =====================================================

void beep(int times, int duration = 150)
{
  for (int i = 0; i < times; i++)
  {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(duration);

    digitalWrite(BUZZER_PIN, LOW);
    delay(150);
  }
}

// =====================================================
// WIFI
// =====================================================

void setupWiFi()
{
  Serial.println();
  Serial.println("========== WIFI ==========");

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED)
  {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("WiFi da ket noi!");

  Serial.print("IP ESP32: ");
  Serial.println(WiFi.localIP());
}

// =====================================================
// GỬI STATUS
// =====================================================

void publishStatus()
{
  String json = "{";

  json += "\"event\":\"STATUS\",";
  json += "\"slot\":1,";
  json += "\"status\":\"";
  json += slotStatus;
  json += "\",";
  json += "\"user\":\"";
  json += currentUser;
  json += "\"";

  json += "}";

  if (client.publish(DATA_TOPIC, json.c_str()))
  {
    Serial.print("STATUS -> MQTT: ");
    Serial.println(json);
  }
  else
  {
    Serial.println("Loi gui STATUS!");
  }
}

// =====================================================
// GỬI RFID
// =====================================================

void publishRFID(String uid)
{
  String json = "{";

  json += "\"event\":\"RFID\",";
  json += "\"slot\":1,";
  json += "\"uid\":\"";
  json += uid;
  json += "\",";
  json += "\"status\":\"";
  json += slotStatus;
  json += "\"";

  json += "}";

  if (client.publish(DATA_TOPIC, json.c_str()))
  {
    Serial.print("RFID -> MQTT: ");
    Serial.println(json);
  }
  else
  {
    Serial.println("Loi gui RFID!");
  }
}

// =====================================================
// MQTT RECONNECT
// =====================================================

void reconnectMQTT()
{
  while (!client.connected())
  {
    Serial.print("Dang ket noi MQTT... ");

    String clientID = "ESP32_C5_";
    clientID += String(
      (uint32_t)ESP.getEfuseMac(),
      HEX
    );

    if (client.connect(clientID.c_str()))
    {
      Serial.println("OK");

      client.subscribe(CONTROL_TOPIC);

      Serial.print("Subscribe: ");
      Serial.println(CONTROL_TOPIC);

      // Gửi trạng thái hiện tại
      publishStatus();
    }
    else
    {
      Serial.print("FAIL rc=");
      Serial.println(client.state());

      delay(2000);
    }
  }
}

// =====================================================
// NHẬN LỆNH MQTT
// =====================================================

void callback(char* topic, byte* payload, unsigned int length)
{
  String message = "";

  for (unsigned int i = 0; i < length; i++)
  {
    message += (char)payload[i];
  }

  Serial.println();
  Serial.println("================================");
  Serial.println("MQTT COMMAND");
  Serial.println("================================");

  Serial.print("Topic: ");
  Serial.println(topic);

  Serial.print("Message: ");
  Serial.println(message);


  // =================================================
  // BORROW TỪ MQTT
  // MÔ PHỎNG MƯỢN
  // =================================================

  if (message.indexOf("\"command\":\"BORROW\"") >= 0 &&
      message.indexOf("\"slot\":1") >= 0)
  {
    Serial.println(">>> MQTT BORROW SLOT 1");

    if (slotStatus == "SẴN SÀNG")
    {
      slotStatus = "ĐANG MƯỢN";

      currentUser = "MQTT";

      Serial.println(">>> MO NGAN");

      // Sau này:
      // openServo();

      beep(1);

      publishStatus();
    }
    else
    {
      Serial.println(">>> KHONG THE MUON");

      beep(3);
    }
  }


  // =================================================
  // RETURN TỪ MQTT
  // MÔ PHỎNG TRẢ
  // =================================================

  else if (message.indexOf("\"command\":\"RETURN\"") >= 0 &&
           message.indexOf("\"slot\":1") >= 0)
  {
    Serial.println(">>> MQTT RETURN SLOT 1");

    if (slotStatus == "ĐANG MƯỢN")
    {
      slotStatus = "SẴN SÀNG";
      currentUser = "--";

      Serial.println(">>> DONG NGAN");

      // Sau này:
      // closeServo();

      beep(2);

      publishStatus();
    }
    else
    {
      Serial.println(">>> NGAN KHONG O TRANG THAI MUON");

      beep(3);
    }
  }


  // =================================================
  // QUẢN LÝ MỞ NGĂN
  // → ĐANG BẢO TRÌ
  // =================================================

  else if (message.indexOf("\"command\":\"OPEN\"") >= 0 &&
           message.indexOf("\"slot\":1") >= 0)
  {
    Serial.println(">>> QUAN LY MO NGAN 1");

    if (slotStatus == "ĐANG MƯỢN")
    {
      Serial.println(">>> KHONG THE MO BAO TRI");

      beep(3);

      String json = "{";

      json += "\"event\":\"COMMAND_DENIED\",";
      json += "\"slot\":1,";
      json += "\"reason\":\"NGAN DANG DUOC MUON\"";

      json += "}";

      client.publish(DATA_TOPIC, json.c_str());
    }
    else
    {
      slotStatus = "ĐANG BẢO TRÌ";
      currentUser = "--";

      Serial.println(">>> NGAN DANG BAO TRI");

      // Sau này:
      // openServo();

      beep(1);

      publishStatus();
    }
  }


  // =================================================
  // KẾT THÚC BẢO TRÌ
  // =================================================

  else if (
    message.indexOf("\"command\":\"END_MAINTENANCE\"") >= 0 &&
    message.indexOf("\"slot\":1") >= 0
  )
  {
    Serial.println(">>> KET THUC BAO TRI");

    if (slotStatus == "ĐANG BẢO TRÌ")
    {
      slotStatus = "SẴN SÀNG";
      currentUser = "--";

      Serial.println(">>> DONG NGAN");

      // Sau này:
      // closeServo();

      beep(2);

      publishStatus();
    }
  }


  // =================================================
  // STATUS
  // =================================================

  else if (message.indexOf("\"command\":\"STATUS\"") >= 0)
  {
    Serial.println(">>> GUI STATUS");

    publishStatus();
  }
}

// =====================================================
// KIỂM TRA RFID
// =====================================================

void checkRFID()
{
  if (!rfid.PICC_IsNewCardPresent())
  {
    return;
  }

  if (!rfid.PICC_ReadCardSerial())
  {
    return;
  }

  unsigned long now = millis();

  // Chống đọc lặp
  if (now - lastRFID < RFID_DELAY)
  {
    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
    return;
  }

  lastRFID = now;

  // =================================================
  // ĐỌC UID
  // =================================================

  String uid = "";

  for (byte i = 0; i < rfid.uid.size; i++)
  {
    if (rfid.uid.uidByte[i] < 0x10)
    {
      uid += "0";
    }

    uid += String(
      rfid.uid.uidByte[i],
      HEX
    );

    if (i < rfid.uid.size - 1)
    {
      uid += ":";
    }
  }

  uid.toUpperCase();

  Serial.println();
  Serial.println("================================");
  Serial.println("RFID PHAT HIEN");
  Serial.println("================================");

  Serial.print("UID: ");
  Serial.println(uid);


  // =================================================
  // ĐANG BẢO TRÌ
  // =================================================

  if (slotStatus == "ĐANG BẢO TRÌ")
  {
    Serial.println(">>> NGAN DANG BAO TRI");
    Serial.println(">>> KHONG CHO MUON");

    beep(3);

    String json = "{";

    json += "\"event\":\"RFID_DENIED\",";
    json += "\"slot\":1,";
    json += "\"uid\":\"";
    json += uid;
    json += "\",";
    json += "\"reason\":\"DANG BAO TRI\"";

    json += "}";

    client.publish(DATA_TOPIC, json.c_str());

    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();

    return;
  }


  // =================================================
  // SẴN SÀNG → MƯỢN
  // =================================================

  if (slotStatus == "SẴN SÀNG")
  {
    slotStatus = "ĐANG MƯỢN";
    currentUser = uid;

    Serial.println(">>> BAT DAU MUON");

    // Sau này:
    // openServo();

    beep(1);

    publishRFID(uid);
    publishStatus();
  }


  // =================================================
  // ĐANG MƯỢN → TRẢ
  // =================================================

  else if (slotStatus == "ĐANG MƯỢN")
  {
    // Đúng người đang mượn
    if (uid == currentUser)
    {
      slotStatus = "SẴN SÀNG";
      currentUser = "--";

      Serial.println(">>> DUNG CHU THE");
      Serial.println(">>> TRA PIN");

      // Sau này:
      // closeServo();

      beep(2);

      publishRFID(uid);
      publishStatus();
    }

    // Thẻ khác
    else
    {
      Serial.println(">>> THE KHAC VOI NGUOI DANG MUON");

      beep(3);

      String json = "{";

      json += "\"event\":\"RFID_DENIED\",";
      json += "\"slot\":1,";
      json += "\"uid\":\"";
      json += uid;
      json += "\",";
      json += "\"reason\":\"THE KHONG DUNG\"";

      json += "}";

      client.publish(DATA_TOPIC, json.c_str());
    }
  }

  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
}

// =====================================================
// SETUP
// =====================================================

void setup()
{
  Serial.begin(115200);

  delay(1000);

  Serial.println();
  Serial.println("======================================");
  Serial.println(" ESP32-C5 SMART BORROW STATION");
  Serial.println(" RC522 + BUZZER + MQTT + WEB");
  Serial.println("======================================");


  // =================================================
  // BUZZER
  // =================================================

  pinMode(BUZZER_PIN, OUTPUT);

  digitalWrite(BUZZER_PIN, LOW);


  // =================================================
  // RC522
  // =================================================

  Serial.println("Khoi dong RC522...");

  SPI.begin(
    RC522_SCK,
    RC522_MISO,
    RC522_MOSI,
    RC522_SS
  );

  rfid.PCD_Init();

  delay(100);

  Serial.println("RC522 OK");


  // =================================================
  // WIFI
  // =================================================

  setupWiFi();


  // =================================================
  // MQTT
  // =================================================

  client.setServer(
    MQTT_SERVER,
    MQTT_PORT
  );

  client.setCallback(callback);


  Serial.println();
  Serial.println("======================================");
  Serial.println("HE THONG SAN SANG!");
  Serial.println("======================================");
}

// =====================================================
// LOOP
// =====================================================

void loop()
{
  // MQTT
  if (!client.connected())
  {
    reconnectMQTT();
  }

  client.loop();

  // RFID
  checkRFID();

  delay(50);
}