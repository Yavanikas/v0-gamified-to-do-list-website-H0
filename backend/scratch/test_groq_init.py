import httpx

# Patches for httpx Client & AsyncClient to bridge httpx 0.28.x and groq 0.9.0
orig_client_init = httpx.Client.__init__
def patched_client_init(self, *args, **kwargs):
    if "proxies" in kwargs:
        proxies = kwargs.pop("proxies")
        if "proxy" not in kwargs:
            if isinstance(proxies, dict):
                kwargs["proxy"] = proxies.get("http://") or proxies.get("https://") or next(iter(proxies.values()), None)
            else:
                kwargs["proxy"] = proxies
    orig_client_init(self, *args, **kwargs)
httpx.Client.__init__ = patched_client_init

orig_async_client_init = httpx.AsyncClient.__init__
def patched_async_client_init(self, *args, **kwargs):
    if "proxies" in kwargs:
        proxies = kwargs.pop("proxies")
        if "proxy" not in kwargs:
            if isinstance(proxies, dict):
                kwargs["proxy"] = proxies.get("http://") or proxies.get("https://") or next(iter(proxies.values()), None)
            else:
                kwargs["proxy"] = proxies
    orig_async_client_init(self, *args, **kwargs)
httpx.AsyncClient.__init__ = patched_async_client_init


from groq import Groq
import os

try:
    print("Trying to initialize Groq...")
    client = Groq(api_key="gsk_test")
    print("Groq initialized successfully!")
except Exception as e:
    print("Failed to initialize Groq:", e)
