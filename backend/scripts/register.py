# backend/scripts/register.py
import base64
import hashlib
import json
import random
import secrets
import string
import time
import uuid
import sys
from datetime import datetime, timezone
from urllib.parse import parse_qs, urlencode, urlparse
from typing import Any, Optional, Tuple, Dict

import requests
import urllib3
# 🚀 核心黑科技库
from curl_cffi import requests as curl_requests

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# --- 全局常量配置 ---
auth_base = "https://auth.openai.com"
platform_base = "https://platform.openai.com"
# 💡 核心修改 1：使用你抓包得到的最新 Codex OAuth Client ID
platform_oauth_client_id = "app_EMoamEEZ73f0CkXaXp7hrann"
# 回调地址也需要保持一致（后端虽然配的是 auth/callback，这里最好与抓包一致或者用默认的）
platform_oauth_redirect_uri = "http://localhost:1455/auth/callback" 
platform_oauth_audience = "https://api.openai.com/v1"
platform_auth0_client = "eyJuYW1lIjoiYXV0aDAtc3BhLWpzIiwidmVyc2lvbiI6IjEuMjEuMCJ9"

# 默认全局变量（将在实例化时被指纹覆盖）
user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
screen_size = "1920x1080"
sec_ch_ua = '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"'
sec_ch_ua_full_version_list = '"Not_A Brand";v="8.0.0.0", "Chromium";v="120.0.6099.109", "Google Chrome";v="120.0.6099.109"'
default_timeout = 30

class GrizzlySMSProvider:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.grizzlysms.com/stubs/handler_api.php"

    def get_balance(self) -> float:
        params = {"api_key": self.api_key, "action": "getBalance"}
        try:
            res = requests.get(self.base_url, params=params, timeout=10)
            if res.text.startswith("ACCESS_BALANCE"):
                return float(res.text.split(":")[1])
            return 0.0
        except Exception:
            return 0.0

    def get_number(self, service="dr", country="6") -> Tuple[str, str]:
        params = {"api_key": self.api_key, "action": "getNumber", "service": service, "country": country}
        res = requests.get(self.base_url, params=params, timeout=15)
        if res.text.startswith("ACCESS_NUMBER"):
            _, order_id, number = res.text.split(":")
            return order_id, number
        
        error_msg = res.text
        if "NO_NUMBERS" in res.text: error_msg = "该国家暂时无号 (NO_NUMBERS)"
        elif "NO_BALANCE" in res.text: error_msg = "余额不足 (NO_BALANCE)"
        elif "BAD_KEY" in res.text: error_msg = "API_KEY 错误 (BAD_KEY)"
        
        raise RuntimeError(f"GrizzlySMS 购买号码失败: {error_msg}")

    def wait_for_sms(self, order_id: str, timeout=180) -> Optional[str]:
        start_time = time.time()
        params = {"api_key": self.api_key, "action": "getStatus", "id": order_id}
        while time.time() - start_time < timeout:
            try:
                res = requests.get(self.base_url, params=params, timeout=10)
                if res.text.startswith("STATUS_OK"):
                    return res.text.split(":")[1]
                elif "STATUS_CANCEL" in res.text:
                    return None
            except Exception:
                pass
            time.sleep(5)
        return None

    def set_status(self, order_id: str, status: int):
        params = {"api_key": self.api_key, "action": "setStatus", "status": status, "id": order_id}
        try: requests.get(self.base_url, params=params, timeout=10)
        except Exception: pass

common_headers = {
    "accept": "application/json",
    "accept-language": "en-US,en;q=0.9",
    "content-type": "application/json",
    "origin": auth_base,
    "priority": "u=1, i",
    "user-agent": user_agent,
    "sec-ch-ua": sec_ch_ua,
    "sec-ch-ua-arch": '"x86_64"',
    "sec-ch-ua-bitness": '"64"',
    "sec-ch-ua-full-version-list": sec_ch_ua_full_version_list,
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-model": '""',
    "sec-ch-ua-platform": '"Windows"',
    "sec-ch-ua-platform-version": '"10.0.0"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
}

