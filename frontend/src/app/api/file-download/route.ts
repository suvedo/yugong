import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const file_id = searchParams.get('file_id');
  if (!file_id) {
    return NextResponse.json({ error: '缺少 file_id 参数' }, { status: 400 });
  }

  // 请求后端文件下载接口
  const backendRes = await fetch(`http://127.0.0.1:5001/agent-space/download_file/${file_id}`, {
    method: 'GET',
  });

  if (!backendRes.ok) {
    return NextResponse.json({ error: '文件下载失败' }, { status: 500 });
  }

  // 读取后端响应的 headers
  const contentType = backendRes.headers.get('content-type') || 'application/octet-stream';
  const contentDisposition = backendRes.headers.get('content-disposition') || '';

  // 返回文件流
  const fileBuffer = await backendRes.arrayBuffer();
  return new NextResponse(Buffer.from(fileBuffer), {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': contentDisposition,
    },
  });
}