/*
 * Music Glasses v1 — firmware for the Adafruit QT Py ESP32 Pico
 * ----------------------------------------------------------------------------
 * Features (Mark 1):
 *   1. Bluetooth A2DP sink, name "Muse Glasses" (stereo, one MAX98357A per side)
 *   2. Touch control: 3 copper pads per temple pod
 *        tap = play/pause, or answer / hang up during a call; long-press = reject an incoming call;
 *        swipe = volume (HFP call volume while a call is up)
 *   3. Phone calls: Bluetooth Hands-Free Profile client (HFP-HF), CVSD 8 kHz / mSBC 16 kHz over HCI,
 *        SPH0645LM4H I2S MEMS mic in the RIGHT ear pod (front edge, port aimed forward-down at the jaw line)
 *   4. BLE companion service (volume, play state, track, EQ, link, config, battery, call state, find-my-glasses chime)
 *   5. Battery monitor (A3 divider) + 3-band EQ presets
 *
 * HFP route: the Arduino-ESP32 3.3.x prebuilt ESP-IDF 5.5 libraries already ship with
 *   CONFIG_BT_HFP_ENABLE / CONFIG_BT_HFP_CLIENT_ENABLE / CONFIG_BT_HFP_AUDIO_DATA_PATH_HCI / CONFIG_BT_HFP_WBS_ENABLE = y
 *   and the internal CVSD/mSBC codec, so plain Arduino works: no ESP-IDF rebuild, no custom sdkconfig.
 *   The ESP32-A2DP library only does A2DP/AVRCP; HFP is added here with the raw esp_hf_client API
 *   (legacy PCM data callbacks: esp_hf_client_register_data_callback + esp_hf_client_outgoing_data_ready).
 *
 * Toolchain (per spec):
 *   - Arduino-ESP32 core 3.3.x, board "Adafruit QT Py ESP32" (esp32:esp32:adafruit_qtpy_esp32_pico)
 *   - Partition scheme: keep "Default (3MB APP/1.5MB SPIFFS)" (8 MB flash) — A2DP + BLE need the 3 MB app slot
 *   - Libraries: ESP32-A2DP 1.8.10+ and arduino-audio-tools (pschatzmann)
 *   - BLE: the core's Bluedroid BLE library (NOT NimBLE), controller in BTDM (dual) mode, Wi-Fi unused
 *
 * Pin map (QT Py pad -> GPIO)
 *   A0  -> GPIO26  I2S BCLK  (both amps)
 *   A1  -> GPIO25  I2S LRC   (both amps)
 *   RX  -> GPIO7   I2S DIN   (both amps)
 *   A2  -> GPIO27  T7  touch R1 (right pod, front)
 *   SDA -> GPIO4   T0  touch R2
 *   SCL -> GPIO33  T8  touch R3 (rear)
 *   TX  -> GPIO32  T9  touch L1 (left pod, front)
 *   MO  -> GPIO13  T4  touch L2
 *   SCK -> GPIO14  T6  touch L3 (rear)
 *   A3  -> GPIO15  battery sense, 100k/100k divider from switched VBAT (strapping pin, ADC2)
 *   SDA1 (STEMMA QT) -> GPIO22  I2S mic data in (SPH0645 DOUT); mic BCLK/LRCL share A0/A1, SEL -> GND (left slot)
 *   MI (GPIO12) and BOOT (GPIO0) are strapping pins: left unconnected.
 *   Amps: left SD->VIN (left channel), right 330k VIN->SD (right channel), GAIN->VIN (6 dB), VIN = switched VBAT.
 */
#include "AudioTools.h"
#include "BluetoothA2DPSink.h"
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <Preferences.h>
#include "esp_gap_bt_api.h"
#include "esp_hf_client_api.h"
#include "esp_hf_client_legacy_api.h"
#include "freertos/ringbuf.h"

// ---------------------------------------------------------------- config
#define DEVICE_NAME   "Muse Glasses"
#define PIN_BCLK      26
#define PIN_LRC       25
#define PIN_DIN       7
#define PIN_VBAT      15
#define PIN_MIC       22        // SDA1 on the STEMMA QT connector — not a strapping pin
#define CALL_RATE     32000     // I2S rate during calls: SPH0645 needs BCLK >= 2.048 MHz (32 kHz x 64)
#define MIC_GAIN      6.0f      // mic sits behind the ear, ~10 cm from the mouth: extra digital gain
#define DUCK_GAIN     0.25f     // half-duplex ducking (-12 dB) while the far end is talking
#define LONG_PRESS_MS 800
static const uint8_t TOUCH_PINS[6] = {27, 4, 33, 32, 13, 14};   // R1 R2 R3 L1 L2 L3 (front -> rear)

