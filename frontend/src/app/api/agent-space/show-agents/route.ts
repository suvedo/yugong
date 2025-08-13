import { NextResponse } from 'next/server';

// 重试函数
async function fetchWithRetry(url: string, options: RequestInit, maxRetries: number = 3): Promise<Response> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      
      // 如果请求成功，直接返回
      if (response.ok) {
        return response;
      }
      
      // 如果是最后一次尝试，返回失败的response
      if (i === maxRetries - 1) {
        return response;
      }
      
      // 等待一段时间再重试（递增延迟）
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      
    } catch (error) {
      lastError = error as Error;
      
      // 如果是最后一次尝试，抛出错误
      if (i === maxRetries - 1) {
        throw lastError;
      }
      
      // 等待一段时间再重试（递增延迟）
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  
  throw lastError!;
}

export async function GET(request: Request) {
  try {
    // 读取查询参数 user_id 并透传给后端
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id') ?? undefined;

    const backendUrl = new URL('http://127.0.0.1:5001/agent-space/show_agents');
    if (userId) backendUrl.searchParams.set('user_id', userId);

    // 使用重试机制发送请求
    const response = await fetchWithRetry(backendUrl.toString(), {
      method: 'GET',
    }, 3);

    // 检查后端返回的状态码
    if (!response.ok) {
      return NextResponse.json({text: "获取agent列表失败，请刷新试试"}, { status: 500 });
    } else {
      const data = await response.json();
      return NextResponse.json(data, { status: 200 });
    }
    
  } catch {
    return NextResponse.json({ text: '服务器内部错误' }, { status: 500 });
  }
}