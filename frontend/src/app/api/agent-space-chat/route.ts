import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    // 读取 multipart/form-data 文件
    const body = await req.json();

    // 转发请求到后端接口
    const response = await fetch('http://127.0.0.1:5001/agent-space/agent_space_chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (response.status === 200) {
      return NextResponse.json(data);
    } else {
      return NextResponse.json({ error: data.error || '服务出错，请稍后再试' }, { status: 500 });
    }
  } catch {
    return NextResponse.json({ error: '应答失败，请稍后再试' }, { status: 500 });
  }
}