#define TOUCH_TRIGGER   0.15f   // touched when the reading drops 15 % below baseline
#define TOUCH_RELEASE   0.10f   // released when it is back within 10 %
#define BASELINE_N      64      // baseline = running average of 64 untouched samples
#define TAP_MIN_MS      40
#define TAP_MAX_MS      300
#define SWIPE_MAX_MS    700
#define LOCKOUT_MS      150
#define VOL_STEP        8       // on the 0..127 AVRCP scale

// GATT (spec): service 9f3c0001-2b6e-4c1a-8f5d-6a7e0b1c2d3e
#define UUID_SERVICE  "9f3c0001-2b6e-4c1a-8f5d-6a7e0b1c2d3e"
#define UUID_VOLUME   "9f3c0002-2b6e-4c1a-8f5d-6a7e0b1c2d3e"  // uint8 0..127   R/W/N
#define UUID_PLAY     "9f3c0003-2b6e-4c1a-8f5d-6a7e0b1c2d3e"  // uint8 0 paused, 1 playing  R/W/N
#define UUID_TRACK    "9f3c0004-2b6e-4c1a-8f5d-6a7e0b1c2d3e"  // UTF-8 "title\x1Fartist" <=180 B  R/N
#define UUID_EQ       "9f3c0005-2b6e-4c1a-8f5d-6a7e0b1c2d3e"  // uint8 0 Flat 1 Bass+ 2 Vocal 3 Treble  R/W/N
#define UUID_LINK     "9f3c0006-2b6e-4c1a-8f5d-6a7e0b1c2d3e"  // uint8 0 disconnected 1 connected 2 streaming  R/N
#define UUID_CONFIG   "9f3c0007-2b6e-4c1a-8f5d-6a7e0b1c2d3e"  // uint8 bit0 invert swipe, bit1 recalibrate  W
#define UUID_FIND     "9f3c0008-2b6e-4c1a-8f5d-6a7e0b1c2d3e"  // uint8 seconds of chime (0 = stop), ignores volume/mute  W
#define UUID_CALL     "9f3c0009-2b6e-4c1a-8f5d-6a7e0b1c2d3e"  // uint8 0 idle 1 incoming 2 outgoing 3 active  R/N

// ---------------------------------------------------------------- audio chain: A2DP -> EQ -> I2S
I2SStream i2s;
Equalizer3Bands eq(i2s);
ConfigEqualizer3Bands eqCfg;
BluetoothA2DPSink a2dp(eq);

struct EqPreset { float lo, mid, hi; };
static const EqPreset EQ_PRESETS[4] = {
  {1.00f, 1.00f, 1.00f},   // 0 Flat
  {1.60f, 1.00f, 0.90f},   // 1 Bass+ (tiny speakers: keep it modest)
  {0.80f, 1.25f, 1.00f},   // 2 Vocal
  {0.90f, 1.00f, 1.50f},   // 3 Treble
};

// ---------------------------------------------------------------- state
volatile uint8_t gVolume = 64;
volatile uint8_t gPlaying = 0;
volatile uint8_t gLink = 0;
volatile uint8_t gEq = 0;
volatile bool gInvertSwipe = false;
volatile bool gRecalibrate = false;
volatile bool gTrackDirty = false, gPlayDirty = false, gVolDirty = false, gLinkDirty = false;
char gTitle[128] = "", gArtist[96] = "";
portMUX_TYPE gMux = portMUX_INITIALIZER_UNLOCKED;

Preferences prefs;
BLECharacteristic *chVol, *chPlay, *chTrack, *chEq, *chLink, *chCfg, *chBatt, *chFind, *chCall;

// ---------------------------------------------------------------- call + chime state
enum CallState : uint8_t { CALL_IDLE = 0, CALL_INCOMING = 1, CALL_OUTGOING = 2, CALL_ACTIVE = 3 };
volatile uint8_t gCall = CALL_IDLE, gCallVol = 10;          // HFP speaker volume 0..15
volatile bool gScoUp = false, gScoWide = false, gScoChanged = false, gCallDirty = false;
volatile uint32_t gChimeUntil = 0;
bool gAudioCallMode = false;                                // I2S currently in 32 kHz full-duplex call mode
RingbufHandle_t rxRing = nullptr, txRing = nullptr;         // phone -> speakers, mic -> phone (16-bit mono PCM)
bool bleClient = false;

