// 📁 backend/src/utils/fingerprint.util.ts

export interface DeviceFingerprint {
    os: string;
    platform: string;
    screenSize: string;
    userAgent: string;
    timezone: string;
    hardwareConcurrency: number;
    deviceMemory: number;
    impersonate: string;
}

export function generateDeviceFingerprint(): DeviceFingerprint {
    const osConfigs = [
        // 👇 已经全部降级为稳定版 chrome110 或 safari15_3
        { os: 'Windows NT 10.0; Win64; x64', platform: 'Windows', impersonate: 'chrome110' },
        { os: 'Macintosh; Intel Mac OS X 10_15_7', platform: 'macOS', impersonate: 'chrome110' },
        { os: 'Macintosh; Intel Mac OS X 10_14_6', platform: 'macOS', impersonate: 'safari15_3' }
    ];

    const screens = ['1920x1080', '1440x900', '1366x768', '2560x1440'];
    const timezones = ['America/New_York', 'Europe/London', 'Asia/Tokyo', 'America/Los_Angeles'];

    const selectedOs = osConfigs[Math.floor(Math.random() * osConfigs.length)];
    const screen = screens[Math.floor(Math.random() * screens.length)];
    const timezone = timezones[Math.floor(Math.random() * timezones.length)];

    // 随机生成合理的硬件参数
    const cores = [4, 8, 12, 16][Math.floor(Math.random() * 4)];
    const memory = [8, 16, 32][Math.floor(Math.random() * 3)];

    return {
        os: selectedOs.os,
        platform: selectedOs.platform,
        screenSize: screen,
        userAgent: `Mozilla/5.0 (${selectedOs.os}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36`,
        timezone: timezone,
        hardwareConcurrency: cores,
        deviceMemory: memory,
        impersonate: selectedOs.impersonate
    };
}