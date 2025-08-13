import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const user_id = searchParams.get('user_id');
  if (!user_id) {
    return NextResponse.json({ error: '缺少 user_id 参数', ok: false });
  }

  // 请求后端文件下载接口
  const backendRes = await fetch(`http://127.0.0.1:5001/agent-space/get_chat_list/${user_id}`, {
    method: 'GET',
  });

  if (!backendRes.ok) {
    return NextResponse.json({ ok: false, error: '获取聊天列表失败' });
  }

  const data = await backendRes.json();
  return NextResponse.json({ ok: true, data: data });
}