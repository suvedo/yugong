import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    // 读取 multipart/form-data 文件
    const body = await req.json();

    // 转发请求到后端接口
    const response = await fetch('http://127.0.0.1:5001/agent-space-auth/send_code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (response.status === 200) {
      return NextResponse.json(data);
    } else {
      return NextResponse.json({}, { status: 500 });
    }
  } catch {
    return NextResponse.json({}, { status: 500 });
  }
}