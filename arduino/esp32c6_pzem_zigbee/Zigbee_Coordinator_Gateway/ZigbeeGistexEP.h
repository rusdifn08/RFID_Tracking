/**
 * ZigbeeGistexEP.h — Custom Cluster 0xFC10 untuk payload biner Gistex.
 * Compatible ESP32 Arduino core 3.3.x (esp-zigbee-lib custom_cluster_cmd).
 */
#pragma once

#include "Zigbee.h"
#include "zb_protocol.h"
#include <string.h>

#if !CONFIG_ZB_ENABLED
#error "Enable Zigbee in Tools menu (Zigbee ZCZR)"
#endif

typedef void (*GistexRxCb)(const uint8_t *data, uint16_t len, uint16_t src_short, uint8_t src_ep);

class ZigbeeGistexEP : public ZigbeeEP {
public:
  ZigbeeGistexEP(uint8_t endpoint = ZB_EP, bool as_server = true) : ZigbeeEP(endpoint), _rx(nullptr) {
    _device_id = (esp_zb_ha_standard_devices_t)0xFFF0;

    esp_zb_attribute_list_t *basic = esp_zb_zcl_attr_list_create(ESP_ZB_ZCL_CLUSTER_ID_BASIC);
    uint8_t zcl_ver = ESP_ZB_ZCL_BASIC_ZCL_VERSION_DEFAULT_VALUE;
    uint8_t power = ESP_ZB_ZCL_BASIC_POWER_SOURCE_DEFAULT_VALUE;
    esp_zb_basic_cluster_add_attr(basic, ESP_ZB_ZCL_ATTR_BASIC_ZCL_VERSION_ID, &zcl_ver);
    esp_zb_basic_cluster_add_attr(basic, ESP_ZB_ZCL_ATTR_BASIC_POWER_SOURCE_ID, &power);

    esp_zb_attribute_list_t *identify = esp_zb_zcl_attr_list_create(ESP_ZB_ZCL_CLUSTER_ID_IDENTIFY);
    uint16_t id_time = 0;
    esp_zb_identify_cluster_add_attr(identify, ESP_ZB_ZCL_ATTR_IDENTIFY_IDENTIFY_TIME_ID, &id_time);

    static uint8_t marker = 0;
    esp_zb_attribute_list_t *custom = esp_zb_zcl_attr_list_create(ZB_CLUSTER_ID);
    esp_zb_custom_cluster_add_custom_attr(custom, 0x0000, ESP_ZB_ZCL_ATTR_TYPE_U8,
                                          ESP_ZB_ZCL_ATTR_ACCESS_READ_WRITE, &marker);

    _cluster_list = esp_zb_zcl_cluster_list_create();
    esp_zb_cluster_list_add_basic_cluster(_cluster_list, basic, ESP_ZB_ZCL_CLUSTER_SERVER_ROLE);
    esp_zb_cluster_list_add_identify_cluster(_cluster_list, identify, ESP_ZB_ZCL_CLUSTER_SERVER_ROLE);

    // Server + client custom cluster (dua arah)
    esp_zb_cluster_list_add_custom_cluster(_cluster_list, custom, ESP_ZB_ZCL_CLUSTER_SERVER_ROLE);
    esp_zb_attribute_list_t *custom_cli = esp_zb_zcl_attr_list_create(ZB_CLUSTER_ID);
    esp_zb_custom_cluster_add_custom_attr(custom_cli, 0x0000, ESP_ZB_ZCL_ATTR_TYPE_U8,
                                          ESP_ZB_ZCL_ATTR_ACCESS_READ_WRITE, &marker);
    esp_zb_cluster_list_add_custom_cluster(_cluster_list, custom_cli, ESP_ZB_ZCL_CLUSTER_CLIENT_ROLE);
    (void)as_server;

    memset(&_ep_config, 0, sizeof(_ep_config));
    _ep_config.endpoint = _endpoint;
    _ep_config.app_profile_id = ESP_ZB_AF_HA_PROFILE_ID;
    _ep_config.app_device_id = (uint16_t)_device_id;
    _ep_config.app_device_version = 0;
  }

  void onGistexRx(GistexRxCb cb) { _rx = cb; }

  void zbCustomClusterCommand(const esp_zb_zcl_custom_cluster_command_message_t *message) override {
    if (!message || !_rx) return;
    if (message->info.cluster != ZB_CLUSTER_ID) return;
    if (!message->data.value || message->data.size == 0) return;
    uint16_t src = 0xFFFF;
    if (message->info.src_address.addr_type == ESP_ZB_ZCL_ADDR_TYPE_SHORT) {
      src = message->info.src_address.u.short_addr;
    }
    _rx((const uint8_t *)message->data.value, message->data.size, src, message->info.src_endpoint);
  }

  bool sendRaw(uint16_t dst_short, uint8_t dst_ep, const uint8_t *data, uint16_t len, bool to_server) {
    if (!data || len == 0 || len > 96) return false;

    esp_zb_zcl_custom_cluster_cmd_req_t req;
    memset(&req, 0, sizeof(req));
    req.zcl_basic_cmd.dst_addr_u.addr_short = dst_short;
    req.zcl_basic_cmd.dst_endpoint = dst_ep;
    req.zcl_basic_cmd.src_endpoint = _endpoint;
    req.address_mode = ESP_ZB_APS_ADDR_MODE_16_ENDP_PRESENT;
    req.profile_id = ESP_ZB_AF_HA_PROFILE_ID;
    req.cluster_id = ZB_CLUSTER_ID;
    req.direction = to_server ? ESP_ZB_ZCL_CMD_DIRECTION_TO_SRV : ESP_ZB_ZCL_CMD_DIRECTION_TO_CLI;
    req.custom_cmd_id = ZB_CMD_DATA;
    req.data.type = ESP_ZB_ZCL_ATTR_TYPE_SET;
    req.data.size = len;
    req.data.value = (void *)data;

    for (int attempt = 0; attempt < 4; attempt++) {
      if (!acquireCommandLock()) {
        delay(12);
        continue;
      }
      uint8_t err = esp_zb_zcl_custom_cluster_cmd_req(&req);
      releaseCommandLock();
      if (err == ESP_OK || err == 0) return true;
      delay(12);
    }
    return false;
  }

  bool sendToCoordinator(const uint8_t *data, uint16_t len) {
    return sendRaw(0x0000, ZB_EP, data, len, true);
  }

  bool sendToRouter(uint16_t short_addr, const uint8_t *data, uint16_t len) {
    return sendRaw(short_addr, ZB_EP, data, len, true);
  }

  bool broadcast(const uint8_t *data, uint16_t len) {
    return sendRaw(0xFFFF, ZB_EP, data, len, true);
  }

private:
  GistexRxCb _rx;
};