// ---------------------------------------------------------------- helpers
void applyEq(uint8_t p) {
  if (p > 3) p = 0;
  gEq = p;
  eqCfg.gain_low = EQ_PRESETS[p].lo;
  eqCfg.gain_medium = EQ_PRESETS[p].mid;
  eqCfg.gain_high = EQ_PRESETS[p].hi;
  eq.begin(eqCfg);                         // re-computes the filter gains
  prefs.putUChar("eq", p);                 // persist (NVS)
}

void setVolume(int v, bool fromPhone = false) {
  v = constrain(v, 0, 127);
  gVolume = (uint8_t)v;
  if (!fromPhone) a2dp.set_volume(gVolume); // also sent to the phone over AVRCP (absolute volume)
  gVolDirty = true;
}

void notifyU8(BLECharacteristic *c, uint8_t v) {
  c->setValue(&v, 1);
  if (bleClient) c->notify();
}

// ---------------------------------------------------------------- A2DP callbacks
void onConnState(esp_a2d_connection_state_t s, void *) {
  if (s == ESP_A2D_CONNECTION_STATE_CONNECTED) Serial.printf("A2DP connected, free heap %u\n", ESP.getFreeHeap());
  gLink = (s == ESP_A2D_CONNECTION_STATE_CONNECTED) ? 1 : 0;
  gLinkDirty = true;
}
void onAudioState(esp_a2d_audio_state_t s, void *) {
  if (gLink) { gLink = (s == ESP_A2D_AUDIO_STATE_STARTED) ? 2 : 1; gLinkDirty = true; }
}
void onPlayStatus(esp_avrc_playback_stat_t st) {
  gPlaying = (st == ESP_AVRC_PLAYBACK_PLAYING) ? 1 : 0;
  gPlayDirty = true;
}
void onRemoteVolume(int v) { gVolume = (uint8_t)constrain(v, 0, 127); gVolDirty = true; }
void onMetadata(uint8_t id, const uint8_t *text) {
  portENTER_CRITICAL(&gMux);
  if (id == ESP_AVRC_MD_ATTR_TITLE)  { strncpy(gTitle, (const char *)text, sizeof(gTitle) - 1); gTitle[sizeof(gTitle) - 1] = 0; }
  if (id == ESP_AVRC_MD_ATTR_ARTIST) { strncpy(gArtist, (const char *)text, sizeof(gArtist) - 1); gArtist[sizeof(gArtist) - 1] = 0; }
  portEXIT_CRITICAL(&gMux);
  gTrackDirty = true;
}

// ---------------------------------------------------------------- BLE
class ServerCB : public BLEServerCallbacks {
  void onConnect(BLEServer *) override { bleClient = true; }
  void onDisconnect(BLEServer *s) override { bleClient = false; s->getAdvertising()->start(); }
};
class WriteCB : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *c) override {
    String v = c->getValue();
    if (v.length() < 1) return;
    uint8_t b = (uint8_t)v[0];
    if (c == chVol) setVolume(b);
    else if (c == chPlay) { if (b) a2dp.play(); else a2dp.pause(); }
    else if (c == chEq) { applyEq(b); notifyU8(chEq, gEq); }
    else if (c == chFind) { gChimeUntil = b ? millis() + 1000UL * b : 0; }
    else if (c == chCfg) { gInvertSwipe = b & 0x01; prefs.putBool("inv", gInvertSwipe); if (b & 0x02) gRecalibrate = true; }
  }
};

BLECharacteristic *mkChar(BLEService *s, const char *uuid, uint32_t props) {
  BLECharacteristic *c = s->createCharacteristic(uuid, props);
  if (props & BLECharacteristic::PROPERTY_NOTIFY) c->addDescriptor(new BLE2902());
  if (props & BLECharacteristic::PROPERTY_WRITE) c->setCallbacks(new WriteCB());
  return c;
}

