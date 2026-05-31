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
from datetime import datetime
from urllib.parse import parse_qs, urlencode, urlparse
from typing import Any, Optional, Tuple, Dict

import requests
import urllib3
from curl_cffi import requests as curl_requests
from playwright.sync_api import sync_playwright
from playwright_stealth import Stealth

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# --- 全局常量配置 ---
auth_base = "https://auth.openai.com"
platform_base = "https://platform.openai.com"
platform_oauth_client_id = "app_EMoamEEZ73f0CkXaXp7hrann"
platform_oauth_redirect_uri = "http://localhost:1455/auth/callback" 
platform_oauth_audience = "https://api.openai.com/v1"
platform_auth0_client = "eyJuYW1lIjoiYXV0aDAtc3BhLWpzIiwidmVyc2lvbiI6IjEuMjEuMCJ9"

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36"
IMPERSONATE_TARGET = "chrome110"

def step(index: int, text: str):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] [Worker-{index}] {text}", file=sys.stderr, flush=True)

def _generate_pkce() -> Tuple[str, str]:
    c_verifier = base64.urlsafe_b64encode(secrets.token_bytes(64)).rstrip(b"=").decode("ascii")
    c_challenge = base64.urlsafe_b64encode(hashlib.sha256(c_verifier.encode("ascii")).digest()).rstrip(b"=").decode("ascii")
    return c_verifier, c_challenge

def _random_password(length: int = 16) -> str:
    chars = string.ascii_letters + string.digits + "!@#$%"
    value = list(secrets.choice(string.ascii_uppercase) + secrets.choice(string.ascii_lowercase) + secrets.choice(string.digits) + secrets.choice("!@#$%") + "".join(secrets.choice(chars) for _ in range(max(0, length - 4))))
    random.shuffle(value)
    return "".join(value)

def _random_name() -> Tuple[str, str]:
    return random.choice(["James", "Robert", "John", "Emma", "Olivia"]), random.choice(["Smith", "Johnson", "Williams", "Brown"])

class GrizzlySMSProvider:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.grizzlysms.com/stubs/handler_api.php"

    def get_balance(self) -> float:
        try:
            res = requests.get(self.base_url, params={"api_key": self.api_key, "action": "getBalance"}, timeout=10)
            if res.text.startswith("ACCESS_BALANCE"): return float(res.text.split(":")[1])
        except: pass
        return 0.0

    def get_number(self, service="dr", country="6") -> Tuple[str, str]:
        res = requests.get(self.base_url, params={"api_key": self.api_key, "action": "getNumber", "service": service, "country": country}, timeout=15)
        if res.text.startswith("ACCESS_NUMBER"):
            _, order_id, number = res.text.split(":")
            return order_id, number
        raise RuntimeError(f"GrizzlySMS 购买失败: {res.text}")

    def wait_for_sms(self, order_id: str, timeout=180) -> Optional[str]:
        start = time.time()
        while time.time() - start < timeout:
            try:
                res = requests.get(self.base_url, params={"api_key": self.api_key, "action": "getStatus", "id": order_id}, timeout=10)
                if res.text.startswith("STATUS_OK"): return res.text.split(":")[1]
                elif "STATUS_CANCEL" in res.text: return None
            except: pass
            time.sleep(5)
        return None

    def set_status(self, order_id: str, status: int):
        try: requests.get(self.base_url, params={"api_key": self.api_key, "action": "setStatus", "status": status, "id": order_id}, timeout=10)
        except: pass

class SentinelTokenGenerator:
    def __init__(self, device_id: str):
        self.sid = str(uuid.uuid4())

    def generate_requirements_token(self) -> str:
        data = ["1920x1080", time.strftime("%a %b %d %Y %H:%M:%S GMT+0000"), 4294705152, 1, USER_AGENT, "https://sentinel.openai.com/sentinel/sdk.js", None, None, "en-US", round(random.uniform(5, 50)), "plugins-undefined", "location", "Object", random.uniform(1000, 50000), self.sid, "", 8, random.uniform(100, 500)]
        payload = base64.b64encode(json.dumps(data, separators=(",", ":"), ensure_ascii=False).encode("utf-8")).decode("ascii")
        return "gAAAAAC" + payload

def extract_oauth_callback_params_from_url(url: str) -> Optional[Dict[str, str]]:
    if not url: return None
    try: params = parse_qs(urlparse(url).query)
    except: return None
    code = str((params.get("code") or [""])[0]).strip()
    if not code: return None
    return {"code": code}

