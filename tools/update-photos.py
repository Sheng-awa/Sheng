# -*- coding: utf-8 -*-
"""
相册图片管线：扫描 photo/ 根目录的照片，压缩重命名到 photo/web/，生成 photo/photos.json
用法：python tools/update-photos.py   （或双击项目根目录的「更新相册.bat」）

- 按修改时间排序，统一命名 p001.jpg / p002.jpg ...（重复跑结果一致）
- 长边 >1600 缩到 1600，JPEG 质量 82；gif 原样拷贝保留动图
- caption 默认从文件名清洗（hash 名 / IMG_xxx 类无意义名 -> 空），可手改 photos.json
- date 取文件修改时间；删掉的照片会同步从 web/ 和 json 移除
"""
import io
import json
import os
import re
import sys
import time

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "photo")
WEB = os.path.join(SRC, "web")
JSON_PATH = os.path.join(SRC, "photos.json")

IMG_EXTS = {".jpg", ".jpeg", ".png", ".webp"}
COPY_EXTS = {".gif"}          # 动图不压缩，原样拷贝
MAX_EDGE = 1600
QUALITY = 82


def clean_caption(name):
    """文件名 -> 默认 caption；无意义名返回空串"""
    stem = os.path.splitext(name)[0].strip()
    if re.fullmatch(r"[0-9a-fA-F]{20,}", stem):
        return ""
    if re.fullmatch(r"(?i)(img|pxl|screenshot|screen|mmexport|wx_camera|video)[_\-\s]?\d*", stem):
        return ""
    return stem


def main():
    if not os.path.isdir(SRC):
        print("photo/ 文件夹不存在")
        return 1
    os.makedirs(WEB, exist_ok=True)

    # 扫描根目录图片（web/ 子目录不算），按修改时间排序
    items = []
    for f in os.listdir(SRC):
        p = os.path.join(SRC, f)
        if not os.path.isfile(p):
            continue
        ext = os.path.splitext(f)[1].lower()
        if ext in IMG_EXTS or ext in COPY_EXTS:
            items.append((os.path.getmtime(p), f, p, ext))
    items.sort()

    photos = []
    used = set()
    for idx, (mtime, fname, path, ext) in enumerate(items, 1):
        base = "p%03d" % idx
        out_ext = ".gif" if ext in COPY_EXTS else ".jpg"
        out_name = base + out_ext
        out_path = os.path.join(WEB, out_name)

        if ext in COPY_EXTS:
            with open(path, "rb") as fi, open(out_path, "wb") as fo:
                fo.write(fi.read())
            im = Image.open(out_path)
            w, h = im.size
        else:
            im = Image.open(path)
            im = im.convert("RGB")
            w, h = im.size
            edge = max(w, h)
            if edge > MAX_EDGE:
                s = MAX_EDGE / edge
                im = im.resize((round(w * s), round(h * s)), Image.LANCZOS)
                w, h = im.size
            im.save(out_path, "JPEG", quality=QUALITY, optimize=True)

        used.add(out_name)
        photos.append({
            "file": "web/" + out_name,
            "caption": clean_caption(fname),
            "date": time.strftime("%Y.%m.%d", time.localtime(mtime)),
            "w": w,
            "h": h,
        })
        print("OK %-28s -> web/%s" % (fname, out_name))

    # 清掉 web/ 里已删除源照片的残留
    for f in os.listdir(WEB):
        if f not in used:
            os.remove(os.path.join(WEB, f))
            print("DEL web/%s（源照片已删）" % f)

    with open(JSON_PATH, "w", encoding="utf-8") as fo:
        json.dump(photos, fo, ensure_ascii=False, indent=2)
    print("\n共 %d 张照片，photos.json 已更新" % len(photos))
    print("提示：想改照片底下那句话，直接编辑 photo/photos.json 里的 caption 再 push")
    return 0


if __name__ == "__main__":
    sys.exit(main())