navigate_headers = {
    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "accept-language": "en-US,en;q=0.9",
    "user-agent": user_agent,
    "sec-ch-ua": sec_ch_ua,
    "sec-ch-ua-arch": '"x86_64"',
    "sec-ch-ua-bitness": '"64"',
    "sec-ch-ua-full-version-list": sec_ch_ua_full_version_list,
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-model": '""',
    "sec-ch-ua-platform": '"Windows"',
    "sec-ch-ua-platform-version": '"10.0.0"',
    "sec-fetch-dest": "document",
    "sec-fetch-mode": "navigate",
    "sec-fetch-site": "same-origin",
    "sec-fetch-user": "?1",
    "upgrade-insecure-requests": "1",
}

def step(index: int, text: str, color: str = ""):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] [Worker-{index}] {text}", file=sys.stderr, flush=True)

def _make_trace_headers() -> Dict[str, str]:
    trace_id = str(random.getrandbits(64))
    parent_id = str(random.getrandbits(64))
    return {
        "traceparent": f"00-{uuid.uuid4().hex}-{format(int(parent_id), '016x')}-01",
        "tracestate": "dd=s:1;o:rum",
        "x-datadog-origin": "rum",
        "x-datadog-parent-id": parent_id,
        "x-datadog-sampling-priority": "1",
        "x-datadog-trace-id": trace_id,
    }

def _generate_pkce() -> Tuple[str, str]:
    code_verifier = base64.urlsafe_b64encode(secrets.token_bytes(64)).rstrip(b"=").decode("ascii")
    code_challenge = base64.urlsafe_b64encode(hashlib.sha256(code_verifier.encode("ascii")).digest()).rstrip(b"=").decode("ascii")
    return code_verifier, code_challenge

def _random_password(length: int = 16) -> str:
    chars = string.ascii_letters + string.digits + "!@#$%"
    value = list(secrets.choice(string.ascii_uppercase) + secrets.choice(string.ascii_lowercase) + secrets.choice(string.digits) + secrets.choice("!@#$%") + "".join(secrets.choice(chars) for _ in range(max(0, length - 4))))
    random.shuffle(value)
    return "".join(value)

def _random_name() -> Tuple[str, str]:
    return random.choice(["James", "Robert", "John", "Michael", "David", "Mary", "Emma", "Olivia"]), random.choice(["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller"])

def _random_birthdate() -> str:
    return f"{random.randint(1996, 2006):04d}-{random.randint(1, 12):02d}-{random.randint(1, 28):02d}"

def _response_json(resp) -> dict:
    try: return resp.json() if isinstance(resp.json(), dict) else {}
    except Exception: return {}

class SentinelTokenGenerator:
    MAX_ATTEMPTS = 500000
    ERROR_PREFIX = "wQ8Lk5FbGpA2NcR9dShT6gYjU7VxZ4D"
    
    def __init__(self, device_id: str, ua: str, screen: str = "1920x1080"):
        self.device_id = device_id
        self.user_agent = ua
        self.screen = screen
        self.sid = str(uuid.uuid4())

    def _fnv1a_32(self, text: str) -> str:
        h = 2166136261
        for ch in text:
            h ^= ord(ch)
            h = (h * 16777619) & 0xFFFFFFFF
        return format(h & 0xFFFFFFFF, "08x")

    def _get_config(self) -> list:
        perf_now = random.uniform(1000, 50000)
        return [self.screen, time.strftime("%a %b %d %Y %H:%M:%S GMT+0000 (Coordinated Universal Time)", time.gmtime()), 4294705152, random.random(), self.user_agent, "https://sentinel.openai.com/sentinel/20260124ceb8/sdk.js", None, None, "en-US", random.random(), random.choice(["vendorSub-undefined", "plugins-undefined"]), random.choice(["location", "implementation"]), random.choice(["Object", "Function"]), perf_now, self.sid, "", random.choice([4, 8, 12]), time.time() * 1000 - perf_now]

    def _b64(self, data) -> str:
        return base64.b64encode(json.dumps(data, separators=(",", ":"), ensure_ascii=False).encode("utf-8")).decode("ascii")

    def generate_requirements_token(self) -> str:
        data = self._get_config()
        data[3] = 1
        data[9] = round(random.uniform(5, 50))
        return "gAAAAAC" + self._b64(data)

    def generate_token(self, seed: str, difficulty: str) -> str:
        start = time.time()
        data = self._get_config()
        difficulty = str(difficulty or "0")
        for i in range(self.MAX_ATTEMPTS):
            data[3] = i
            data[9] = round((time.time() - start) * 1000)
            payload = self._b64(data)
            if self._fnv1a_32(seed + payload)[: len(difficulty)] <= difficulty:
                return "gAAAAAB" + payload + "~S"
        return "gAAAAAB" + self.ERROR_PREFIX + self._b64(str(None))