class PlatformRegistrar:
    def __init__(self, proxy: str = "", email: str = "", grizzly_key: str = "", country: str = "6", **kwargs):
        self.proxy = proxy
        self.email = email
        self.country = country
        self.device_id = str(uuid.uuid4())
        self.sms_provider = GrizzlySMSProvider(grizzly_key) if grizzly_key else None
        
        self.session = curl_requests.Session(impersonate=IMPERSONATE_TARGET)
        if self.proxy:
            self.session.proxies = {"http": self.proxy, "https": self.proxy}

    def _get_ipc_otp(self) -> str:
        while True:
            print("WAITING_FOR_OTP", flush=True)
            code = sys.stdin.readline().strip()
            if not code: raise RuntimeError("失去与 Node.js 的连接")
            return code

    def _build_sentinel_token(self, flow: str) -> str:
        gen = SentinelTokenGenerator(self.device_id)
        try:
            resp = self.session.post("https://sentinel.openai.com/backend-api/sentinel/req", json={"p": gen.generate_requirements_token(), "id": self.device_id, "flow": flow}, headers={"User-Agent": USER_AGENT}, verify=False)
            token = resp.json().get("token", "")
            return json.dumps({"p": gen.generate_requirements_token(), "t": "", "c": token, "id": self.device_id, "flow": flow}, separators=(",", ":"))
        except:
            return ""

    def get_white_account_via_browser(self, index: int, email: str, password: str, proxy: str):
        step(index, "🌟 [阶段一] 启动无头浏览器，突破 Cloudflare JS 挑战 (防 409 报错)...")
        proxy_config = {"server": proxy} if proxy else None
        
        with Stealth().use_sync(sync_playwright()) as p:
            browser = p.chromium.launch(headless=True, proxy=proxy_config, args=['--disable-blink-features=AutomationControlled'])
            context = browser.new_context(user_agent=USER_AGENT, viewport={"width": 1920, "height": 1080})
            page = context.new_page()

            try:
                page.goto("https://auth.openai.com/signup", wait_until="domcontentloaded", timeout=60000)
                
                # 1. 填邮箱
                page.wait_for_selector('input[type="email"], input[name="email"]', state="visible", timeout=60000)
                page.fill('input[type="email"], input[name="email"]', email)
                page.click('button[type="submit"], button[name="submit"]')
                page.wait_for_timeout(3000)

                # 2. 填密码
                page.wait_for_selector('input[type="password"]', state="visible", timeout=30000)
                page.fill('input[type="password"]', password)
                page.click('button[type="submit"]')
                
                # 3. 邮箱验证码
                step(index, "等待浏览器进入验证码输入页...")
                page.wait_for_selector('input[inputmode="numeric"], .code-input', timeout=40000)
                
                while True:
                    code = self._get_ipc_otp()
                    if code == "RESEND":
                        step(index, "⚠️ 触发重发机制，在浏览器点击重发验证码...")
                        try:
                            page.get_by_text("Resend", exact=False).click(timeout=5000)
                        except: pass
                        continue
                    break

                step(index, f"在浏览器中填入验证码: {code}")
                page.locator('input[inputmode="numeric"]').first.click()
                page.keyboard.type(code)
                
                # 4. 填写姓名生日
                page.wait_for_selector('input[name="firstName"]', timeout=30000)
                fn, ln = _random_name()
                page.fill('input[name="firstName"]', fn)
                page.fill('input[name="lastName"]', ln)
                page.fill('input[name="birthday"]', "05/15/1998") 
                page.click('button[type="submit"]')
                
                # 5. 等待注册完成并提取 Cookie
                step(index, "等待后台处理注册...")
                page.wait_for_timeout(8000)
                
                cookies = context.cookies()
                auth_session = next((c['value'] for c in cookies if c['name'] == 'oai-client-auth-session'), None)
                oai_did = next((c['value'] for c in cookies if c['name'] == 'oai-did'), self.device_id)
                
                browser.close()
                
                if not auth_session:
                    raise RuntimeError("浏览器注册失败，未能拿到风控免死金牌 oai-client-auth-session Cookie。可能 IP 被硬封锁。")
                
                return auth_session, oai_did

            except Exception as e:
                browser.close()
                raise RuntimeError(f"浏览器自动化失败: {str(e)}")

    def register(self, index: int) -> dict:
        email = self.email
        password = _random_password()

        # 核心：用浏览器打头阵拿 Cookie
        auth_session, browser_did = self.get_white_account_via_browser(index, email, password, self.proxy)
        self.device_id = browser_did
        
        step(index, "✅ [阶段一完成] 已拿到合法 Cookie，规避 409，关闭浏览器！")
        step(index, "🚀 [阶段二] 切换回协议极速发包模式...")

        self.session.cookies.set("oai-client-auth-session", auth_session, domain=".auth.openai.com")
        self.session.cookies.set("oai-did", self.device_id, domain=".auth.openai.com")

        api_headers = {
            "accept": "application/json", "user-agent": USER_AGENT, "content-type": "application/json",
            "oai-device-id": self.device_id, "origin": auth_base
        }

        # 接码绑定手机
        if self.sms_provider:
            balance = self.sms_provider.get_balance()
            step(index, f"💰 GrizzlySMS 余额: {balance} 卢布，开始获取号码...")
            
            order_id, phone_number = self.sms_provider.get_number(country=self.country)
            step(index, f"✅ 号码: {phone_number}")

            api_headers["openai-sentinel-token"] = self._build_sentinel_token("phone_verification_send")
            phone_payload = {"phone_number": f"+{phone_number.lstrip('+')}", "channel": "sms"}
            
            resp = self.session.post(f"{auth_base}/api/accounts/add-phone/send", json=phone_payload, headers=api_headers, timeout=20)
            if resp.status_code != 200:
                self.sms_provider.set_status(order_id, 8)
                raise RuntimeError(f"🚨 OpenAI 拒发短信 (HTTP {resp.status_code}): {resp.text}")

            step(index, "⏳ 等待短信...")
            sms_code = self.sms_provider.wait_for_sms(order_id)
            if not sms_code:
                self.sms_provider.set_status(order_id, 8) 
                raise RuntimeError("短信超时，已自动退款")

            api_headers["openai-sentinel-token"] = self._build_sentinel_token("phone_verification_validate")
            v_resp = self.session.post(f"{auth_base}/api/accounts/phone-otp/validate", json={"code": sms_code}, headers=api_headers, timeout=20)
            if v_resp.status_code != 200:
                self.sms_provider.set_status(order_id, 8)
                raise RuntimeError(f"🚨 验证码错误: {v_resp.text}")
            
            self.sms_provider.set_status(order_id, 3)
            step(index, "🎉 手机风控绑定成功！")

        # 获取 Codex 授权
        step(index, "换取 Codex Refresh Token...")
        c_verifier, c_challenge = _generate_pkce()
        auth_params = {
            "client_id": platform_oauth_client_id, "audience": platform_oauth_audience,
            "redirect_uri": platform_oauth_redirect_uri, "device_id": self.device_id,
            "screen_hint": "login_or_signup", "max_age": "0", "login_hint": email,
            "scope": "openid profile email offline_access", "response_type": "code",
            "state": secrets.token_urlsafe(32), "nonce": secrets.token_urlsafe(32),
            "code_challenge": c_challenge, "code_challenge_method": "S256",
            "codex_cli_simplified_flow": "true"
        }
        
        nav_headers = {"accept": "text/html,application/xhtml+xml,application/xml", "user-agent": USER_AGENT}
        res = self.session.get(f"{auth_base}/oauth/authorize?{urlencode(auth_params)}", headers=nav_headers, allow_redirects=True, timeout=30)
        
        cb_params = None
        current_url = f"{auth_base}/sign-in-with-chatgpt/codex/consent"
        for _ in range(5):
            r = self.session.get(current_url, headers=nav_headers, allow_redirects=False, verify=False)
            cb_params = extract_oauth_callback_params_from_url(str(r.url)) or extract_oauth_callback_params_from_url(r.headers.get("Location", ""))
            if cb_params: break
            loc = r.headers.get("Location", "")
            if not loc: break
            current_url = f"{auth_base}{loc}" if loc.startswith("/") else loc

        if not cb_params or not cb_params.get("code"):
            raise RuntimeError("Consent 授权跳转失败，未能捕获 Code")

        token_resp = self.session.post(f"{auth_base}/oauth/token", data={"grant_type": "authorization_code", "code": cb_params["code"], "redirect_uri": platform_oauth_redirect_uri, "client_id": platform_oauth_client_id, "code_verifier": c_verifier}, headers={"Content-Type": "application/x-www-form-urlencoded"}, verify=False)
        
        token_data = token_resp.json() if token_resp.status_code == 200 else {}
        if not token_data.get("access_token"): 
            raise RuntimeError(f"RT 换取失败: {token_resp.text}")

        step(index, "🏆 任务彻底成功！")
        return {"email": email, "password": password, "access_token": token_data["access_token"], "refresh_token": token_data["refresh_token"]}

def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--proxy', type=str, default="")
    parser.add_argument('--email', type=str, required=True)
    parser.add_argument('--grizzly_key', type=str, default="")
    parser.add_argument('--country', type=str, default="6")
    args, unknown = parser.parse_known_args() # 拦截一切未知参数

    try:
        registrar = PlatformRegistrar(proxy=args.proxy, email=args.email, grizzly_key=args.grizzly_key, country=args.country)
        result = registrar.register(index=1) 
        print(json.dumps({"status": "success", "data": result}))
        sys.exit(0)
    except Exception as e:
        print(json.dumps({"status": "error", "message": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()