void bleBegin() {
  BLEDevice::init(DEVICE_NAME);
  BLEDevice::setMTU(185);                                   // the app requests 185 too
  BLEServer *srv = BLEDevice::createServer();
  srv->setCallbacks(new ServerCB());
  BLEService *svc = srv->createService(BLEUUID(UUID_SERVICE), 24);
  const uint32_t R = BLECharacteristic::PROPERTY_READ, W = BLECharacteristic::PROPERTY_WRITE, N = BLECharacteristic::PROPERTY_NOTIFY;
  chVol   = mkChar(svc, UUID_VOLUME, R | W | N);
  chPlay  = mkChar(svc, UUID_PLAY,   R | W | N);
  chTrack = mkChar(svc, UUID_TRACK,  R | N);
  chEq    = mkChar(svc, UUID_EQ,     R | W | N);
  chLink  = mkChar(svc, UUID_LINK,   R | N);
  chCfg   = mkChar(svc, UUID_CONFIG, W);
  chFind  = mkChar(svc, UUID_FIND,   W);
  chCall  = mkChar(svc, UUID_CALL,   R | N);
  uint8_t z = 0; chVol->setValue((uint8_t *)&gVolume, 1); chPlay->setValue(&z, 1); chEq->setValue(&z, 1); chLink->setValue(&z, 1); chCall->setValue(&z, 1); chTrack->setValue("");
  svc->start();
  BLEService *bas = srv->createService(BLEUUID((uint16_t)0x180F));   // standard Battery Service
  chBatt = bas->createCharacteristic(BLEUUID((uint16_t)0x2A19), R | N);
  chBatt->addDescriptor(new BLE2902());
  bas->start();
  BLEAdvertising *adv = BLEDevice::getAdvertising();
  adv->addServiceUUID(UUID_SERVICE);
  adv->setScanResponse(true);
  BLEDevice::startAdvertising();
}

// ---------------------------------------------------------------- touch
struct Pad { float base; bool down; uint32_t t0; };
Pad pads[6];

void calibrate() {
  for (int i = 0; i < 6; i++) {
    uint32_t sum = 0;
    for (int k = 0; k < BASELINE_N; k++) { sum += touchRead(TOUCH_PINS[i]); delay(2); }
    pads[i] = { sum / (float)BASELINE_N, false, 0 };
  }
}

struct Pod {            // gesture tracker per hinge pod
  int first = -1, last = -1; uint32_t tStart = 0, lockUntil = 0; bool active = false;
};
Pod pod[2];             // 0 = right, 1 = left

void onTap(int side) {                   // either pod
  if (gCall == CALL_INCOMING) { esp_hf_client_answer_call(); return; }
  if (gCall == CALL_ACTIVE || gCall == CALL_OUTGOING) { esp_hf_client_reject_call(); return; }   // AT+CHUP = hang up
  if (gPlaying) a2dp.pause(); else a2dp.play();                                                  // music: play / pause
}
void onLongPress(int side) {             // only meaningful while ringing
  if (gCall == CALL_INCOMING) esp_hf_client_reject_call();
}
void onSwipe(int side, int dir) {        // dir +1 = rear -> front (toward the lens)
  if (gInvertSwipe) dir = -dir;
  if (gCall != CALL_IDLE) {               // call volume, synced to the phone over HFP (+VGS)
    gCallVol = constrain((int)gCallVol + dir, 0, 15);
    esp_hf_client_volume_update(ESP_HF_VOLUME_CONTROL_TARGET_SPK, gCallVol);
    return;
  }
  setVolume(gVolume + dir * VOL_STEP);
}

void pollTouch() {
  const uint32_t now = millis();
  for (int s = 0; s < 2; s++) {
    Pod &p = pod[s];
    int touched = -1;
    for (int k = 0; k < 3; k++) {
      Pad &d = pads[s * 3 + k];
      float v = touchRead(TOUCH_PINS[s * 3 + k]);
      if (!d.down && v < d.base * (1.0f - TOUCH_TRIGGER)) { d.down = true; d.t0 = now; }
      else if (d.down && v > d.base * (1.0f - TOUCH_RELEASE)) d.down = false;
      if (!d.down) d.base += (v - d.base) / BASELINE_N;          // track drift only while untouched
      if (d.down && touched < 0) touched = k;
    }
    if (now < p.lockUntil) continue;
    if (touched >= 0) {
      if (!p.active) { p.active = true; p.first = p.last = touched; p.tStart = now; }
      else p.last = touched;
    } else if (p.active) {                                       // finger lifted: classify
      p.active = false;
      uint32_t dur = now - p.tStart;
      if (p.first != p.last && dur <= SWIPE_MAX_MS) { onSwipe(s, p.first > p.last ? +1 : -1); p.lockUntil = now + LOCKOUT_MS; }
      else if (dur >= TAP_MIN_MS && dur <= TAP_MAX_MS) { onTap(s); p.lockUntil = now + LOCKOUT_MS; }
      else if (p.first == p.last && dur >= LONG_PRESS_MS) { onLongPress(s); p.lockUntil = now + LOCKOUT_MS; }
    }
  }
}

