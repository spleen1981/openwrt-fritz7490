# OpenWrt for Fritz!Box 7490

Custom OpenWrt firmware build for the AVM Fritz!Box 7490 with WiFi support. This repository includes automated builds via GitHub Actions and supports both OpenWrt 24.10 and 25.12.4 versions.

## Overview

This build uses a dual-architecture approach:
- **Lantiq (XRX200)**: Main system that boots from NAND
- **ATH79 WASP**: Secondary processor loaded from RAM to handle WiFi radios (2.4GHz and 5GHz)

The build includes custom patches, pre-configured network settings, WiFi mesh support, and automated firmware extraction/integration.

## Features

- ✅ Full WiFi support (2.4GHz and 5GHz)
- ✅ 802.11r Fast Roaming (FT)
- ✅ 802.11k/v (RRM, BSS Transition)
- ✅ WiFi mesh support (802.11s with SAE encryption)
- ✅ Pre-configured network, firewall, and system settings
- ✅ Automated build pipeline (GitHub Actions + local via `act`)
- ✅ Support for OpenWrt 24.10 and 25.12.4

## Repository Structure

```
.
├── patches/                    # Custom patches for Fritz!Box 7490 support
│   ├── 0001-*.patch           # Lantiq port 5 configuration for WASP
│   ├── 0002-0004-*.patch      # AVM WASP kernel module
│   ├── 0005-*.patch           # ATH79 support for Fritz!Box 3490/5490/7490
│   ├── 0008-*.patch           # ath9k EEPROM extraction
│   ├── 0009-*.patch           # ath9k/ath10k calibration placeholders
│   └── 0010-0011-*.patch      # USB and WASP firmware placeholders
├── firmware/                   # Required firmware files (YOU MUST OBTAIN THESE)
│   ├── ath9k-eeprom-ahb-18100000.wmac.bin   # Extract from running Lantiq
│   ├── cal-pci-0000:00:00.0.bin             # Extract from running Lantiq
│   ├── ath_tgt_fw1.fw                       # Extract from AVM stock firmware
│   ├── lantiq-vrx200-b.bin                  # Extract from AVM stock firmware
│   └── xhcifw.mem                           # From WebArchive
├── files/                      # Custom configuration files
│   └── etc/
│       ├── rc.local.template  # Startup script for WASP initialization
│       ├── config/            # UCI configuration files
│       │   ├── network.template
│       │   ├── firewall
│       │   ├── dhcp
│       │   ├── ddns.template
│       │   ├── dropbear
│       │   ├── sqm
│       │   └── system
│       ├── dropbear/
│       │   └── authorized_keys.template
│       └── hotplug.d/iface/
│           └── 99-dslite-mtu
├── .config-lantiq             # Lantiq build configuration
├── .config-lantiq-24.10       # Lantiq config for OpenWrt 24.10
├── .config-lantiq-25.12.4     # Lantiq config for OpenWrt 25.12.4
├── .config-wasp               # WASP build configuration
├── .config-wasp-24.10         # WASP config for OpenWrt 24.10
├── .config-wasp-25.12.4       # WASP config for OpenWrt 25.12.4
├── .github/workflows/
│   └── build.yaml             # Automated build workflow
├── run-local.sh               # Local build using act (GitHub Actions locally)
└── secret-sync.sh             # Push secrets to GitHub repository
```

## Prerequisites

