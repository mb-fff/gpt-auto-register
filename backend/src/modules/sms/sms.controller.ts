import { Controller, Get, Logger, InternalServerErrorException } from '@nestjs/common';
import axios from 'axios';

@Controller('sms')
export class SmsController {
    private readonly logger = new Logger(SmsController.name);
    private readonly GRIZZLY_URL = 'https://api.grizzlysms.com/stubs/handler_api.php';
    private readonly COUNTRY_NAME_ZH: Record<string, string> = {
        Albania: '阿尔巴尼亚',
        'American Samoa': '美属萨摩亚',
        Anguilla: '安圭拉',
        'Antigua and Barbuda': '安提瓜和巴布达',
        Armenia: '亚美尼亚',
        Aruba: '阿鲁巴',
        Australia: '澳大利亚',
        Bahamas: '巴哈马',
        Bahrain: '巴林',
        Barbados: '巴巴多斯',
        Belize: '伯利兹',
        Benin: '贝宁',
        Bermuda: '百慕大',
        Bhutan: '不丹',
        'Bosnia and Herzegovina': '波黑',
        Botswana: '博茨瓦纳',
        'Brunei Darussalam': '文莱',
        'Burkina Faso': '布基纳法索',
        Burundi: '布隆迪',
        'Cape Verde': '佛得角',
        'Cayman islands': '开曼群岛',
        'Central African Republic': '中非共和国',
        Chile: '智利',
        Comoros: '科摩罗',
        Cuba: '古巴',
        Denmark: '丹麦',
        Djibouti: '吉布提',
        Dominica: '多米尼克',
        'Dominican Republic': '多米尼加共和国',
        Ecuador: '厄瓜多尔',
        'Equatorial Guinea': '赤道几内亚',
        Eritrea: '厄立特里亚',
        Finland: '芬兰',
        'French Guiana': '法属圭亚那',
        Gabon: '加蓬',
        Georgia: '格鲁吉亚',
        Gibraltar: '直布罗陀',
        Greece: '希腊',
        Grenada: '格林纳达',
        Guadeloupe: '瓜德罗普',
        'Guinea-Bissau': '几内亚比绍',
        Guyana: '圭亚那',
        Iceland: '冰岛',
        Jamaica: '牙买加',
        Jordan: '约旦',
        Kosovo: '科索沃',
        Kuwait: '科威特',
        Lebanon: '黎巴嫩',
        Lesotho: '莱索托',
        Liberia: '利比里亚',
        Libya: '利比亚',
        Liechtenstein: '列支敦士登',
        Luxembourg: '卢森堡',
        Macedonia: '北马其顿',
        Malawi: '马拉维',
        Maldives: '马尔代夫',
        Mauritania: '毛里塔尼亚',
        Mauritius: '毛里求斯',
        Monaco: '摩纳哥',
        Montenegro: '黑山',
        Montserrat: '蒙特塞拉特',
        Nambia: '纳米比亚',
        Namibia: '纳米比亚',
        'New Caledonia': '新喀里多尼亚',
        Niger: '尼日尔',
        Niue: '纽埃',
        Norway: '挪威',
        Oman: '阿曼',
        Palestine: '巴勒斯坦',
        Panama: '巴拿马',
        Portugal: '葡萄牙',
        Qatar: '卡塔尔',
        'Republic of the Congo': '刚果共和国',
        Reunion: '留尼汪',
        Rwanda: '卢旺达',
        'Saint Kitts and Nevis': '圣基茨和尼维斯',
        'Saint Lucia': '圣卢西亚',
        'Saint Vincent': '圣文森特',
        Salvador: '萨尔瓦多',
        Samoa: '萨摩亚',
        'Sao Tome and Principe': '圣多美和普林西比',
        Seychelles: '塞舌尔',
        'Sierra Leone': '塞拉利昂',
        'Sint Maarten': '荷属圣马丁',
        Slovakia: '斯洛伐克',
        Somalia: '索马里',
        Suriname: '苏里南',
        Swaziland: '斯威士兰',
        Switzerland: '瑞士',
        Syria: '叙利亚',
        Tajikistan: '塔吉克斯坦',
        Togo: '多哥',
        Tonga: '汤加',
        'Trinidad and Tobago': '特立尼达和多巴哥',
        Turkmenistan: '土库曼斯坦',
        Uruguay: '乌拉圭',
        Zambia: '赞比亚',
    };

    // 1. 获取余额接口
    @Get('balance')
    async getBalance() {
        try {
            const response = await axios.get(this.GRIZZLY_URL, {
                params: { api_key: process.env.GRIZZLY_API_KEY, action: 'getBalance' }
            });
            if (response.data.includes('ACCESS_BALANCE')) {
                return { balance: parseFloat(response.data.split(':')[1]) };
            }
            return { balance: 0 };
        } catch (error) {
            throw new InternalServerErrorException('无法获取余额');
        }
    }

    // 2. 获取 OpenAI (dr) 的各国家价格和库存
    @Get('prices')
    async getPrices() {
        try {
            const [priceResponse, countryResponse] = await Promise.all([
                axios.get(this.GRIZZLY_URL, {
                    params: { api_key: process.env.GRIZZLY_API_KEY, action: 'getPrices', service: 'dr' }
                }),
                axios.get(this.GRIZZLY_URL, {
                    params: { api_key: process.env.GRIZZLY_API_KEY, action: 'getCountries' }
                }),
            ]);

            const rawData = priceResponse.data || {};
            const countries = countryResponse.data || {};
            const result = [];

            for (const [countryCode, services] of Object.entries(rawData)) {
                const info = (services as any)?.dr;
                const count = Number(info?.count || 0);
                const price = Number(info?.price ?? info?.cost ?? 0);

                if (count > 0 && price > 0) {
                    result.push({
                        country: countryCode,
                        price,
                        count,
                        name: this.getCountryName(countryCode, countries)
                    });
                }
            }

            // 按价格从低到高排序
            return result.sort((a, b) => a.price - b.price);
        } catch (error) {
            throw new InternalServerErrorException('无法获取价格列表');
        }
    }

    private getCountryName(code: string, countries: Record<string, any>) {
        const country = countries?.[code];
        const name = country?.chn || country?.eng || country?.rus;
        return this.COUNTRY_NAME_ZH[name] || name || `未知国家 ${code}`;
    }
}
