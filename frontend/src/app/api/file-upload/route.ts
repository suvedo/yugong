import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    // 读取 multipart/form-data 文件
    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: '未选择文件' }, { status: 400 });
    }

    // 构造后端 form-data
    const backendForm = new FormData();
    backendForm.append('file', file);

    // 转发到后端接口
    const response = await fetch('http://127.0.0.1:5001/agent-space/upload_file', {
      method: 'POST',
      body: backendForm,
    });

    const data = await response.json();
    if (response.status === 200 && data.file_id) {
      return NextResponse.json({ file_id: data.file_id });
    } else {
      return NextResponse.json({ error: data.error || '上传失败' }, { status: 500 });
    }
  } catch {
    return NextResponse.json({ error: '服务端异常' }, { status: 500 });
  }
}