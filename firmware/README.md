# Firmware Directory

## ⚠️ Legal Notice

This directory **does not** and **cannot** contain proprietary firmware files due to licensing restrictions. You must obtain these files yourself from legal sources.

## Required Files

Place the following firmware files in this directory before building:

1. **xhcifw.mem** - Renesas USB 3.0 controller firmware
   - Source: [Web Archive](https://web.archive.org/web/20240316231746if_/https://codeload.github.com/denisandroid/uPD72020x-Firmware/tar.gz/refs/tags/1.0.0) or AVM stock firmware
   - Target name: `xhcifw.mem`

2. **ath_tgt_fw1.fw** - Atheros WASP WiFi processor firmware
   - Source: Extract from AVM stock firmware
   - Target name: `ath_tgt_fw1.fw`

3. **ath9k-eeprom-ahb-18100000.wmac.bin** - WiFi calibration data (2.4GHz)
   - Source: Extract from running Lantiq OpenWrt system
   - Target name: `ath9k-eeprom-ahb-18100000.wmac.bin`

4. **cal-pci-0000:00:00.0.bin** - WiFi calibration data (5GHz)
   - Source: Extract from running Lantiq OpenWrt system
   - Target name: `cal-pci-0000:00:00.0.bin`

5. **lantiq-vrx200-b.bin** - Lantiq DSL firmware (optional)
   - Source: Extract `vr9-B-dsl.bin` from AVM stock firmware
   - Target name: `lantiq-vrx200-b.bin`
   - Note: Renamed from `vr9-B-dsl.bin` when extracted from AVM firmware

## Extraction Instructions

See the main [README.md](../README.md#extracting-required-firmware-files) for detailed step-by-step instructions on how to obtain and extract these firmware files.

## Directory Structure

After extraction, this directory should contain:

```
firmware/
├── README.md                              # This file
├── ath9k-eeprom-ahb-18100000.wmac.bin    # WiFi calibration (2.4GHz)
├── cal-pci-0000:00:00.0.bin              # WiFi calibration (5GHz)
├── ath_tgt_fw1.fw                        # WASP WiFi firmware
├── lantiq-vrx200-b.bin                   # Lantiq DSL firmware
└── xhcifw.mem                            # USB3 firmware
```

## Verification

Check if you have all required files:

```bash
ls -lh firmware/
```

Expected output (file sizes may vary slightly):
```
-rw-r--r-- 1 user user 1.1K  ath9k-eeprom-ahb-18100000.wmac.bin
-rw-r--r-- 1 user user 2.1K  cal-pci-0000:00:00.0.bin
-rw-r--r-- 1 user user  14K  ath_tgt_fw1.fw
-rw-r--r-- 1 user user 888K  lantiq-vrx200-b.bin
-rw-r--r-- 1 user user  13K  xhcifw.mem
```

## Notes

- These files are **device-specific** for the Fritz!Box 7490
- The `.gitignore` file prevents accidental commits of these proprietary files
- Never commit these files to a public repository
- Always obtain firmware from legal sources
