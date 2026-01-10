#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

#define SWITCH_PIN 21

// UUIDs MUST MATCH your React Native app
#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

BLECharacteristic *pCharacteristic;
bool deviceConnected = false;
bool lastSwitchState = HIGH;  // INPUT_PULLUP default

// BLE server callbacks
class MyServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    deviceConnected = true;
    Serial.println("Device connected!");
  }
  void onDisconnect(BLEServer* pServer) {
    deviceConnected = false;
    Serial.println("Device disconnected!");
  }
};

void setup() {
  Serial.begin(115200);
  
  // Switch setup
  pinMode(SWITCH_PIN, INPUT_PULLUP);
  
  // BLE setup - Device name will show in app
  BLEDevice::init("ESP32-Sathi");
  
  BLEServer *pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());
  
  BLEService *pService = pServer->createService(SERVICE_UUID);
  
  pCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_READ |
    BLECharacteristic::PROPERTY_NOTIFY
  );
  
  pCharacteristic->addDescriptor(new BLE2902());
  pService->start();
  
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->start();
  
  Serial.println("BLE ready as 'ESP32-Sathi', waiting for app...");
}

void loop() {
  bool currentState = digitalRead(SWITCH_PIN);
  
  // EDGE DETECTION
  if (currentState != lastSwitchState) {
    delay(50); // debounce
    currentState = digitalRead(SWITCH_PIN);
    
    if (currentState != lastSwitchState) {
      if (deviceConnected) {
        if (currentState == LOW) {
          pCharacteristic->setValue("EMERGENCY");  // Trigger emergency in app
          Serial.println("🚨 EMERGENCY - Switch PRESSED");
        } else {
          pCharacteristic->setValue("RELEASED");
          Serial.println("Switch RELEASED");
        }
        pCharacteristic->notify();  // 🔥 send to app
      }
      lastSwitchState = currentState;
    }
  }
  
  delay(10);
}