// ---------------------------------------------------------------- HFP hands-free client (calls)
void onHfp(esp_hf_client_cb_event_t ev, esp_hf_client_cb_param_t *p) {
  switch (ev) {
    case ESP_HF_CLIENT_AUDIO_STATE_EVT:
      gScoUp = p->audio_stat.state == ESP_HF_CLIENT_AUDIO_STATE_CONNECTED || p->audio_stat.state == ESP_HF_CLIENT_AUDIO_STATE_CONNECTED_MSBC;
      gScoWide = p->audio_stat.state == ESP_HF_CLIENT_AUDIO_STATE_CONNECTED_MSBC;   // mSBC = 16 kHz, CVSD = 8 kHz
      gScoChanged = true;
      break;
    case ESP_HF_CLIENT_CIND_CALL_SETUP_EVT:
      if (p->call_setup.status == ESP_HF_CALL_SETUP_STATUS_INCOMING) gCall = CALL_INCOMING;
      else if (p->call_setup.status != ESP_HF_CALL_SETUP_STATUS_IDLE) gCall = CALL_OUTGOING;
      else if (gCall != CALL_ACTIVE) gCall = CALL_IDLE;
      gCallDirty = true; break;
    case ESP_HF_CLIENT_CIND_CALL_EVT:
      gCall = p->call.status == ESP_HF_CALL_STATUS_CALL_IN_PROGRESS ? CALL_ACTIVE : CALL_IDLE;
      gCallDirty = true; break;
    case ESP_HF_CLIENT_VOLUME_CONTROL_EVT:
      if (p->volume_control.type == ESP_HF_VOLUME_CONTROL_TARGET_SPK) gCallVol = p->volume_control.volume;
      break;
    case ESP_HF_CLIENT_CONNECTION_STATE_EVT:
      Serial.printf("HFP state %d, free heap %u\n", p->conn_stat.state, ESP.getFreeHeap());
      break;
    default: break;
  }
}
// Bluedroid's internal CVSD/mSBC codec hands us 16-bit mono PCM (8 or 16 kHz)
void hfpIncoming(const uint8_t *buf, uint32_t len) { if (rxRing) xRingbufferSend(rxRing, buf, len, 0); }
uint32_t hfpOutgoing(uint8_t *buf, uint32_t len) {
  if (!txRing) return 0;
  size_t got = 0; uint8_t *d = (uint8_t *)xRingbufferReceiveUpTo(txRing, &got, 0, len);
  if (!d) return 0;
  memcpy(buf, d, got); vRingbufferReturnItem(txRing, d);
  return got;
}
void hfpBegin() {
  esp_bt_cod_t cod = {};                                   // advertise as an audio hands-free device
  cod.major = ESP_BT_COD_MAJOR_DEV_AV; cod.minor = 0x02;
  cod.service = ESP_BT_COD_SRVC_AUDIO | ESP_BT_COD_SRVC_RENDERING | ESP_BT_COD_SRVC_TELEPHONY;
  esp_bt_gap_set_cod(cod, ESP_BT_INIT_COD);
  rxRing = xRingbufferCreate(4096, RINGBUF_TYPE_BYTEBUF);
  txRing = xRingbufferCreate(4096, RINGBUF_TYPE_BYTEBUF);
  esp_hf_client_register_callback(onHfp);
  esp_hf_client_init();
  esp_hf_client_register_data_callback(hfpIncoming, hfpOutgoing);
}