### Required Tools
- GNU/Linux, BSD, or macOS with case-sensitive filesystem
- Build tools: `gcc-6+`, `binutils`, `make 4.1+`, `python3.7+`, `perl`, `rsync`, `unzip`
- Git, `wget`, `curl`
- For local builds with `act`: [act](https://github.com/nektos/act) (GitHub Actions runner)

### Required Firmware Files

**⚠️ Legal Notice**: Due to licensing restrictions, proprietary firmware files cannot be distributed in this repository. You must obtain them yourself from AVM stock firmware or other legal sources.

You need the following firmware files:
- `xhcifw.mem` - Renesas USB 3.0 controller firmware
- `ath_tgt_fw1.fw` - Atheros target firmware for WiFi (WASP)
- `ath9k-eeprom-ahb-18100000.wmac.bin` - WiFi calibration data (extracted from running system)
- `cal-pci-0000:00:00.0.bin` - WiFi calibration data (extracted from running system)
- `lantiq-vrx200-b.bin` - DSL-Modem Firmware for Annex B

See the [Extracting Required Firmware Files](#extracting-required-firmware-files) section below for detailed instructions.

## Build Methods

### Method 1: GitHub Actions (Recommended)

1. **Fork this repository** and set up secrets:
   ```bash
   # Create .secrets directory with required files:
   # - SSH_PRIVATE_KEY: SSH key for deployment
   # - WIFI_PASSWORD: Your WiFi password
   # - WIFI_SSID: Your WiFi SSID
   # - MESH_PASSWORD: WiFi mesh password
   
   # Push secrets to GitHub
   ./secret-sync.sh
   ```

2. **Trigger the build**:
   - Go to Actions → "Build OpenWrt Fritz!Box 7490" → Run workflow
   - Select OpenWrt version (24.10 or 25.12.4)
   - Choose build options (clean build, update sources, build target)

3. **Download artifacts**:
   - Firmware images will be available as workflow artifacts
   - Both Lantiq and WASP images are built and integrated automatically

### Method 2: Local Build with act

Run GitHub Actions workflow locally using `act`:

```bash
# Syntax: ./run-local.sh [openwrt_version] [clean_build] [update_sources] [build_target]
# Defaults: 25.12.4, true, true, both

# Build both targets with defaults
./run-local.sh

# Build specific version
./run-local.sh 24.10

# Build only Lantiq target
./run-local.sh 25.12.4 true true lantiq

# Build only WASP target
./run-local.sh 25.12.4 false false wasp
```

**Note**: Edit `run-local.sh` and set the correct `HOMEDIR` and `REPO` variables for your environment.

### Method 3: Manual Build

If you prefer to build manually following the traditional OpenWrt workflow:

#### Step 1: Clone OpenWrt and Apply Patches

```bash
git clone https://git.openwrt.org/openwrt/openwrt.git
cd openwrt
git checkout v24.10.0  # or v25.12.4

# Apply patches
for patch in ../patches/*.patch; do
  git apply "$patch"
done

# Update feeds
./scripts/feeds update -a
./scripts/feeds install -a
```

#### Step 2: Build Lantiq Image

```bash
# Copy Lantiq configuration
cp ../.config-lantiq-24.10 .config  # or .config-lantiq-25.12.4

# Configure build
make menuconfig
# Target System: Lantiq
# Subtarget: XRX200
# Target Profile: AVM FRITZ!Box 7490 (Micron or Other NAND)

# Build
make -j$(nproc) defconfig download clean world
```

#### Step 3: Flash and Extract WiFi Calibration Data

1. Flash the Lantiq image to your Fritz!Box 7490
2. Boot the device and extract calibration files:
   ```bash
   scp root@192.168.1.1:/lib/firmware/ath9k-eeprom-ahb-18100000.wmac.bin firmware/
   scp root@192.168.1.1:/lib/firmware/ath10k/cal-pci-0000:00:00.0.bin firmware/
   ```

#### Step 4: Build WASP Image

```bash
# Copy WASP configuration
cp ../.config-wasp-24.10 .config  # or .config-wasp-25.12.4

# Configure build
make menuconfig
# Target System: Atheros ATH79
# Subtarget: Generic
# Target Profile: AVM FRITZ!Box 3490/5490/7490 WASP

# Build
make -j$(nproc) defconfig download clean world
```

#### Step 5: Integrate WASP into Lantiq

Copy the WASP initramfs image and rebuild Lantiq with it embedded:

```bash
# Copy WASP initramfs
cp bin/targets/ath79/generic/openwrt-ath79-generic-avm_fritz3490-wasp-initramfs-kernel.bin \
   ../firmware/wasp-image.bin

# Switch back to Lantiq config and rebuild
cp ../.config-lantiq-24.10 .config
make -j$(nproc) defconfig download clean world
```

#### Step 6: Configure Custom Files

Before the final build, customize template files in `files/etc/`:

```bash
# Replace placeholders in template files
cd files/etc
sed -i 's/__WIFI_SSID__/YourSSID/g' rc.local.template config/network.template
sed -i 's/__WIFI_PASSWORD__/YourPassword/g' rc.local.template
sed -i 's/__MESH_PASSWORD__/YourMeshPassword/g' rc.local.template

# Rename templates
mv rc.local.template rc.local
mv config/network.template config/network
mv config/ddns.template config/ddns
mv dropbear/authorized_keys.template dropbear/authorized_keys
```

## Extracting Required Firmware Files

**⚠️ Important**: Due to licensing restrictions, this repository cannot include proprietary firmware files. You must extract them yourself from legal sources.

### Overview

The Fritz!Box 7490 requires several proprietary firmware files for full functionality:

1. **USB3 Firmware** (`xhcifw.mem` / `renesas_usb_fw.mem`) - Renesas USB 3.0 controller
2. **WASP Firmware** (`ath_tgt_fw1.fw` / `netboot.fw`) - Atheros WiFi processor
3. **WiFi Calibration Data** - Device-specific calibration files for 2.4GHz and 5GHz radios

### Method 1: USB3 Firmware (xhcifw.mem)

#### Option A: Download from Archive (Recommended)

The Renesas USB3 firmware is available from Web Archive:

```bash
# Download archived version of denisandroid/uPD72020x-Firmware
wget https://web.archive.org/web/20240316231746if_/https://codeload.github.com/denisandroid/uPD72020x-Firmware/tar.gz/refs/tags/1.0.0 \
  -O uPD72020x-Firmware-1.0.0.tar.gz

# Extract
tar -xzf uPD72020x-Firmware-1.0.0.tar.gz

# Copy firmware file (UPDATE.mem version 2.0.2.6)
cp uPD72020x-Firmware-1.0.0/K2026090.mem firmware/xhcifw.mem

# Cleanup
rm -rf uPD72020x-Firmware-1.0.0 uPD72020x-Firmware-1.0.0.tar.gz
```

#### Option B: Extract from AVM Stock Firmware

If you prefer to extract from official AVM firmware:

1. Download AVM stock firmware from [AVM's FTP server](https://ftp.avm.de/fritzbox/fritzbox-7490/)
2. Extract the firmware image (see WASP extraction below for tools)
3. Copy `lib/firmware/xhcifw.mem` to your `firmware/` directory

### Method 2: WASP WiFi Firmware (ath_tgt_fw1.fw)

This firmware must be extracted from AVM stock firmware using specialized tools.

#### Step 1: Install Required Tools

**Option A: Using Freetz-NG (Recommended)**

```bash
# Clone Freetz-NG repository
git clone https://github.com/Freetz-NG/freetz-ng
cd freetz-ng

# Install prerequisites and build tools
tools/prerequisites make
make tools

# Copy the extraction tool
cp tools/unsquashfs4-avm-be ..
cd ..
```

**Option B: Pre-built Tool**

If available, you can use a pre-built `unsquashfs4-avm-be` binary compatible with your system.

#### Step 2: Download AVM Stock Firmware

```bash
# Example for Fritz.OS 7.57 (use latest available)
wget https://download.avm.de/fritzbox/fritzbox-7490/deutschland/fritz.os/FRITZ.Box_7490-07.57.image

# Or use FTP mirror
wget https://ftp.avm.de/fritzbox/fritzbox-7490/deutschland/fritz.os/FRITZ.Box_7490-07.57.image
```

Check [AVM's download page](https://avm.de/service/fritzbox/fritzbox-7490/uebersicht/download/) for the latest firmware version.

#### Step 3: Extract Firmware Files

```bash
# Extract filesystem.image from the main image
7z e -o. FRITZ.Box_7490-07.57.image ./var/tmp/filesystem.image

# Extract filesystem_core.squashfs from filesystem.image
./unsquashfs4-avm-be -d extracted filesystem.image -e filesystem_core.squashfs

# Extract ath_tgt_fw1.fw from filesystem_core.squashfs
./unsquashfs4-avm-be extracted/filesystem_core.squashfs -e lib/firmware/ath_tgt_fw1.fw

# Copy to firmware directory
cp squashfs-root/lib/firmware/ath_tgt_fw1.fw firmware/
```

#### Alternative: Single-line Extraction

```bash
./unsquashfs4-avm-be -d temp1 filesystem.image -e filesystem_core.squashfs && \
./unsquashfs4-avm-be temp1/filesystem_core.squashfs -e lib/firmware/ath_tgt_fw1.fw && \
cp squashfs-root/lib/firmware/ath_tgt_fw1.fw firmware/
```

### Method 3: WiFi Calibration Data

WiFi calibration data is **device-specific** and must be extracted from a running Lantiq OpenWrt system on your Fritz!Box 7490.

#### Step 1: Build and Flash Initial Lantiq Image

First, build and flash the Lantiq image **without** WiFi support (WASP not yet configured). This initial image allows you to extract the calibration data.

```bash
# Build Lantiq-only image
./run-local.sh 25.12.4 true true lantiq

# Flash to your Fritz!Box 7490 (see Flashing Instructions below)
```

#### Step 2: Boot and Extract Calibration Files

After flashing and booting into the Lantiq OpenWrt:

```bash
# Connect to the device (default IP: 192.168.1.1)
ssh root@192.168.1.1

# Check if calibration files exist
ls -la /lib/firmware/ath9k-eeprom-ahb-18100000.wmac.bin
ls -la /lib/firmware/ath10k/cal-pci-0000:00:00.0.bin
```

If the files exist, copy them to your build machine:

```bash
# From your build machine
scp root@192.168.1.1:/lib/firmware/ath9k-eeprom-ahb-18100000.wmac.bin firmware/
scp root@192.168.1.1:/lib/firmware/ath10k/cal-pci-0000:00:00.0.bin firmware/
```

**Note**: These calibration files are generated by the Lantiq OpenWrt patches included in this repository. They are extracted from the hardware EEPROM on first boot.

### Method 4: Lantiq DSL Firmware (lantiq-vrx200-b.bin)

This firmware is typically included in OpenWrt's firmware feed and should be automatically downloaded during the build process. 

#### Option A: OpenWrt Repository (Recommended)

```bash
# Download from OpenWrt firmware repository
wget https://git.openwrt.org/?p=openwrt/openwrt.git;a=blob_plain;f=target/linux/lantiq/files/firmware/lantiq-vrx200-b.bin;hb=HEAD \
  -O firmware/lantiq-vrx200-b.bin
```

#### Option B: Extract from AVM Stock Firmware

If you need the exact firmware version from AVM:

```bash
# Download AVM firmware (example version 07.62)
wget https://download.avm.de/fritzbox/fritzbox-7490/deutschland/fritz.os/FRITZ.Box_7490-07.62.image

# Extract filesystem.image from the main image
7z e FRITZ.Box_7490-07.62.image -r filesystem.image

# Extract filesystem_core.squashfs
~/freetz-ng/tools/unsquashfs4-avm-be filesystem.image -e filesystem_core.squashfs

# Change to extracted directory
cd squashfs-root

# Extract DSL firmware module
~/freetz-ng/tools/unsquashfs4-avm-be filesystem_core.squashfs -e lib/modules/dsp_vr9/

# Navigate to DSL module directory
cd squashfs-root/lib/modules/dsp_vr9/

# Verify firmware version (optional)
strings vr9-B-dsl.bin | grep "@(#)"

# Copy to firmware directory
cp vr9-B-dsl.bin ~/firmware/lantiq-vrx200-b.bin

# Cleanup (optional)
cd ~
rm -rf squashfs-root FRITZ.Box_7490-07.62.image filesystem.image
```

**Note**: The file is named `vr9-B-dsl.bin` in the AVM firmware but should be renamed to `lantiq-vrx200-b.bin` for OpenWrt.

### Firmware Directory Structure

After extraction, your `firmware/` directory should contain:

```
firmware/
├── ath9k-eeprom-ahb-18100000.wmac.bin    # From running Lantiq system
├── ath_tgt_fw1.fw                        # From AVM stock firmware
├── cal-pci-0000:00:00.0.bin              # From running Lantiq system
├── lantiq-vrx200-b.bin                   # From AVM stock firmware
└── xhcifw.mem                            # From WebArchive
```

### Integrating Firmware into Build

Once you have all firmware files in the `firmware/` directory:

1. **For automated builds** (GitHub Actions / act):
   - The workflow automatically copies firmware files from `firmware/` to the appropriate locations in the OpenWrt build tree
   - No manual intervention needed

2. **For manual builds**:
   ```bash
   # Copy to OpenWrt build tree before building
   cd openwrt
   
   # USB firmware
   mkdir -p target/linux/lantiq/xrx200/base-files/lib/firmware/
   cp ../firmware/xhcifw.mem \
     target/linux/lantiq/xrx200/base-files/lib/firmware/renesas_usb_fw.mem
   
   # WASP firmware
   cp ../firmware/ath_tgt_fw1.fw \
     target/linux/lantiq/xrx200/base-files/lib/firmware/netboot.fw
   
   # WiFi calibration (for WASP build)
   mkdir -p target/linux/ath79/generic/base-files/lib/firmware/ath10k/
   cp ../firmware/ath9k-eeprom-ahb-18100000.wmac.bin \
     target/linux/ath79/generic/base-files/lib/firmware/
   cp ../firmware/cal-pci-0000:00:00.0.bin \
     target/linux/ath79/generic/base-files/lib/firmware/ath10k/
   ```

### Troubleshooting Firmware Extraction

#### unsquashfs4-avm-be: Command not found

Install dependencies for building Freetz-NG tools:
```bash
sudo apt-get update
sudo apt-get install build-essential git wget curl bzip2 \
  libtool automake autoconf m4 pkg-config
```

#### 7z: Command not found

Install p7zip:
```bash
# Debian/Ubuntu
sudo apt-get install p7zip-full

# macOS
brew install p7zip
```

#### Firmware extraction fails

- Ensure you're using the correct AVM firmware version for Fritz!Box 7490
- Try a different firmware version (older versions may use different squashfs formats)
- Check that `unsquashfs4-avm-be` is executable: `chmod +x unsquashfs4-avm-be`

### References

- [OpenWrt PR #5075 - Fritz!Box 7490 Support](https://github.com/openwrt/openwrt/pull/5075)
- [Freetz-NG Project](https://github.com/Freetz-NG/freetz-ng)
- [AVM Firmware Downloads](https://avm.de/service/fritzbox/fritzbox-7490/uebersicht/download/)
- [Renesas USB Firmware (Web Archive)](https://web.archive.org/web/20240316231746if_/https://codeload.github.com/denisandroid/uPD72020x-Firmware/tar.gz/refs/tags/1.0.0)

## Flashing Instructions

### Initial Flash (from AVM Stock Firmware)

1. Download your Fritz!Box 7490 to AVM stock firmware
2. Use the AVM recovery mode or web interface to flash the Lantiq image
3. The WASP WiFi processor will be initialized automatically on boot

### Upgrading from Previous OpenWrt

```bash
scp openwrt-lantiq-xrx200-avm_fritz7490-squashfs-sysupgrade.bin root@192.168.1.1:/tmp/
ssh root@192.168.1.1 'sysupgrade /tmp/openwrt-lantiq-xrx200-avm_fritz7490-squashfs-sysupgrade.bin'
```

## Configuration

### Network Setup

Default configuration (defined in `files/etc/config/network.template`):
- **LAN**: 192.168.1.1/24
- **WASP**: 192.168.1.2 (WiFi processor, connected to main system)
- **WAN**: DHCP (configurable for PPPoE, DS-Lite, etc.)

### WiFi Configuration

WiFi is automatically configured via `rc.local` script on boot:
- **5GHz (radio0)**: Channel 44, HT40, 802.11ac
  - AP mode with your SSID
  - Mesh mode (802.11s) for multi-AP setups
- **2.4GHz (radio1)**: Channel 1, HT40, 802.11n
  - AP mode with your SSID

Both radios support:
- Fast Roaming (802.11r)
- RRM (802.11k)
- BSS Transition (802.11v)
- Protected Management Frames (802.11w)
- WPS push button

### Customizing WiFi Settings

Edit `files/etc/rc.local.template` before building, or modify directly on the device:

```bash
ssh root@192.168.1.1
vi /etc/rc.local
# Make changes, then:
/etc/rc.local  # Re-run the configuration script
```

## Troubleshooting

### WASP Not Starting

Check if the WASP module is loaded:
```bash
lsmod | grep avm_wasp
dmesg | grep -i wasp
```

Manually reload:
```bash
rmmod avm_wasp
modprobe avm_wasp
```

### WiFi Not Working

Check WASP connectivity:
```bash
ping 192.168.1.2
ssh root@192.168.1.2
# On WASP:
wifi status
logread | grep -i wifi
```

Re-run WiFi configuration:
```bash
/etc/rc.local
```

### Build Failures

Check for:
- Sufficient disk space (30GB+ recommended)
- All dependencies installed
- Correct patch order and conflicts

Clean build:
```bash
make clean
rm -rf tmp/
make -j$(nproc) defconfig download world
```

## Advanced Configuration

### Custom Packages

Edit `.config-lantiq` or `.config-wasp` files to add packages:
```bash
make menuconfig
# Navigate to desired packages
# Save configuration
cp .config .config-lantiq-25.12.4  # or appropriate config file
```

### Network Customization

Modify `files/etc/config/network.template`:
- Change LAN IP range
- Configure VLANs
- Set up additional interfaces

### Firewall Rules

Edit `files/etc/config/firewall` to add custom rules.

### SQM QoS

The build includes SQM (Smart Queue Management) for bufferbloat control. Configure via:
```bash
ssh root@192.168.1.1
vi /etc/config/sqm
# Or via LuCI: Network → SQM QoS
```

## Credits

This build is based on work by:
- [Zappception/openwrt](https://github.com/Zappception/openwrt)
- kestrel1974, jschwartzenberg, timocapa for Fritz!Box 7490 patches and WASP support
- OpenWrt community

## Resources

- [OpenWrt Documentation](https://openwrt.org/docs)
- [OpenWrt Forum](https://forum.openwrt.org)
- [Fritz!Box 7490 Device Page](https://openwrt.org/toh/avm/avm_fritz_box_7490)
- [Bug Reports](https://bugs.openwrt.org)

## License

This project inherits licenses from OpenWrt (GPL-2.0) and included components. See individual files for specific license information.

---

**⚠️ Disclaimer**: Flashing custom firmware may void your warranty and carries risk. Proceed at your own risk. Always have a backup plan to recover your device.
