from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
import hashlib
import redis
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List
from pydantic import BaseModel

# ========== 1. 创建 app ==========
app = FastAPI()

# ========== 2. 添加 CORS ==========
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],  # 确保有 5174
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ========== 3. 导入数据库 ==========
from database import SessionLocal, URL

# ========== 4. 连接 Redis ==========
redis_client = redis.Redis(
    host='localhost',
    port=6379,
    db=0,
    decode_responses=True
)

# ========== 5. 依赖函数 ==========
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ========== 6. 请求体格式 ==========
class BatchShortenRequest(BaseModel):
    urls: List[str]

# ========== 7. 辅助函数 ==========
def generate_short_code(long_url: str) -> str:
    md5_hash = hashlib.md5(long_url.encode()).hexdigest()
    return md5_hash[:6]

def process_single_url(long_url: str):
    """处理单个链接（每个线程独立数据库会话）"""
    db = SessionLocal()
    try:
        short_code = generate_short_code(long_url)

        existing = db.query(URL).filter(URL.short_code == short_code).first()
        if existing:
            return {
                "long_url": long_url,
                "short_url": f"http://localhost:8000/{existing.short_code}",
                "status": "exists"
            }

        new_url = URL(short_code=short_code, long_url=long_url)
        db.add(new_url)
        db.commit()

        redis_client.setex(f"short:{short_code}", 3600, long_url)

        return {
            "long_url": long_url,
            "short_url": f"http://localhost:8000/{short_code}",
            "status": "created"
        }
    except Exception as e:
        db.rollback()
        return {
            "long_url": long_url,
            "error": str(e),
            "status": "failed"
        }
    finally:
        db.close()

# ========== 8. API 接口 ==========

@app.get("/")
def root():
    return {"message": "短链接服务已启动（Redis缓存 + 多线程批量生成）"}

@app.post("/shorten")
def shorten_url(long_url: str, db: Session = Depends(get_db)):
    short_code = generate_short_code(long_url)

    existing_url = db.query(URL).filter(URL.short_code == short_code).first()
    if existing_url:
        short_url = f"http://localhost:8000/{existing_url.short_code}"
        return {"short_url": short_url, "short_code": existing_url.short_code}

    new_url = URL(short_code=short_code, long_url=long_url)
    db.add(new_url)
    db.commit()

    redis_client.setex(f"short:{short_code}", 3600, long_url)

    short_url = f"http://localhost:8000/{short_code}"
    return {"short_url": short_url, "short_code": short_code}

@app.get("/{short_code}")
def redirect_to_long(short_code: str, db: Session = Depends(get_db)):
    cached_long_url = redis_client.get(f"short:{short_code}")

    if cached_long_url:
        print(f"✅ 缓存命中！短码 {short_code} 从Redis读取")
        return RedirectResponse(url=cached_long_url, status_code=302)

    print(f"❌ 缓存未命中！短码 {short_code} 查询数据库")
    url_record = db.query(URL).filter(URL.short_code == short_code).first()

    if not url_record:
        raise HTTPException(status_code=404, detail="短链接不存在")

    redis_client.setex(f"short:{short_code}", 3600, url_record.long_url)

    return RedirectResponse(url=url_record.long_url, status_code=302)

@app.get("/cache/{short_code}")
def check_cache(short_code: str):
    cached = redis_client.get(f"short:{short_code}")
    if cached:
        return {"cached": True, "long_url": cached}
    return {"cached": False, "message": "缓存不存在或已过期"}

@app.post("/batch_shorten")
async def batch_shorten(request: BatchShortenRequest):
    """批量生成短链接（多线程，每个线程独立数据库会话）"""
    urls = request.urls

    if not urls:
        raise HTTPException(status_code=400, detail="请提供至少一个网址")

    if len(urls) > 100:
        raise HTTPException(status_code=400, detail="一次最多处理100个网址")

    results = []
    with ThreadPoolExecutor(max_workers=10) as thread_executor:
        futures = {
            thread_executor.submit(process_single_url, url): url
            for url in urls
        }

        for future in as_completed(futures):
            result = future.result()
            results.append(result)

    return {
        "total": len(urls),
        "success": len([r for r in results if r["status"] in ["created", "exists"]]),
        "failed": len([r for r in results if r["status"] == "failed"]),
        "results": results
    }

@app.post("/batch_shorten_single")
async def batch_shorten_single(request: BatchShortenRequest, db: Session = Depends(get_db)):
    """单线程版本（用于对比）"""
    urls = request.urls
    results = []

    for url in urls:
        try:
            short_code = generate_short_code(url)
            existing = db.query(URL).filter(URL.short_code == short_code).first()
            if existing:
                results.append({
                    "long_url": url,
                    "short_url": f"http://localhost:8000/{existing.short_code}",
                    "status": "exists"
                })
            else:
                new_url = URL(short_code=short_code, long_url=url)
                db.add(new_url)
                db.commit()
                results.append({
                    "long_url": url,
                    "short_url": f"http://localhost:8000/{short_code}",
                    "status": "created"
                })
        except Exception as e:
            results.append({
                "long_url": url,
                "error": str(e),
                "status": "failed"
            })

    return {
        "total": len(urls),
        "success": len([r for r in results if r["status"] in ["created", "exists"]]),
        "failed": len([r for r in results if r["status"] == "failed"]),
        "results": results
    }