// I2S mode switch: music = TX 44.1 kHz 16-bit (A2DP -> EQ); call = full duplex 32 kHz 32-bit (mic needs 64 BCLK/frame)
void i2sMusicMode() {
  i2s.end();
  auto c = i2s.defaultConfig(TX_MODE);
  c.pin_bck = PIN_BCLK; c.pin_ws = PIN_LRC; c.pin_data = PIN_DIN;
  c.sample_rate = 44100; c.channels = 2; c.bits_per_sample = 16;
  i2s.begin(c); gAudioCallMode = false;
}
void i2sCallMode() {
  i2s.end();
  auto c = i2s.defaultConfig(RXTX_MODE);
  c.pin_bck = PIN_BCLK; c.pin_ws = PIN_LRC; c.pin_data = PIN_DIN; c.pin_data_rx = PIN_MIC;
  c.sample_rate = CALL_RATE; c.channels = 2; c.bits_per_sample = 32;
  i2s.begin(c); gAudioCallMode = true;
}

// call audio task: speakers <- rxRing (upsampled x2/x4), mic -> txRing (decimated /2 or /4), half-duplex ducking
void callAudioTask(void *) {
  static int32_t frame[2 * 64];             // 64 stereo 32-bit frames = 2 ms @ 32 kHz
  float duckHold = 0;
  for (;;) {
    if (!gAudioCallMode) { vTaskDelay(pdMS_TO_TICKS(10)); continue; }
    const int up = gScoWide ? 2 : 4;        // 16k -> 32k, 8k -> 32k
    const int nIn = 64 / up;
    // speakers
    int16_t v[32] = {0}; size_t got = 0;
    uint8_t *d = (uint8_t *)xRingbufferReceiveUpTo(rxRing, &got, 0, nIn * 2);
    if (d) { memcpy(v, d, got); vRingbufferReturnItem(rxRing, d); }
    float energy = 0; const float g = (gCallVol + 1) / 16.0f;
    for (int i = 0; i < nIn; i++) {
      energy += fabsf(v[i]);
      int16_t a = v[i], b = (i + 1 < nIn) ? v[i + 1] : v[i];
      for (int k = 0; k < up; k++) { int32_t s = (int32_t)((a + (b - a) * k / up) * g) << 16; frame[2 * (i * up + k)] = s; frame[2 * (i * up + k) + 1] = s; }
    }
    i2s.write((uint8_t *)frame, sizeof(frame));
    if (energy / nIn > 600) duckHold = 0.15f; else duckHold = fmaxf(0, duckHold - 0.002f);
    // mic (left slot, SPH0645: 18-bit data MSB-aligned in 32 bits)
    size_t n = i2s.readBytes((uint8_t *)frame, sizeof(frame));
    int16_t out[32]; const int frames = n / 8, dn = up; int m = 0;
    const float mg = MIC_GAIN * (duckHold > 0 ? DUCK_GAIN : 1.0f);
    for (int i = 0; i + dn <= frames && m < 32; i += dn) {
      int32_t acc = 0; for (int k = 0; k < dn; k++) acc += frame[2 * (i + k)] >> 14;
      out[m++] = (int16_t)constrain((int32_t)(acc / dn * mg), -32768, 32767);
    }
    if (m) { xRingbufferSend(txRing, out, m * 2, 0); esp_hf_client_outgoing_data_ready(); }
  }
}

// find-my-glasses chime: fixed level, ignores media volume and mute; only outside calls
void playChimeBurst() {
  static int16_t buf[2 * 441];               // 10 ms @ 44.1 kHz stereo
  static uint32_t ph = 0;
  const uint32_t t = millis() % 1000;
  const float f = t < 150 ? 1568.0f : (t < 300 ? 2093.0f : 0);   // G6 - C7 blip, then silence
  for (int i = 0; i < 441; i++) { int16_t s = f ? (int16_t)(12000 * sinf(2 * PI * f * (ph++) / 44100.0f)) : 0; buf[2 * i] = buf[2 * i + 1] = s; }
  i2s.write((uint8_t *)buf, sizeof(buf));
}

// ---------------------------------------------------------------- battery
uint8_t batteryPercent() {
  // GPIO15 is ADC2. ADC2 conflicts with Wi-Fi (unused here); retry a few times anyway.
  uint32_t mv = 0; int ok = 0;
  for (int i = 0; i < 8; i++) { int r = analogReadMilliVolts(PIN_VBAT); if (r > 0) { mv += r; ok++; } }
  if (!ok) return 0;
  float v = 2.0f * mv / ok / 1000.0f;                 // 100k/100k divider
  static const float V[] = {3.30f, 3.60f, 3.70f, 3.75f, 3.80f, 3.90f, 4.00f, 4.10f, 4.20f};
  static const uint8_t P[] = {0, 10, 25, 40, 50, 65, 80, 92, 100};
  if (v <= V[0]) return 0;
  for (int i = 1; i < 9; i++) if (v < V[i]) return P[i - 1] + (uint8_t)((v - V[i - 1]) / (V[i] - V[i - 1]) * (P[i] - P[i - 1]));
  return 100;
}