def create_session(proxy: str = "", impersonate_target: str = "chrome110") -> Any:
    session = curl_requests.Session(impersonate=impersonate_target)
    if proxy: 
        session.proxies = {"http": proxy, "https": proxy}
    return session

def request_with_local_retry(session: Any, method: str, url: str, retry_attempts: int = 3, **kwargs) -> Tuple[Optional[Any], str]:
    last_error = ""
    if "timeout" not in kwargs:
        kwargs["timeout"] = default_timeout
        
    for _ in range(max(1, retry_attempts)):
        try: 
            return session.request(method.upper(), url, **kwargs), ""
        except Exception as error: 
            last_error = str(error)
            time.sleep(1)
    return None, last_error

def build_sentinel_token(session: Any, device_id: str, flow: str) -> str:
    generator = SentinelTokenGenerator(device_id, user_agent, screen_size)
    
    resp, err = request_with_local_retry(
        session, "post", "https://sentinel.openai.com/backend-api/sentinel/req",
        data=json.dumps({"p": generator.generate_requirements_token(), "id": device_id, "flow": flow}),
        headers={"Content-Type": "text/plain;charset=UTF-8", "Origin": "https://sentinel.openai.com", "User-Agent": user_agent},
        timeout=20, verify=False
    )
    
    if resp is None: 
        raise RuntimeError(f"Sentinel 网络请求被阻断或超时: {err}")
    
    data = _response_json(resp)
    token = str(data.get("token") or "").strip()
    if resp.status_code != 200 or not token: 
        raise RuntimeError(f"sentinel_req_failed_{resp.status_code}")
    pow_data = data.get("proofofwork") or {}
    p_value = generator.generate_token(str(pow_data.get("seed") or ""), str(pow_data.get("difficulty") or "0")) if pow_data.get("required") and pow_data.get("seed") else generator.generate_requirements_token()
    return json.dumps({"p": p_value, "t": "", "c": token, "id": device_id, "flow": flow}, separators=(",", ":"))

def validate_otp(session: Any, device_id: str, code: str):
    headers = dict(common_headers)
    headers["referer"] = f"{auth_base}/email-verification"
    headers["oai-device-id"] = device_id
    headers.update(_make_trace_headers())
    resp, error = request_with_local_retry(session, "post", f"{auth_base}/api/accounts/email-otp/validate", json={"code": code}, headers=headers, verify=False)
    if resp is not None and resp.status_code == 200: return resp, ""
    headers["openai-sentinel-token"] = build_sentinel_token(session, device_id, "authorize_continue")
    resp, error = request_with_local_retry(session, "post", f"{auth_base}/api/accounts/email-otp/validate", json={"code": code}, headers=headers, verify=False)
    return resp, error

def extract_oauth_callback_params_from_url(url: str) -> Optional[Dict[str, str]]:
    if not url: return None
    try: params = parse_qs(urlparse(url).query)
    except Exception: return None
    code = str((params.get("code") or [""])[0]).strip()
    if not code: return None
    return {"code": code, "state": str((params.get("state") or [""])[0]).strip()}

