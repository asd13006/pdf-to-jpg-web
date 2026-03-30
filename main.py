from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import HTMLResponse, StreamingResponse
import pypdfium2 as pdfium
import io
import zipfile
import os

app = FastAPI()

# 1. 讀取並顯示靚靚網頁介面
@app.get("/", response_class=HTMLResponse)
async def read_root():
    with open("index.html", "r", encoding="utf-8") as f:
        return f.read()

# 2. 接收 PDF 並轉換嘅 API 接口
@app.post("/api/convert")
async def convert_pdf(
    file: UploadFile = File(...),
    quality: float = Form(2.0),
    format: str = Form("jpg")
):
    # 讀取用戶上傳嘅 PDF
    pdf_bytes = await file.read()
    doc = pdfium.PdfDocument(pdf_bytes)
    
    # 開啟一個記憶體中嘅 Zip 檔案
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        base_filename = file.filename.replace(".pdf", "")
        
        # 逐頁轉換
        for i in range(len(doc)):
            page = doc[i]
            bitmap = page.render(scale=quality)
            pil_image = bitmap.to_pil()
            
            img_buffer = io.BytesIO()
            if format.lower() == "jpg":
                pil_image = pil_image.convert("RGB")
                pil_image.save(img_buffer, format="JPEG", quality=95)
                ext = "jpg"
            else:
                pil_image.save(img_buffer, format="PNG")
                ext = "png"
                
            # 將圖片塞入 Zip 檔
            zip_file.writestr(f"{base_filename}_page_{i+1}.{ext}", img_buffer.getvalue())
            
    doc.close()
    zip_buffer.seek(0)
    
    # 將 Zip 檔傳回畀用戶下載
    headers = {"Content-Disposition": f'attachment; filename="{base_filename}_converted.zip"'}
    return StreamingResponse(zip_buffer, media_type="application/zip", headers=headers)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)