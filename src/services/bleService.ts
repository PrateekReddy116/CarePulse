import { BleManager, Device, State } from 'react-native-ble-plx';
import { PermissionsAndroid, Platform, Alert } from 'react-native';

const ESP32_SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const ESP32_CHARACTERISTIC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';

class BLEService {
    private manager: BleManager | null = null;
    private connectedDevice: Device | null = null;

    constructor() {
        try {
            console.log('Initializing BleManager...');
            this.manager = new BleManager();
            console.log('BleManager initialized successfully');
        } catch (error) {
            console.error('Failed to initialize BleManager:', error);
            this.manager = null;
        }
    }

    private checkManager(): boolean {
        if (!this.manager) {
            console.error('BleManager not initialized');
            Alert.alert('BLE Error', 'Bluetooth manager is not available. Please restart the app.');
            return false;
        }
        return true;
    }

    async requestPermissions(): Promise<boolean> {
        if (Platform.OS === 'android') {
            if (Platform.Version >= 31) {
                // Android 12+
                const granted = await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                ]);

                return (
                    granted['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
                    granted['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
                    granted['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED
                );
            } else {
                // Android 11 and below
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
                );
                return granted === PermissionsAndroid.RESULTS.GRANTED;
            }
        }
        return true; // iOS handles permissions differently
    }

    async checkBluetoothState(): Promise<boolean> {
        if (!this.checkManager()) return false;
        
        const state = await this.manager!.state();
        if (state !== State.PoweredOn) {
            Alert.alert(
                'Bluetooth is Off',
                'Please enable Bluetooth to scan for devices.',
                [{ text: 'OK' }]
            );
            return false;
        }
        return true;
    }

    async scanForDevices(
        onDeviceFound: (device: Device) => void,
        durationMs: number = 10000
    ): Promise<void> {
        if (!this.checkManager()) return;
        
        const hasPermissions = await this.requestPermissions();
        if (!hasPermissions) {
            Alert.alert('Permissions Required', 'Bluetooth permissions are required to scan for devices.');
            return;
        }

        const isBluetoothOn = await this.checkBluetoothState();
        if (!isBluetoothOn) {
            return;
        }

        console.log('Starting BLE scan...');
        
        this.manager!.startDeviceScan(null, null, (error, device) => {
            if (error) {
                console.error('Scan error:', error);
                return;
            }

            if (device && device.name) {
                // Filter for ESP32 devices
                if (device.name.includes('ESP32') || device.name.includes('Sathi')) {
                    console.log('Found device:', device.name, device.id);
                    onDeviceFound(device);
                }
            }
        });

        // Stop scanning after duration
        setTimeout(() => {
            if (this.manager) {
                this.manager.stopDeviceScan();
                console.log('Scan stopped');
            }
        }, durationMs);
    }

    async connectToDevice(device: Device): Promise<boolean> {
        try {
            console.log('Connecting to device:', device.name);
            
            const connectedDevice = await device.connect();
            await connectedDevice.discoverAllServicesAndCharacteristics();
            
            this.connectedDevice = connectedDevice;
            console.log('Connected successfully to:', device.name);
            
            return true;
        } catch (error) {
            console.error('Connection error:', error);
            Alert.alert('Connection Failed', 'Could not connect to the device. Please try again.');
            return false;
        }
    }

    async disconnect(): Promise<void> {
        if (this.connectedDevice) {
            try {
                await this.connectedDevice.cancelConnection();
                this.connectedDevice = null;
                console.log('Disconnected successfully');
            } catch (error) {
                console.error('Disconnect error:', error);
            }
        }
    }

    async sendData(data: string): Promise<boolean> {
        if (!this.checkManager() || !this.connectedDevice) {
            console.error('No device connected or manager not available');
            return false;
        }

        try {
            // Convert string to base64 using btoa
            const base64Data = btoa(data);
            
            await this.connectedDevice.writeCharacteristicWithResponseForService(
                ESP32_SERVICE_UUID,
                ESP32_CHARACTERISTIC_UUID,
                base64Data
            );
            
            console.log('Data sent:', data);
            return true;
        } catch (error) {
            console.error('Send data error:', error);
            return false;
        }
    }

    async readData(): Promise<string | null> {
        if (!this.checkManager() || !this.connectedDevice) {
            console.error('No device connected or manager not available');
            return null;
        }

        try {
            const characteristic = await this.connectedDevice.readCharacteristicForService(
                ESP32_SERVICE_UUID,
                ESP32_CHARACTERISTIC_UUID
            );

            if (characteristic.value) {
                // Decode base64 to string using atob
                const data = atob(characteristic.value);
                console.log('Data received:', data);
                return data;
            }
            return null;
        } catch (error) {
            console.error('Read data error:', error);
            return null;
        }
    }

    monitorData(onDataReceived: (data: string) => void): void {
        if (!this.checkManager() || !this.connectedDevice) {
            console.error('No device connected or manager not available');
            return;
        }

        this.connectedDevice.monitorCharacteristicForService(
            ESP32_SERVICE_UUID,
            ESP32_CHARACTERISTIC_UUID,
            (error, characteristic) => {
                if (error) {
                    console.error('Monitor error:', error);
                    return;
                }

                if (characteristic?.value) {
                    try {
                        const data = atob(characteristic.value);
                        console.log('Monitored data:', data);
                        onDataReceived(data);
                    } catch (e) {
                        console.error('Error decoding data:', e);
                    }
                }
            }
        );
    }

    stopMonitoring(): void {
        // Monitoring stops automatically on disconnect
    }

    isConnected(): boolean {
        return this.connectedDevice !== null;
    }

    getConnectedDevice(): Device | null {
        return this.connectedDevice;
    }

    destroy(): void {
        if (this.manager) {
            this.manager.destroy();
        }
    }
}

export const bleService = new BLEService();