class PlatformRegistrar:
    def __init__(self, proxy: str = "", email: str = "", grizzly_key: str = "", country: str = "6", fingerprint: dict = None) -> None:
        global user_agent, screen_size, common_headers, navigate_headers

        self.proxy = proxy
        self.email = email
        self.country = country
        self.device_id = str(uuid.uuid4())
        self.sms_provider = GrizzlySMSProvider(grizzly_key) if grizzly_key else None
        
        self.fingerprint = fingerprint or {}
        self.impersonate_target = self.fingerprint.get("impersonate", "chrome110")
        
        if self.fingerprint:
            new_ua = self.fingerprint.get("userAgent", user_agent)
            new_platform = self.fingerprint.get("platform", "Windows")
            new_screen = self.fingerprint.get("screenSize", screen_size)
            
            user_agent = new_ua
            screen_size = new_screen
            
            common_headers["user-agent"] = new_ua
            navigate_headers["user-agent"] = new_ua
            common_headers["sec-ch-ua-platform"] = f'"{new_platform}"'
            navigate_headers["sec-ch-ua-platform"] = f'"{new_platform}"'
            
            if new_platform == "macOS":
                common_headers["sec-ch-ua-platform-version"] = '""'
                navigate_headers["sec-ch-ua-platform-version"] = '""'
                
        self.session = create_session(self.proxy, self.impersonate_target)

    def close(self) -> None:
        self.session.close()

    def _get_ipc_otp(self) -> str:
        print("WAITING_FOR_OTP", flush=True)
        code = sys.stdin.readline().strip()
        if not code: raise RuntimeError("未从 Node.js 接收到验证码")
        return code

    def register(self, index: int) -> dict:
        email = self.email
        step(index, f"使用 Node 传入的邮箱启动: {email}")
        password = _random_password()
        first_name, last_name = _random_name()

        # 💡 1. Authorize (使用最新抓包的 Codex 专用参数)
        step(index, "初始化 OAuth 会话...")
        self.session.cookies.set("oai-did", self.device_id, domain=".auth.openai.com")
        code_verifier, code_challenge = _generate_pkce()
        params = {
            "client_id": platform_oauth_client_id,
            "audience": platform_oauth_audience,
            "redirect_uri": platform_oauth_redirect_uri,
            "device_id": self.device_id,
            "screen_hint": "login_or_signup",
            "max_age": "0",
            "login_hint": email,
            "scope": "openid profile email offline_access",
            "response_type": "code",
            "response_mode": "query",
            "state": secrets.token_urlsafe(32),
            "nonce": secrets.token_urlsafe(32),
            "code_challenge": code_challenge,
            "code_challenge_method": "S256",
            "auth0Client": platform_auth0_client,
            "codex_cli_simplified_flow": "true", # 👈 新增
            "id_token_add_organizations": "true" # 👈 新增
        }
        resp, _ = request_with_local_retry(self.session, "get", f"{auth_base}/oauth/authorize?{urlencode(params)}", headers=navigate_headers, allow_redirects=True)

        # 2. Register User & 3. Send OTP
        step(index, "提交注册信息...")
        headers = dict(common_headers); headers["oai-device-id"] = self.device_id
        headers["openai-sentinel-token"] = build_sentinel_token(self.session, self.device_id, "username_password_create")
        request_with_local_retry(self.session, "post", f"{auth_base}/api/accounts/user/register", json={"username": email, "password": password}, headers=headers)
        request_with_local_retry(self.session, "get", f"{auth_base}/api/accounts/email-otp/send", headers=navigate_headers)

        # 4. Wait Email OTP
        code = self._get_ipc_otp()
        validate_otp(self.session, self.device_id, code)

        # 5. Create Profile (注册白号完成)
        step(index, "完善身份信息 (白号注册完成)...")
        headers = dict(common_headers); headers["oai-device-id"] = self.device_id
        headers["openai-sentinel-token"] = build_sentinel_token(self.session, self.device_id, "oauth_create_account")
        resp, _ = request_with_local_retry(self.session, "post", f"{auth_base}/api/accounts/create_account", json={"name": f"{first_name} {last_name}", "birthdate": _random_birthdate()}, headers=headers)

        # 💡 6. 最新的 Codex 手机接码验证 (add-phone 流程)
        if self.sms_provider:
            balance = self.sms_provider.get_balance()
            step(index, f"💰 GrizzlySMS 当前余额: {balance} 卢布")
            
            step(index, f"开始请求 GrizzlySMS 购买手机号 (请求国家代码: {self.country})...")
            order_id, phone_number = self.sms_provider.get_number(service="dr", country=self.country)
            step(index, f"✅ 获取号码成功: {phone_number}, 订单ID: {order_id}")

            sms_headers = dict(common_headers); sms_headers["oai-device-id"] = self.device_id
            
            # (A) 发送手机验证码 (调用最新的 add-phone/send 接口)
            step(index, "正在调用最新的 add-phone 接口...")
            sms_headers["openai-sentinel-token"] = build_sentinel_token(self.session, self.device_id, "phone_verification_send")
            phone_payload = {"phone_number": f"+{phone_number}", "channel": "sms"}
            
            resp, err = request_with_local_retry(self.session, "post", f"{auth_base}/api/accounts/add-phone/send", json=phone_payload, headers=sms_headers, retry_attempts=1, timeout=10)
            
            if resp is None or resp.status_code != 200:
                self.sms_provider.set_status(order_id, 8) # 退款
                raise RuntimeError(f"OpenAI 拒绝发送短信: HTTP {getattr(resp, 'status_code', 'Network Error')}")

            # (B) 等待验证码
            step(index, "⏳ 等待 GrizzlySMS 获取验证码...")
            sms_code = self.sms_provider.wait_for_sms(order_id)
            if not sms_code:
                self.sms_provider.set_status(order_id, 8) 
                raise RuntimeError("GrizzlySMS 接收短信验证码超时，已退款")

            # (C) 验证手机验证码 (调用最新的 phone-otp/validate 接口)
            step(index, f"✅ 获取到验证码: {sms_code}，提交验证...")
            sms_headers["openai-sentinel-token"] = build_sentinel_token(self.session, self.device_id, "phone_verification_validate")
            verify_resp, _ = request_with_local_retry(self.session, "post", f"{auth_base}/api/accounts/phone-otp/validate", json={"code": sms_code}, headers=sms_headers)
            
            if verify_resp is None or verify_resp.status_code != 200:
                raise RuntimeError("手机验证码错误或被拒绝")
            
            self.sms_provider.set_status(order_id, 3) # 标记完成
            step(index, "🎉 手机号绑定成功！")

        # 💡 7. 引导至 Consent 授权页并捕获 Code
        step(index, "正在进入 Codex Consent 授权页...")
        consent_url = f"{auth_base}/sign-in-with-chatgpt/codex/consent"
        
        # 顺着重定向链路走到最后获取 Callback Code
        current_url = consent_url
        callback_params = None
        
        for _ in range(10):
            response = self.session.get(current_url, headers=navigate_headers, verify=False, timeout=30, allow_redirects=False)
            callback_params = extract_oauth_callback_params_from_url(str(response.url)) or extract_oauth_callback_params_from_url(str(response.headers.get("Location") or "").strip())
            if callback_params: 
                break
            
            location = str(response.headers.get("Location") or "").strip()
            if response.status_code not in (301, 302, 303, 307, 308) or not location: 
                break
            current_url = f"{auth_base}{location}" if location.startswith("/") else location

        if not callback_params or not callback_params.get("code"):
            raise RuntimeError("无法从 Consent 页面捕获到 Callback Code")
            
        code = callback_params.get("code")
        step(index, "✅ 成功捕获授权 Code，正在换取 RT...")

        # 8. 换取最终的 Access Token 和 Refresh Token
        token_resp = self.session.post(
            f"{auth_base}/oauth/token", 
            headers={"Content-Type": "application/x-www-form-urlencoded"}, 
            data={
                "grant_type": "authorization_code", 
                "code": code, 
                "redirect_uri": platform_oauth_redirect_uri, 
                "client_id": platform_oauth_client_id, 
                "code_verifier": code_verifier
            }, 
            verify=False, 
            timeout=60
        )
        
        token_data = _response_json(token_resp)
        if token_resp.status_code != 200 or not token_data.get("access_token"): 
            raise RuntimeError(f"换取 Token 失败: {token_resp.status_code} {token_resp.text}")

        step(index, "🎉 Codex RT 换取完成！")
        return {
            "email": email,
            "password": password,
            "access_token": str(token_data.get("access_token")),
            "refresh_token": str(token_data.get("refresh_token"))
        }