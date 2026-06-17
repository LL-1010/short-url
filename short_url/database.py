from sqlalchemy import create_engine, Column, String, Integer
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# 创建 SQLite 数据库连接（文件会自动生成）
engine = create_engine("sqlite:///short_url.db", connect_args={"check_same_thread": False})

# 创建基类
Base = declarative_base()


# 定义数据模型（对应数据库中的表）
class URL(Base):
    __tablename__ = "urls"

    id = Column(Integer, primary_key=True, index=True)
    short_code = Column(String(10), unique=True, index=True)
    long_url = Column(String(500))


# 创建数据库表
Base.metadata.create_all(bind=engine)

# 创建数据库会话
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)