// ---------------------------------------------------------------- setup / loop
void setup() {
  Serial.begin(115200);
  analogSetPinAttenuation(PIN_VBAT, ADC_11db);

  auto cfg = i2s.defaultConfig(TX_MODE);
  cfg.pin_bck = PIN_BCLK; cfg.pin_ws = PIN_LRC; cfg.pin_data = PIN_DIN;
  cfg.sample_rate = 44100; cfg.channels = 2; cfg.bits_per_sample = 16;
  i2s.begin(cfg);

  eqCfg = eq.defaultConfig();
  eqCfg.channels = 2; eqCfg.bits_per_sample = 16; eqCfg.sample_rate = 44100;
  eqCfg.freq_low = 250; eqCfg.freq_high = 4000;
  prefs.begin("muse", false);
  gInvertSwipe = prefs.getBool("inv", false);
  applyEq(prefs.getUChar("eq", 0));

  a2dp.set_default_bt_mode(ESP_BT_MODE_BTDM);         // classic (A2DP) + BLE at the same time
  a2dp.set_on_connection_state_changed(onConnState);
  a2dp.set_on_audio_state_changed(onAudioState);
  a2dp.set_avrc_rn_playstatus_callback(onPlayStatus);
  a2dp.set_avrc_rn_volumechange(onRemoteVolume);
  a2dp.set_avrc_metadata_attribute_mask(ESP_AVRC_MD_ATTR_TITLE | ESP_AVRC_MD_ATTR_ARTIST);
  a2dp.set_avrc_metadata_callback(onMetadata);
  a2dp.set_volume(gVolume);
  a2dp.start(DEVICE_NAME, true);                      // auto-reconnect to the last phone

  hfpBegin();                                         // HFP client on the same Bluedroid instance as A2DP
  bleBegin();
  calibrate();
  xTaskCreatePinnedToCore(callAudioTask, "callAudio", 4096, nullptr, 10, nullptr, 1);
  uint8_t e = gEq; chEq->setValue(&e, 1);
  Serial.printf("Muse Glasses ready, free heap %u\n", ESP.getFreeHeap());
}

void loop() {
  pollTouch();

  if (gRecalibrate) { gRecalibrate = false; calibrate(); }
  if (gScoChanged) {                                  // SCO up/down: switch the I2S bus (phone suspends A2DP during calls)
    gScoChanged = false;
    if (gScoUp && !gAudioCallMode) { i2sCallMode(); Serial.printf("SCO %s, free heap %u\n", gScoWide ? "mSBC 16k" : "CVSD 8k", ESP.getFreeHeap()); }
    else if (!gScoUp && gAudioCallMode) { i2sMusicMode(); applyEq(gEq); }
  }
  if (gCallDirty) { gCallDirty = false; notifyU8(chCall, gCall); }
  if (gChimeUntil && !gAudioCallMode) {
    static bool paused = false;
    if (millis() < gChimeUntil) { if (gPlaying && !paused) { a2dp.pause(); paused = true; } playChimeBurst(); return; }
    gChimeUntil = 0; paused = false;
  }
  if (gVolDirty)  { gVolDirty = false;  notifyU8(chVol, gVolume); }
  if (gPlayDirty) { gPlayDirty = false; notifyU8(chPlay, gPlaying); }
  if (gLinkDirty) { gLinkDirty = false; notifyU8(chLink, gLink); }
  if (gTrackDirty) {
    gTrackDirty = false;
    char buf[181];
    portENTER_CRITICAL(&gMux);
    snprintf(buf, sizeof(buf), "%s\x1F%s", gTitle, gArtist);   // U+241F-style unit separator between title and artist
    portEXIT_CRITICAL(&gMux);
    chTrack->setValue((uint8_t *)buf, strlen(buf));
    if (bleClient) chTrack->notify();
  }

  static uint32_t tBatt = 0;
  if (millis() - tBatt > 5000 || tBatt == 0) {      // every 5 s
    tBatt = millis() | 1;
    uint8_t pct = batteryPercent();
    chBatt->setValue(&pct, 1);
    if (bleClient) chBatt->notify();
  }
  delay(10);
}
